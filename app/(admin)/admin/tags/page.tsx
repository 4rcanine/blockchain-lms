// app/(admin)/admin/tags/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { collection, getDocs, addDoc, deleteDoc, doc, query, where } from 'firebase/firestore';
import { db } from '../../../../firebase/config'; // Adjust path

interface Tag {
  id: string;
  name: string;
}

export default function TagManagement() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [newTagName, setNewTagName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Function to fetch tags from Firestore
  const fetchTags = async () => {
    try {
      const tagsCollectionRef = collection(db, 'tags');
      const querySnapshot = await getDocs(tagsCollectionRef);
      const tagsList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name
      })) as Tag[];
      setTags(tagsList);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch tags. You might not have permission.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch tags when the component mounts
  useEffect(() => {
    fetchTags();
  }, []);

  const handleCreateTag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newTagName.trim() === '') {
      setError('Tag name cannot be empty.');
      return;
    }
    // Prevent duplicate tags (case-insensitive)
    if (tags.some(tag => tag.name.toLowerCase() === newTagName.trim().toLowerCase())) {
        setError('This tag already exists.');
        return;
    }

    try {
      // Add the new tag to Firestore
      await addDoc(collection(db, 'tags'), { name: newTagName.trim() });
      setNewTagName(''); // Clear input
      setError(null); // Clear error
      fetchTags(); // Refresh the list of tags
    } catch (err) {
      console.error(err);
      setError('Failed to create tag.');
    }
  };

  const handleDeleteTag = async (tagId: string) => {
    if (!window.confirm('Are you sure you want to delete this tag?')) return;
    
    try {
      await deleteDoc(doc(db, 'tags', tagId));
      fetchTags(); // Refresh the list
    } catch (err) {
      console.error(err);
      setError('Failed to delete tag.');
    }
  };

  if (loading) return <p>Loading tags...</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Tag Management</h1>
      
      {/* Create Tag Form */}
      <form onSubmit={handleCreateTag} className="mb-8 p-4 bg-white shadow-md rounded-lg">
        <h2 className="text-xl font-semibold mb-4">Create New Tag</h2>
        <div className="flex items-center space-x-4">
          <input
            type="text"
            value={newTagName}
            onChange={(e) => setNewTagName(e.target.value)}
            placeholder="e.g., Web3, Blockchain, Solidity"
            className="w-full px-3 py-2 text-gray-900 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          />
          <button type="submit" className="px-4 py-2 font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 whitespace-nowrap">
            Create Tag
          </button>
        </div>
        {error && <p className="text-red-500 mt-2">{error}</p>}
      </form>

      {/* List of Existing Tags */}
      <div className="bg-white shadow-md rounded-lg p-4">
        <h2 className="text-xl font-semibold mb-4">Existing Tags</h2>
        <div className="flex flex-wrap gap-3">
          {tags.length > 0 ? (
            tags.map(tag => (
              <div key={tag.id} className="flex items-center bg-gray-200 rounded-full px-4 py-2">
                <span className="text-gray-800 font-medium">{tag.name}</span>
                <button onClick={() => handleDeleteTag(tag.id)} className="ml-3 text-red-500 hover:text-red-700 font-bold">
                  &times;
                </button>
              </div>
            ))
          ) : (
            <p>No tags created yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}