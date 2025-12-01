// app/courses/[courseId]/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { 
  doc, 
  getDoc, 
  serverTimestamp, 
  collection, 
  writeBatch 
} from 'firebase/firestore';
import { db } from '@/firebase/config';
import useAuth from '@/hooks/useAuth';
import { useParams, useRouter } from 'next/navigation';
import BackButton from '@/components/BackButton'; // Import the BackButton component

// Interface for the course data
interface Course { 
  title: string; 
  description: string; 
  tags: string[]; 
  imageUrl?: string;
  instructorIds?: string[]; // Optional in interface, but required for logic below
}

// Type for the enrollment status from the subcollection
type EnrollmentStatus = 'unenrolled' | 'pending' | 'enrolled' | 'rejected';

export default function CourseDetailPage() {
  const { user } = useAuth();
  const params = useParams();
  const router = useRouter();
  const courseId = params.courseId as string;

  const [course, setCourse] = useState<Course | null>(null);
  const [enrollmentStatus, setEnrollmentStatus] = useState<EnrollmentStatus>('unenrolled');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // --- 1. Fetch Data Effect ---
  useEffect(() => {
    if (!courseId) return;

    const fetchCourseAndEnrollmentStatus = async () => {
      try {
        // Fetch course details
        const courseDocRef = doc(db, 'courses', courseId);
        const courseDocSnap = await getDoc(courseDocRef);
        if (!courseDocSnap.exists()) {
          setError('Course not found.');
          return;
        }
        setCourse(courseDocSnap.data() as Course);

        // If user is logged in, check their enrollment request status
        if (user) {
          const requestDocRef = doc(db, 'courses', courseId, 'enrollmentRequests', user.uid);
          const requestDocSnap = await getDoc(requestDocRef);
          
          if (requestDocSnap.exists()) {
            setEnrollmentStatus(requestDocSnap.data().status as EnrollmentStatus);
          } else {
            setEnrollmentStatus('unenrolled');
          }
        }
      } catch (err) {
        console.error(err);
        setError('Failed to load course details.');
      } finally {
        setLoading(false);
      }
    };

    fetchCourseAndEnrollmentStatus();
  }, [courseId, user]);

  // --- 2. Handle Enrollment (Merged Logic) ---
  const handleEnroll = async () => {
    // Basic checks
    if (!user) {
      router.push('/login');
      return;
    }
    if (!course) return;

    // Check for instructors to notify
    const instructorIds = course.instructorIds;
    if (!instructorIds || instructorIds.length === 0) {
        console.error("This course has no instructors to notify.");
        setError("Cannot enroll: No instructor assigned to this course.");
        return;
    }

    try {
      // Use a batch to perform all writes together (Request + Notifications)
      const batch = writeBatch(db);

      // A. Create the enrollment request for the student
      const requestDocRef = doc(db, 'courses', courseId, 'enrollmentRequests', user.uid);
      batch.set(requestDocRef, {
        status: 'pending',
        requestedAt: serverTimestamp(),
        studentEmail: user.email,
        studentId: user.uid,
        courseId: courseId, 
      }, { merge: true });

      // B. Create a notification for EACH instructor
      instructorIds.forEach((instructorId) => {
          const notificationRef = doc(collection(db, 'users', instructorId, 'notifications'));
          batch.set(notificationRef, {
              message: `${user.email} has requested to enroll in your course: ${course.title}`,
              courseId: courseId,
              type: 'enrollment_request', // Helps UI link to the manage page
              createdAt: serverTimestamp(),
              isRead: false
          });
      });
      
      // Commit all changes atomically
      await batch.commit();
      
      setEnrollmentStatus('pending'); // Optimistically update UI
    } catch (error) {
      console.error("Failed to submit enrollment request:", error);
      setError('Failed to submit enrollment request. Please try again.');
    }
  };
  
  // --- 3. Helper for Button State ---
  const getButtonState = () => {
    switch (enrollmentStatus) {
      case 'enrolled':
        return { text: '✓ Enrolled', disabled: true, className: 'bg-gray-400 cursor-not-allowed' };
      case 'pending':
        return { text: 'Enrollment Pending', disabled: true, className: 'bg-yellow-500 cursor-not-allowed' };
      case 'rejected':
        return { text: 'Enrollment Denied', disabled: true, className: 'bg-red-500 cursor-not-allowed' };
      default:
        return { text: 'Enroll', disabled: false, onClick: handleEnroll, className: 'bg-green-600 hover:bg-green-700' };
    }
  };

  const buttonState = getButtonState();

  if (loading) return <p className="text-center mt-10">Loading Course...</p>;
  if (error) return <p className="text-center mt-10 text-red-500">{error}</p>;
  if (!course) return <p className="text-center mt-10">This course does not exist.</p>;

  // --- 4. Render UI ---
  return (
    <div className="max-w-4xl mx-auto py-8"> {/* Added vertical padding */}
      <BackButton /> {/* Integrate the BackButton here */}
      <div className="bg-white shadow-lg rounded-lg p-8">
        <div className="flex flex-wrap gap-2 mb-4">
          {course.tags.map(tag => (
            <span 
              key={tag} 
              className="px-3 py-1 text-sm font-semibold text-indigo-800 bg-indigo-100 rounded-full"
            >
              {tag}
            </span>
          ))}
        </div>

        <h1 className="text-4xl font-bold mb-4">{course.title}</h1>
        <p className="text-gray-600 text-lg whitespace-pre-wrap">{course.description}</p>
        
        <div className="mt-8">
          {user ? (
            <button 
              onClick={buttonState.onClick} 
              disabled={buttonState.disabled}
              className={`w-full px-6 py-3 font-bold text-white rounded-lg ${buttonState.className}`}
            >
              {buttonState.text}
            </button>
          ) : (
            <button 
              onClick={() => router.push('/login')} 
              className="w-full px-6 py-3 font-bold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
            >
              Login to Enroll
            </button>
          )}
        </div>
      </div>
    </div>
  );
}