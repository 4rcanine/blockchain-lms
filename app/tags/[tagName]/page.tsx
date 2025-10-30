// app/tags/[tagName]/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/firebase/config';
import { useParams } from 'next/navigation';
import Link from 'next/link';

interface Course {
  id: string;
  title: string;
  description: string;
  tags: string[];
  imageUrl?: string;
}

export default function TagSearchPage() {
    const params = useParams();
    // Decode the tag name from the URL (e.g., %20 becomes a space)
    const tagName = decodeURIComponent(params.tagName as string);

    const [courses, setCourses] = useState<Course[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!tagName) return;

        const fetchCoursesByTag = async () => {
            try {
                const coursesCollectionRef = collection(db, 'courses');
                // Use 'array-contains' to find all courses that include this tag in their 'tags' array
                const q = query(coursesCollectionRef, where('tags', 'array-contains', tagName));
                
                const querySnapshot = await getDocs(q);
                
                const coursesList = querySnapshot.docs.map(doc => ({
                  id: doc.id,
                  ...doc.data()
                })) as Course[];
                
                setCourses(coursesList);
            } catch (err: any) {
                console.error(err);
                setError(`Failed to fetch courses for this tag: ${err.message}`);
            } finally {
                setLoading(false);
            }
        };

        fetchCoursesByTag();
    }, [tagName]);

    if (loading) return <p className="text-center mt-10">Finding courses...</p>;
    if (error) return <p className="text-center mt-10 text-red-500">{error}</p>;

    return (
        <div>
            <h1 className="text-3xl font-bold mb-2">Courses Tagged With</h1>
            <p className="text-xl text-indigo-600 font-semibold mb-8">"{tagName}"</p>
            
            {courses.length === 0 ? (
                <p>No courses found with this tag.</p>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Reusing the same card style from the catalog */}
                    {courses.map(course => (
                        <div key={course.id} className="bg-white rounded-lg shadow-sm hover:shadow-lg transition-shadow flex flex-col">
                            {course.imageUrl ? (
                                <img src={course.imageUrl} alt={course.title} className="w-full h-40 object-cover rounded-t-lg" />
                            ) : (
                                <div className="w-full h-40 bg-gray-200 rounded-t-lg flex items-center justify-center"><span className="text-gray-400">No Image</span></div>
                            )}
                            <div className="p-6 flex flex-col flex-grow">
                                <div>
                                    <h2 className="text-xl font-bold mb-2 text-gray-800">{course.title}</h2>
                                    <div className="flex flex-wrap gap-2 mb-4">
                                        {/* Tags are rendered here, but not clickable on the search results page to avoid loops */}
                                        {course.tags.map(tag => (
                                            <span key={tag} className="px-2 py-1 text-xs font-semibold text-gray-700 bg-gray-200 rounded-full">
                                                {tag}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                                <Link href={`/courses/${course.id}`} className="mt-auto block w-full text-center px-4 py-2 font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700">
                                    View Details
                                </Link>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}