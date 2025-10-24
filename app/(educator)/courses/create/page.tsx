// app/(educator)/courses/create/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { collection, getDocs, addDoc } from 'firebase/firestore';
import { db } from '../../../../firebase/config'; // Adjust path
import useAuth from '../../../../hooks/useAuth'; // Adjust path
import { useRouter } from 'next/navigation';

interface Tag {
  id: string;
  name: string;
}

export default function CreateCourse() {
  const { user } = useAuth();
  const router = useRouter();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch the available tags from Firestore
  useEffect(() => {
    const fetchTags = async () => {
      try {
        const tagsCollectionRef = collection(db, 'tags');
        const querySnapshot = await getDocs(tagsCollectionRef);
        const tagsList = querySnapshot.docs.map(doc => ({
          id: doc.id,
          name: doc.data().name
        })) as Tag[];
        setAvailableTags(tagsList);
      } catch (err) {
        console.error(err);
        setError('Failed to fetch tags.');
      } finally {
        setLoading(false);
      }
    };
    fetchTags();
  }, []);

  const handleTagSelection = (tagName: string) => {
    if (selectedTags.includes(tagName)) {
      setSelectedTags(selectedTags.filter(t => t !== tagName));
    } else {
      setSelectedTags([...selectedTags, tagName]);
    }
  };

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setError('You must be logged in to create a course.');
      return;
    }
    if (!title || !description || selectedTags.length === 0) {
      setError('Please fill out all fields and select at least one tag.');
      return;
    }

    try {
      await addDoc(collection(db, 'courses'), {
        title,
        description,
        tags: selectedTags,
        instructorId: user.uid, // Set the instructorId to the current user's ID
        createdAt: new Date(),
      });
      // Redirect to the educator's dashboard or course list page after creation
      router.push('/dashboard'); 
    } catch (err: any) {
      console.error(err);
      setError(`Failed to create course: ${err.message}`);
    }
  };

  if (loading) return <p>Loading course creator...</p>;

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Create a New Course</h1>
      <form onSubmit={handleCreateCourse} className="space-y-6 bg-white p-8 shadow-md rounded-lg">
        
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700">Course Title</label>
          <input type="text" id="title" value={title} onChange={e => setTitle(e.target.value)}
            className="w-full px-3 py-2 mt-1 text-gray-900 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"/>
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700">Course Description</label>
          <textarea id="description" value={description} onChange={e => setDescription(e.target.value)} rows={4}
            className="w-full px-3 py-2 mt-1 text-gray-900 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"/>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Tags</label>
          <div className="mt-2 flex flex-wrap gap-2">
            {availableTags.map(tag => (
              <button type="button" key={tag.id} onClick={() => handleTagSelection(tag.name)}
                className={`px-3 py-1 rounded-full text-sm font-semibold border-2 ${selectedTags.includes(tag.name) ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'}`}>
                {tag.name}
              </button>
            ))}
          </div>
        </div>

        {error && <p className="text-red-500">{error}</p>}
        
        <button type="submit" className="w-full px-4 py-2 font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
          Create Course
        </button>
      </form>
    </div>
  );
}