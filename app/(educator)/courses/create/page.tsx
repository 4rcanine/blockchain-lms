// blockchain-lms/app/(educator)/courses/create/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { collection, getDocs, addDoc } from 'firebase/firestore';
import { db } from '@/firebase/config';
import useAuth from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import ImageUploader from '@/components/ImageUploader';
import Select from 'react-select';

// ---------------------- Types ----------------------
interface SelectOption {
  value: string;
  label: string;
}

// -------------------- Component --------------------
export default function CreateCourse() {
  const { user } = useAuth();
  const router = useRouter();

  // -------------------- State --------------------
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [availableTags, setAvailableTags] = useState<SelectOption[]>([]);
  const [selectedTags, setSelectedTags] = useState<SelectOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // -------------------- Fetch Tags --------------------
  useEffect(() => {
    const fetchTags = async () => {
      try {
        const tagsCollectionRef = collection(db, 'tags');
        const querySnapshot = await getDocs(tagsCollectionRef);

        const tagsList = querySnapshot.docs.map((doc) => ({
          value: doc.data().name,
          label: doc.data().name,
        })) as SelectOption[];

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

  // -------------------- Create Course --------------------
  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      setError('You must be logged in to create a course.');
      return;
    }

    if (!title || !description || selectedTags.length === 0 || !imageUrl) {
      setError('Please fill out all fields, upload an image, and select at least one tag.');
      return;
    }

    try {
      const tagStrings = selectedTags.map((tag) => tag.value);

      await addDoc(collection(db, 'courses'), {
        title,
        description,
        tags: tagStrings,
        imageUrl,
        instructorIds: [user.uid], 
        createdAt: new Date(),
      });

      router.push('/dashboard');
    } catch (err: any) {
      console.error(err);
      setError(`Failed to create course: ${err.message}`);
    }
  };

  // -------------------- Render --------------------
  if (loading) return <p>Loading course creator...</p>;

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Create a New Course</h1>

      <form
        onSubmit={handleCreateCourse}
        className="space-y-6 bg-white p-8 shadow-md rounded-lg"
      >
        {/* ✅ Image Upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Course Cover Image
          </label>
          <ImageUploader onUploadComplete={setImageUrl} />
          {imageUrl && (
            <div className="mt-3">
              <img
                src={imageUrl}
                alt="Course cover preview"
                className="w-full max-w-sm rounded-md border border-gray-200 shadow-sm"
              />
            </div>
          )}
        </div>

        {/* ✅ Title */}
        <div>
          <label
            htmlFor="title"
            className="block text-sm font-medium text-gray-700"
          >
            Course Title
          </label>
          <input
            type="text"
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-2 mt-1 text-gray-900 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>

        {/* ✅ Description */}
        <div>
          <label
            htmlFor="description"
            className="block text-sm font-medium text-gray-700"
          >
            Course Description
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            className="w-full px-3 py-2 mt-1 text-gray-900 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>

        {/* ✅ Tag Selection with react-select */}
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Tags
          </label>
          <Select
            instanceId="tag-select"
            isMulti
            options={availableTags}
            value={selectedTags}
            onChange={(selectedOptions) =>
              setSelectedTags(selectedOptions as SelectOption[])
            }
            className="mt-1"
            classNamePrefix="select"
            placeholder="Select one or more tags..."
          />
        </div>

        {/* ✅ Error Message */}
        {error && <p className="text-red-500">{error}</p>}

        {/* ✅ Submit */}
        <button
          type="submit"
          className="w-full px-4 py-2 font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          Create Course
        </button>
      </form>
    </div>
  );
}
