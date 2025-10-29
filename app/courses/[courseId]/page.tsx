// app/courses/[courseId]/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../firebase/config'; // Adjust path
import useAuth from '../../../hooks/useAuth'; // Adjust path
import { useParams, useRouter } from 'next/navigation';

// Interface for the course data
interface Course { 
  title: string; 
  description: string; 
  tags: string[]; 
  imageUrl?: string; 
}
// Type for the enrollment status from the subcollection
type EnrollmentStatus = 'unenrolled' | 'pending' | 'enrolled' | 'rejected';

export default function CourseDetailPage() {
  const { user } = useAuth();
  const params = useParams();
  const router = useRouter();
  const courseId = params.courseId as string;

  const [course, setCourse] = useState<Course | null>(null);
  // Replaced userProfile state with enrollmentStatus state
  const [enrollmentStatus, setEnrollmentStatus] = useState<EnrollmentStatus>('unenrolled');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null); // Kept error state

  useEffect(() => {
    if (!courseId) return;

    const fetchCourseAndEnrollmentStatus = async () => {
      try {
        // 1. Fetch course details
        const courseDocRef = doc(db, 'courses', courseId);
        const courseDocSnap = await getDoc(courseDocRef);
        if (!courseDocSnap.exists()) {
          setError('Course not found.');
          return;
        }
        setCourse(courseDocSnap.data() as Course);

        // 2. If user is logged in, check their enrollment request status
        if (user) {
          const requestDocRef = doc(db, 'courses', courseId, 'enrollmentRequests', user.uid);
          const requestDocSnap = await getDoc(requestDocRef);
          
          // If a request document exists, set the status
          if (requestDocSnap.exists()) {
            setEnrollmentStatus(requestDocSnap.data().status as EnrollmentStatus);
          } else {
            // Otherwise, it's explicitly 'unenrolled'
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

  /**
   * Submits a new 'pending' enrollment request to the course's subcollection.
   */
  const handleEnroll = async () => {
    if (!user) {
      router.push('/login'); // Redirect to login if not authenticated
      return;
    }
    
    // Reference to the student's enrollment request document
    const requestDocRef = doc(db, 'courses', courseId, 'enrollmentRequests', user.uid);

    try {
      // Use setDoc (or updateDoc/setDoc with merge: true) to create/update the request
      await setDoc(requestDocRef, {
        status: 'pending',
        requestedAt: serverTimestamp(),
        studentEmail: user.email,
      });
      
      setEnrollmentStatus('pending'); // Optimistically update UI
    } catch (error) {
      console.error("Failed to submit enrollment request:", error);
      setError('Failed to submit enrollment request.');
    }
  };
  
  /**
   * Determines the button text and state based on the current enrollment status.
   */
  const getButtonState = () => {
    switch (enrollmentStatus) {
      case 'enrolled':
        return { text: '✓ Enrolled', disabled: true, className: 'bg-gray-400 cursor-not-allowed' };
      case 'pending':
        return { text: 'Enrollment Pending', disabled: true, className: 'bg-yellow-500 cursor-not-allowed' };
      case 'rejected':
        // A rejected user might be allowed to re-request enrollment, depending on business rules.
        // For simplicity, we'll keep it disabled and show the status.
        return { text: 'Enrollment Denied', disabled: true, className: 'bg-red-500 cursor-not-allowed' };
      default: // 'unenrolled'
        // Changed from 'Request to Enroll' to 'Enroll'
        return { text: 'Enroll', disabled: false, onClick: handleEnroll, className: 'bg-green-600 hover:bg-green-700' };
    }
  };

  const buttonState = getButtonState();

  if (loading) return <p className="text-center mt-10">Loading Course...</p>;
  if (error) return <p className="text-center mt-10 text-red-500">{error}</p>;
  if (!course) return <p className="text-center mt-10">This course does not exist.</p>;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white shadow-lg rounded-lg p-8">
        <div className="flex flex-wrap gap-2 mb-4">
          {course.tags.map(tag => (
            <span key={tag} className="px-3 py-1 text-sm font-semibold text-indigo-800 bg-indigo-100 rounded-full">{tag}</span>
          ))}
        </div>
        <h1 className="text-4xl font-bold mb-4">{course.title}</h1>
        <p className="text-gray-600 text-lg whitespace-pre-wrap">{course.description}</p>
        
        <div className="mt-8">
          {user ? (
            <button 
              onClick={buttonState.onClick} 
              disabled={buttonState.disabled}
              className={`w-full px-6 py-3 font-bold text-white rounded-lg ${buttonState.className}`}>
              {buttonState.text}
            </button>
          ) : (
            <button onClick={() => router.push('/login')} className="w-full px-6 py-3 font-bold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700">
              Login to Enroll
            </button>
          )}
        </div>
      </div>
    </div>
  );
}