// app/courses/[courseId]/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { doc, getDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '../../../firebase/config'; // Adjust path
import useAuth from '../../../hooks/useAuth'; // Adjust path
import { useParams, useRouter } from 'next/navigation';

interface Course {
  title: string;
  description: string;
  tags: string[];
}
interface UserProfile {
    enrolledCourses: string[];
}

export default function CourseDetailPage() {
  const { user } = useAuth();
  const params = useParams();
  const router = useRouter();
  const courseId = params.courseId as string;

  const [course, setCourse] = useState<Course | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!courseId) return;

    const fetchCourseAndUserData = async () => {
      try {
        // Fetch course details
        const courseDocRef = doc(db, 'courses', courseId);
        const courseDocSnap = await getDoc(courseDocRef);
        if (!courseDocSnap.exists()) {
          setError('Course not found.');
          return;
        }
        setCourse(courseDocSnap.data() as Course);

        // If user is logged in, fetch their data to check enrollment status
        if (user) {
          const userDocRef = doc(db, 'users', user.uid);
          const userDocSnap = await getDoc(userDocRef);
          if (userDocSnap.exists()) {
            setUserProfile(userDocSnap.data() as UserProfile);
          }
        }
      } catch (err) {
        console.error(err);
        setError('Failed to load course details.');
      } finally {
        setLoading(false);
      }
    };

    fetchCourseAndUserData();
  }, [courseId, user]);

  const handleEnroll = async () => {
    if (!user || !userProfile) {
      router.push('/login'); // Redirect to login if not authenticated
      return;
    }

    try {
      const userDocRef = doc(db, 'users', user.uid);
      // arrayUnion atomically adds an element to an array if it doesn't exist yet
      await updateDoc(userDocRef, {
        enrolledCourses: arrayUnion(courseId)
      });
      // Optimistically update the UI to show enrollment
      setUserProfile({ ...userProfile, enrolledCourses: [...userProfile.enrolledCourses, courseId] });
    } catch (err) {
      console.error(err);
      setError('Failed to enroll in the course.');
    }
  };
  
  const isEnrolled = userProfile?.enrolledCourses?.includes(courseId);

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
            <button onClick={handleEnroll} disabled={isEnrolled}
              className={`w-full px-6 py-3 font-bold text-white rounded-lg ${isEnrolled ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'}`}>
              {isEnrolled ? '✓ Enrolled' : 'Enroll Now'}
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