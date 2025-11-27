// app/tags/[tagName]/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/firebase/config';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { 
    Hash, 
    ArrowLeft, 
    BookOpen, 
    Layers, 
    ArrowRight, 
    Sparkles,
    SearchX
} from 'lucide-react';

interface Course {
  id: string;
  title: string;
  description: string;
  tags: string[];
  imageUrl?: string;
}

// --- Skeleton Component for Loading ---
const CourseSkeleton = () => (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden h-full flex flex-col animate-pulse">
        <div className="h-48 bg-gray-200 dark:bg-gray-700" />
        <div className="p-6 flex-1 space-y-4">
            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
            <div className="flex gap-2">
                <div className="h-5 w-16 bg-gray-200 dark:bg-gray-700 rounded-full" />
                <div className="h-5 w-16 bg-gray-200 dark:bg-gray-700 rounded-full" />
            </div>
            <div className="space-y-2 pt-2">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full" />
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6" />
            </div>
        </div>
    </div>
);

export default function TagSearchPage() {
    const params = useParams();
    const tagName = decodeURIComponent(params.tagName as string);

    const [courses, setCourses] = useState<Course[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!tagName) return;

        const fetchCoursesByTag = async () => {
            try {
                const coursesCollectionRef = collection(db, 'courses');
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

    if (error) return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6 bg-slate-50 dark:bg-gray-900">
            <div className="text-red-500 bg-red-100 dark:bg-red-900/20 p-4 rounded-full mb-4">
                <Sparkles className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Error loading topics</h2>
            <p className="text-gray-500 dark:text-gray-400 mt-2">{error}</p>
            <Link href="/courses" className="mt-6 text-indigo-600 dark:text-indigo-400 font-semibold hover:underline">
                Back to Catalog
            </Link>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-gray-900 transition-colors duration-300 pb-20">
            
            {/* --- Header --- */}
            <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                <div className="container mx-auto px-6 py-12">
                    <Link 
                        href="/courses" 
                        className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 mb-6 transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" /> Back to Catalog
                    </Link>
                    
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 rounded-2xl">
                            <Hash className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <div>
                            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">
                                {tagName}
                            </h1>
                            <p className="text-gray-500 dark:text-gray-400 mt-1">
                                Browsing courses related to this topic
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="container mx-auto px-6 py-12">
                
                {/* --- Loading State --- */}
                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {[1, 2, 3].map((n) => <CourseSkeleton key={n} />)}
                    </div>
                ) : courses.length === 0 ? (
                    // --- Empty State ---
                    <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-3xl border border-dashed border-gray-200 dark:border-gray-700">
                        <div className="bg-gray-100 dark:bg-gray-700 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                            <SearchX className="w-8 h-8 text-gray-400 dark:text-gray-500" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No courses found</h3>
                        <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto">
                            It seems there are no courses tagged with <strong>"{tagName}"</strong> yet.
                        </p>
                        <Link 
                            href="/courses"
                            className="inline-block mt-8 px-6 py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-500/20"
                        >
                            Explore other topics
                        </Link>
                    </div>
                ) : (
                    // --- Course Grid ---
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {courses.map(course => (
                            <div 
                                key={course.id} 
                                className="group bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-xl hover:shadow-indigo-500/10 transition-all duration-300 flex flex-col overflow-hidden hover:-translate-y-1"
                            >
                                {/* Image */}
                                <div className="relative h-48 overflow-hidden bg-gray-100 dark:bg-gray-700">
                                    {course.imageUrl ? (
                                        <img 
                                            src={course.imageUrl} 
                                            alt={course.title} 
                                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
                                        />
                                    ) : (
                                        <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 dark:text-gray-500">
                                            <Layers className="w-10 h-10 mb-2 opacity-50" />
                                            <span className="text-xs font-medium uppercase tracking-widest">No Preview</span>
                                        </div>
                                    )}
                                    {/* Hover Overlay */}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                </div>

                                {/* Content */}
                                <div className="p-6 flex flex-col flex-grow">
                                    <div className="flex flex-wrap gap-2 mb-3">
                                        {course.tags.map(tag => (
                                            <span 
                                                key={tag} 
                                                className={`px-2.5 py-0.5 text-[10px] uppercase tracking-wider font-bold rounded-full border 
                                                    ${tag === tagName 
                                                        ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-700' 
                                                        : 'bg-gray-100 dark:bg-gray-700/50 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-600'
                                                    }`}
                                            >
                                                {tag}
                                            </span>
                                        ))}
                                    </div>

                                    <h2 className="text-xl font-bold mb-2 text-gray-900 dark:text-white line-clamp-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                        {course.title}
                                    </h2>
                                    
                                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-6 flex-grow line-clamp-3 leading-relaxed">
                                        {course.description}
                                    </p>

                                    <Link 
                                        href={`/courses/${course.id}`} 
                                        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gray-50 dark:bg-gray-700/50 text-gray-700 dark:text-gray-300 font-semibold text-sm border border-gray-200 dark:border-gray-600 group-hover:bg-indigo-600 group-hover:text-white group-hover:border-indigo-600 transition-all duration-300"
                                    >
                                        View Details 
                                        <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                                    </Link>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}