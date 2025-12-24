// app/(educator)/courses/my-courses/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/firebase/config';
import useAuth from '@/hooks/useAuth';
import Link from 'next/link';
import { 
    Plus, 
    BookOpen, 
    Settings, 
    Loader2, 
    AlertCircle, 
    FileEdit,
    SearchX
} from 'lucide-react';

interface Course {
  id: string;
  title: string;
  description: string;
  tags: string[];
}

// --- Loading Skeleton ---
const CourseSkeleton = () => (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 h-64 flex flex-col animate-pulse">
        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-4" />
        <div className="space-y-2 flex-1">
            <div className="h-4 bg-gray-100 dark:bg-gray-700/50 rounded w-full" />
            <div className="h-4 bg-gray-100 dark:bg-gray-700/50 rounded w-5/6" />
            <div className="h-4 bg-gray-100 dark:bg-gray-700/50 rounded w-4/6" />
        </div>
        <div className="flex gap-2 mt-4">
            <div className="h-6 w-16 bg-gray-200 dark:bg-gray-700 rounded-full" />
            <div className="h-6 w-16 bg-gray-200 dark:bg-gray-700 rounded-full" />
        </div>
        <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded-xl mt-6" />
    </div>
);

export default function MyCourses() {
  const { user, loading: authLoading } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setError('You must be logged in to view your courses.');
      setLoading(false);
      return;
    }

    const fetchCourses = async () => {
      try {
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

  // --- Render Loading ---
  if (loading) return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3, 4, 5, 6].map((n) => <CourseSkeleton key={n} />)}
    </div>
  );

  // --- Render Error ---
  if (error) return (
    <div className="flex flex-col items-center justify-center h-[50vh] text-center p-6">
        <div className="bg-red-100 dark:bg-red-900/20 p-4 rounded-full mb-4 text-red-600 dark:text-red-400">
            <AlertCircle className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-bold text-gray-900 dark:text-white">Error Loading Courses</h3>
        <p className="text-gray-500 dark:text-gray-400 mt-2">{error}</p>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto">
      
      {/* --- Header Section --- */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-10">
        <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                <BookOpen className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
                My Courses
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
                Manage your curriculum and track student progress.
            </p>
        </div>
        <Link 
            href="/courses/create" 
            className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl shadow-lg shadow-indigo-500/30 transition-all hover:scale-105 active:scale-95"
        >
            <Plus className="w-5 h-5" /> Create New Course
        </Link>
      </div>
      
      {/* --- Content --- */}
      {courses.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-gray-800 rounded-3xl border border-dashed border-gray-300 dark:border-gray-700">
            <div className="w-20 h-20 bg-gray-100 dark:bg-gray-700/50 rounded-full flex items-center justify-center mb-4">
                <SearchX className="w-10 h-10 text-gray-400 dark:text-gray-500" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No Courses Yet</h2>
            <p className="text-gray-500 dark:text-gray-400 max-w-md text-center mb-8">
                You haven't created any courses yet. Start sharing your knowledge by creating your first course today.
            </p>
            <Link 
                href="/courses/create" 
                className="px-6 py-2 text-indigo-600 dark:text-indigo-400 font-semibold bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-800 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors"
            >
                Start Creating
            </Link>
        </div>
      ) : (

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map(course => (
            <div 
                key={course.id} 
                className="group bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl p-6 flex flex-col shadow-sm hover:shadow-xl hover:shadow-indigo-500/5 transition-all duration-300 hover:-translate-y-1"
            >
              <div className="flex-1">
                <div className="flex justify-between items-start mb-4">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white line-clamp-1" title={course.title}>
                        {course.title}
                    </h2>
                    <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg">
                        <FileEdit className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    </div>
                </div>
                
                <p className="text-gray-600 dark:text-gray-400 text-sm mb-6 line-clamp-3 leading-relaxed">
                    {course.description || "No description provided."}
                </p>
                
                <div className="flex flex-wrap gap-2 mb-6">
                  {course.tags.slice(0, 3).map(tag => (
                    <span 
                        key={tag} 
                        className="px-2.5 py-1 text-xs font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-900/30 rounded-full border border-indigo-100 dark:border-indigo-800/50"
                    >
                      {tag}
                    </span>
                  ))}
                  {course.tags.length > 3 && (
                      <span className="px-2 py-1 text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 rounded-full">
                          +{course.tags.length - 3}
                      </span>
                  )}
                </div>
              </div>

              <Link 
                href={`/courses/${course.id}/manage`} 
                className="mt-auto flex items-center justify-center gap-2 w-full px-4 py-3 font-semibold text-indigo-600 dark:text-white bg-indigo-50 dark:bg-indigo-600 hover:bg-indigo-100 dark:hover:bg-indigo-700 rounded-xl transition-colors group-hover:shadow-sm"
              >
                <Settings className="w-4 h-4" /> Manage Course
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}