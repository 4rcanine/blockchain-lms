// app/(educator)/courses/my-courses/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../../../firebase/config'; // Adjust path
import useAuth from '../../../../hooks/useAuth'; // Adjust path
import Link from 'next/link';

interface Course {
  id: string;
  title: string;
  description: string;
  tags: string[];
}

export default function MyCourses() {
  const { user, loading: authLoading } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return; // Wait for auth state to be resolved
    if (!user) {
      setError('You must be logged in to view your courses.');
      setLoading(false);
      return;
    }

    const fetchCourses = async () => {
      try {
        // This query is now enforced by our security rules
        const coursesCollectionRef = collection(db, 'courses');
        const q = query(coursesCollectionRef, where('instructorIds', 'array-contains', user.uid));
        
        const querySnapshot = await getDocs(q);
        
        const coursesList = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Course[];
        
        setCourses(coursesList);
      } catch (err: any) {
        console.error(err);
        setError(`Failed to fetch courses: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchCourses();
  }, [user, authLoading]);

  if (loading) return <p>Loading your courses...</p>;
  if (error) return <p className="text-red-500">{error}</p>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">My Courses</h1>
        <Link href="/courses/create" className="px-4 py-2 font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700">
          Create New Course
        </Link>
      </div>
      
      {courses.length === 0 ? (
        <p>You have not created any courses yet.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map(course => (
            <div key={course.id} className="bg-white shadow-md rounded-lg p-6 flex flex-col justify-between">
              <div>
                <h2 className="text-xl font-bold mb-2">{course.title}</h2>
                <p className="text-gray-600 mb-4">{course.description.substring(0, 100)}...</p>
                <div className="flex flex-wrap gap-2 mb-4">
                  {course.tags.map(tag => (
                    <span key={tag} className="px-2 py-1 text-xs font-semibold text-indigo-800 bg-indigo-100 rounded-full">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
              <Link href={`/courses/${course.id}/manage`} className="mt-4 block w-full text-center px-4 py-2 font-medium text-indigo-600 bg-white border border-indigo-600 rounded-md hover:bg-indigo-50">
                Manage Course
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}