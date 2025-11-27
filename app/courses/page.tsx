// app/courses/page.tsx
'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
import { collection, getDocs, query } from 'firebase/firestore';
import { db } from '@/firebase/config';
import Link from 'next/link';
import { 
    Search, 
    BookOpen, 
    Filter, 
    Sparkles, 
    Layers,
    ArrowRight 
} from 'lucide-react';

interface Course {
  id: string;
  title: string;
  description: string;
  tags: string[];
  imageUrl?: string;
}

// --- Loading Skeleton Component ---
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

export default function CourseCatalog() {
  const [allCourses, setAllCourses] = useState<Course[]>([]);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  // --- Refs to allow scrollIntoView ---
  const tagRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  useEffect(() => {
    const fetchCoursesAndTags = async () => {
      try {
        const coursesCollectionRef = collection(db, 'courses');
        const coursesSnapshot = await getDocs(query(coursesCollectionRef));
        const coursesList = coursesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as Course[];

        const tagsCollectionRef = collection(db, 'tags');
        const tagsSnapshot = await getDocs(query(tagsCollectionRef));
        const tagsList = tagsSnapshot.docs
          .map(doc => doc.data().name)
          .filter((tag): tag is string => typeof tag === 'string');

        setAllCourses(coursesList);
        setAllTags(tagsList.sort());
      } catch (err: any) {
        console.error(err);
        setError(`Failed to fetch catalog data: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchCoursesAndTags();
  }, []);

  // --- Filtering Logic ---
  const filteredCourses = useMemo(() => {
    return allCourses.filter(course => {
      if (!course.title || !course.tags) return false;

      const matchesSearch = course.title
        .toLowerCase()
        .includes(searchTerm.toLowerCase());

      const matchesTags =
        selectedTags.length === 0 ||
        selectedTags.some(selectedTag => course.tags.includes(selectedTag));

      return matchesSearch && matchesTags;
    });
  }, [allCourses, searchTerm, selectedTags]);

  // --- Tag Click + Scroll Behavior ---
  const handleTagClick = (tag: string) => {
    setSelectedTags(prev => {
      const newSelectedTags = prev.includes(tag)
        ? prev.filter(t => t !== tag)
        : [...prev, tag];

      if (tagRefs.current[tag]) {
        tagRefs.current[tag]?.scrollIntoView({
          behavior: 'smooth',
          inline: 'center',
          block: 'nearest',
        });
      }

      return newSelectedTags;
    });
  };

  if (error)
    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6">
            <div className="text-red-500 bg-red-100 dark:bg-red-900/20 p-4 rounded-full mb-4">
                <Sparkles className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Something went wrong</h2>
            <p className="text-gray-500 dark:text-gray-400 mt-2">{error}</p>
        </div>
    );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gray-900 pb-20 transition-colors duration-300">
      
      {/* --- Header Section --- */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <div className="container mx-auto px-6 py-12">
              <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                      <BookOpen className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white tracking-tight">
                      Course Catalog
                  </h1>
              </div>
              <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl">
                  Explore our library of Web3 courses. From basics to advanced smart contract security, find your next challenge here.
              </p>
          </div>
      </div>

      <div className="container mx-auto px-6 -mt-8">
        {/* --- Filters Card --- */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl shadow-indigo-100/50 dark:shadow-none border border-gray-100 dark:border-gray-700 p-6 mb-12">
            <div className="flex flex-col md:flex-row gap-6">
                
                {/* Search Bar */}
                <div className="flex-1">
                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                        Search
                    </label>
                    <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <Search className="h-5 w-5 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
                        </div>
                        <input
                            type="text"
                            placeholder="e.g. Solidity, DeFi, NFTs..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="block w-full pl-11 pr-4 py-3 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                        />
                    </div>
                </div>

                {/* Tag Filters */}
                <div className="flex-[2]">
                    <div className="flex items-center gap-2 mb-2">
                        <Filter className="w-3 h-3 text-gray-400" />
                        <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Filter by Topic
                        </label>
                    </div>
                    
                    <div className="flex flex-nowrap overflow-x-auto gap-2 pb-2 scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-gray-700 scrollbar-track-transparent mask-image-linear-gradient">
                        {allTags.length === 0 ? (
                            <span className="text-sm text-gray-400 italic py-2">No tags found.</span>
                        ) : (
                            allTags.map(tag => (
                                <button
                                    key={tag}
                                    ref={el => { tagRefs.current[tag] = el; }}
                                    onClick={() => handleTagClick(tag)}
                                    className={`
                                        flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 border
                                        ${selectedTags.includes(tag)
                                            ? 'bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-200 dark:shadow-none transform scale-105'
                                            : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-indigo-300 dark:hover:border-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400'
                                        }
                                    `}
                                >
                                    {tag}
                                </button>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>

        {/* --- Course List --- */}
        {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {[1, 2, 3, 4, 5, 6].map((n) => <CourseSkeleton key={n} />)}
            </div>
        ) : filteredCourses.length === 0 ? (
            <div className="text-center py-20">
                <div className="bg-gray-100 dark:bg-gray-800 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Search className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No courses found</h3>
                <p className="text-gray-500 dark:text-gray-400">Try adjusting your search or filters to find what you're looking for.</p>
                <button 
                    onClick={() => { setSearchTerm(''); setSelectedTags([]); }}
                    className="mt-6 text-indigo-600 dark:text-indigo-400 font-semibold hover:underline"
                >
                    Clear all filters
                </button>
            </div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {filteredCourses.map(course => (
                    <div
                        key={course.id}
                        className="group bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-xl hover:shadow-indigo-500/10 transition-all duration-300 flex flex-col overflow-hidden hover:-translate-y-1"
                    >
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
                            {/* Overlay gradient on hover */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        </div>

                        <div className="p-6 flex flex-col flex-grow">
                            <div className="flex flex-wrap gap-2 mb-3">
                                {course.tags.slice(0, 3).map(tag => (
                                    <span
                                        key={tag}
                                        className="px-2.5 py-0.5 text-[10px] uppercase tracking-wider font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-900/30 rounded-full border border-indigo-100 dark:border-indigo-800"
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