// app/dashboard/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import useAuth from '../../hooks/useAuth';
import { db } from '../../firebase/config';
import Link from 'next/link';

interface UserProfile {
  email: string;
  role: 'student' | 'educator' | 'admin';
  enrolledCourses?: string[];
}
interface Course {
  id: string;
  title: string;
}

export default function Dashboard() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [enrolledCourses, setEnrolledCourses] = useState<Course[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/login');
      } else {
        const fetchUserProfile = async () => {
          try {
            const userDocRef = doc(db, 'users', user.uid);
            const userDocSnap = await getDoc(userDocRef);

            if (userDocSnap.exists()) {
              const profileData = userDocSnap.data() as UserProfile;
              setUserProfile(profileData);

              // If the user is a student and has enrolled courses, fetch them
              if (profileData.role === 'student' && profileData.enrolledCourses && profileData.enrolledCourses.length > 0) {
                const coursesQuery = query(collection(db, 'courses'), where('__name__', 'in', profileData.enrolledCourses));
                const courseDocsSnap = await getDocs(coursesQuery);
                const coursesList = courseDocsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Course[];
                setEnrolledCourses(coursesList);
              }
            } else {
              setError('User profile not found.');
            }
          } catch (err) {
            setError('Failed to fetch user profile.');
            console.error(err);
          }
        };
        fetchUserProfile();
      }
    }
  }, [user, loading, router]);

  if (loading || !userProfile) {
    return <div className="text-center mt-10">Loading Dashboard...</div>;
  }
  if (error) {
    return <div className="text-center mt-10 text-red-500">{error}</div>
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-4">Dashboard</h1>
      <p className="mb-2">Welcome, <span className="font-semibold">{userProfile.email}</span>!</p>
      <p className="mb-6">Your role is: <span className="px-2 py-1 text-sm font-medium text-white bg-green-600 rounded-full">{userProfile.role}</span></p>
      
      {/* --- STUDENT SECTION --- */}
      {userProfile.role === 'student' && (
        <div className="p-6 bg-blue-100 border border-blue-300 rounded-lg">
            <h2 className="text-2xl font-semibold text-blue-800 mb-4">My Enrolled Courses</h2>
            {enrolledCourses.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {enrolledCourses.map(course => (
                <Link href={`/courses/${course.id}/view`} key={course.id} className="block bg-white p-4 rounded-md shadow hover:shadow-lg transition-shadow">
                    <h3 className="font-bold text-lg">{course.title}</h3>
                    <p className="text-sm text-indigo-600 mt-2">Start Learning →</p>
                </Link>
                ))}
              </div>
            ) : (
              <p>You are not yet enrolled in any courses. <Link href="/courses" className="text-blue-600 hover:underline">Browse the catalog!</Link></p>
            )}
        </div>
      )}

      {/* --- EDUCATOR SECTION --- */}
      {userProfile.role === 'educator' && (
        <div className="p-6 bg-purple-100 border border-purple-300 rounded-lg">
            <h2 className="text-xl font-semibold text-purple-800 mb-4">Educator Section</h2>
            <div className="flex space-x-4">
                <Link href="/courses/create" className="px-4 py-2 font-medium text-white bg-purple-600 rounded-md hover:bg-purple-700">Create New Course</Link>
                <Link href="/courses/my-courses" className="px-4 py-2 font-medium text-purple-700 bg-white border border-purple-600 rounded-md hover:bg-purple-50">View My Courses</Link>
            </div>
        </div>
      )}

      {/* --- ADMIN SECTION --- */}
      {userProfile.role === 'admin' && (
        <div className="p-6 bg-gray-200 border border-gray-400 rounded-lg">
            <h2 className="text-xl font-semibold text-gray-800">Admin Section</h2>
            <p>System management tools will be here.</p>
        </div>
      )}
    </div>
  );
}