// app/courses/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { collection, getDocs, query } from 'firebase/firestore';
import { db } from '../../firebase/config'; // Adjust path
import Link from 'next/link';

interface Course {
  id: string;
  title: string;
  description: string;
  tags: string[];
}

export default function CourseCatalog() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const coursesCollectionRef = collection(db, 'courses');
        const q = query(coursesCollectionRef); // Simple query to get all courses
        
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
  }, []);

  if (loading) return <p className="text-center mt-10">Loading course catalog...</p>;
  if (error) return <p className="text-center mt-10 text-red-500">{error}</p>;

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Course Catalog</h1>
      <p className="text-lg text-gray-600 mb-8">Browse our available courses and start your learning journey.</p>
      
      {courses.length === 0 ? (
        <p>No courses are available at the moment. Please check back later!</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map(course => (
            <div key={course.id} className="bg-white border border-gray-200 shadow-sm rounded-lg p-6 flex flex-col justify-between hover:shadow-lg transition-shadow duration-300">
              <div>
                <h2 className="text-xl font-bold mb-2 text-gray-800">{course.title}</h2>
                <p className="text-gray-600 mb-4">{course.description.substring(0, 100)}...</p>
                <div className="flex flex-wrap gap-2 mb-4">
                  {course.tags.map(tag => (
                    <span key={tag} className="px-2 py-1 text-xs font-semibold text-indigo-800 bg-indigo-100 rounded-full">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
              <Link href={`/courses/${course.id}`} className="mt-4 block w-full text-center px-4 py-2 font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700">
                View Details
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}