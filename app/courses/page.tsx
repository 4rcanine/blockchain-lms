// app/courses/page.tsx
'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
import { collection, getDocs, query } from 'firebase/firestore';
import { db } from '@/firebase/config';
import Link from 'next/link';

interface Course {
  id: string;
  title: string;
  description: string;
  tags: string[];
  imageUrl?: string;
}

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

      // Smooth scroll for UX polish
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

  if (loading)
    return <p className="text-center mt-10">Loading course catalog...</p>;
  if (error)
    return <p className="text-center mt-10 text-red-500">{error}</p>;

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Course Catalog</h1>

      {/* --- Filters --- */}
      <div className="mb-8 p-4 bg-white shadow-md rounded-lg">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search Bar */}
          <div className="md:col-span-1">
            <label
              htmlFor="search"
              className="block text-sm font-medium text-gray-700"
            >
              Search Courses
            </label>
            <input
              type="text"
              id="search"
              placeholder="e.g., Solidity Basics"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full mt-1 p-2 border rounded-md"
            />
          </div>

          {/* Tag Filters */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700">
              Filter by Tags
            </label>
            <div className="flex flex-nowrap overflow-x-auto gap-2 mt-2 pb-2 scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-100">
              {allTags.length === 0 ? (
                <span className="text-gray-500 text-sm">
                  No tags available.
                </span>
              ) : (
                allTags.map(tag => (
                  <button
                    key={tag}
                    ref={el => {
                    tagRefs.current[tag] = el;
                    }}

                    onClick={() => handleTagClick(tag)}
                    className={`flex-shrink-0 px-3 py-1 rounded-full text-sm font-semibold border-2 transition-all ${
                      selectedTags.includes(tag)
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
                    }`}
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
      {filteredCourses.length === 0 ? (
        <p>No courses match your current filters. Please try a different search or tag.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCourses.map(course => (
            <div
              key={course.id}
              className="bg-white rounded-lg shadow-sm hover:shadow-lg transition-shadow flex flex-col"
            >
              {course.imageUrl ? (
                <img
                  src={course.imageUrl}
                  alt={course.title}
                  className="w-full h-40 object-cover rounded-t-lg"
                />
              ) : (
                <div className="w-full h-40 bg-gray-200 rounded-t-lg flex items-center justify-center">
                  <span className="text-gray-400">No Image</span>
                </div>
              )}
              <div className="p-6 flex flex-col flex-grow">
                <div>
                  <h2 className="text-xl font-bold mb-2 text-gray-800">
                    {course.title}
                  </h2>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {course.tags.map(tag => (
                      <span
                        key={tag}
                        className="px-2 py-1 text-xs font-semibold text-gray-700 bg-gray-200 rounded-full"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
                <Link
                  href={`/courses/${course.id}`}
                  className="mt-auto block w-full text-center px-4 py-2 font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
                >
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
