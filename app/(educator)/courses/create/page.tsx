// app/(educator)/courses/create/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { collection, getDocs, addDoc } from 'firebase/firestore';
import { db } from '@/firebase/config';
import useAuth from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import ImageUploader from '@/components/ImageUploader';
import Select, { StylesConfig } from 'react-select';
import { useTheme } from '@/contexts/ThemeContext';
import { 
    ImagePlus, 
    Type, 
    FileText, 
    Tags, 
    PlusCircle, 
    Loader2, 
    AlertCircle,
    ArrowLeft
} from 'lucide-react';
import Link from 'next/link';

// ---------------------- Types ----------------------
interface SelectOption {
  value: string;
  label: string;
}

// -------------------- Component --------------------
export default function CreateCourse() {
  const { user } = useAuth();
  const { theme } = useTheme(); // Access theme to style React Select dynamically
  const router = useRouter();

  // -------------------- State --------------------
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [availableTags, setAvailableTags] = useState<SelectOption[]>([]);
  const [selectedTags, setSelectedTags] = useState<SelectOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
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

  // -------------------- React Select Styles --------------------
  // Custom styles to make react-select compatible with dark mode
  const selectStyles: StylesConfig<SelectOption, true> = {
    control: (base, state) => ({
      ...base,
      backgroundColor: theme === 'dark' ? '#1f2937' : '#ffffff', // gray-800 : white
      borderColor: theme === 'dark' ? '#374151' : '#e5e7eb', // gray-700 : gray-200
      color: theme === 'dark' ? '#ffffff' : '#111827',
      padding: '2px',
      borderRadius: '0.75rem',
      boxShadow: state.isFocused ? '0 0 0 2px rgba(99, 102, 241, 0.2)' : 'none',
      '&:hover': {
        borderColor: '#6366f1',
      },
    }),
    menu: (base) => ({
      ...base,
      backgroundColor: theme === 'dark' ? '#1f2937' : '#ffffff',
      border: theme === 'dark' ? '1px solid #374151' : '1px solid #e5e7eb',
      borderRadius: '0.75rem',
      overflow: 'hidden',
    }),
    option: (base, state) => ({
      ...base,
      backgroundColor: state.isFocused 
        ? (theme === 'dark' ? '#374151' : '#f3f4f6') 
        : (theme === 'dark' ? '#1f2937' : '#ffffff'),
      color: theme === 'dark' ? '#f3f4f6' : '#111827',
      cursor: 'pointer',
    }),
    singleValue: (base) => ({
      ...base,
      color: theme === 'dark' ? '#f3f4f6' : '#111827',
    }),
    multiValue: (base) => ({
      ...base,
      backgroundColor: theme === 'dark' ? '#374151' : '#e0e7ff', // gray-700 : indigo-100
      borderRadius: '0.375rem',
    }),
    multiValueLabel: (base) => ({
      ...base,
      color: theme === 'dark' ? '#f3f4f6' : '#3730a3', // white : indigo-900
    }),
    multiValueRemove: (base) => ({
      ...base,
      color: theme === 'dark' ? '#9ca3af' : '#4f46e5',
      ':hover': {
        backgroundColor: theme === 'dark' ? '#4b5563' : '#c7d2fe',
        color: theme === 'dark' ? '#ffffff' : '#312e81',
      },
    }),
    input: (base) => ({
        ...base,
        color: theme === 'dark' ? '#fff' : '#000',
    })
  };

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

    setIsSubmitting(true);

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

      router.push('/educator/dashboard'); // Redirect to educator dashboard
    } catch (err: any) {
      console.error(err);
      setError(`Failed to create course: ${err.message}`);
    } finally {
        setIsSubmitting(false);
    }
  };

  // -------------------- Render --------------------
  if (loading) return (
    <div className="flex h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-2">
            <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
            <p className="text-sm text-gray-500">Initializing Course Creator...</p>
        </div>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto pb-20">
        {/* Header */}
        <div className="mb-8">
            <Link 
                href="/educator/dashboard" 
                className="inline-flex items-center text-sm text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 mb-4 transition-colors"
            >
                <ArrowLeft className="w-4 h-4 mr-1" /> Back to Dashboard
            </Link>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Create a New Course</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
                Share your knowledge with the world. Fill in the details below.
            </p>
        </div>

      <form onSubmit={handleCreateCourse} className="space-y-8">
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column: Image Upload */}
            <div className="lg:col-span-1 space-y-6">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
                    <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                        <ImagePlus className="w-4 h-4 text-indigo-500" />
                        Course Cover
                    </label>
                    
                    <div className="space-y-4">
                        <ImageUploader onUploadComplete={setImageUrl} />
                        
                        {imageUrl ? (
                            <div className="relative rounded-xl overflow-hidden border border-gray-200 dark:border-gray-600 shadow-sm aspect-video group">
                                <img
                                    src={imageUrl}
                                    alt="Course cover preview"
                                    className="w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <span className="text-white text-xs font-medium bg-black/50 px-2 py-1 rounded">Preview</span>
                                </div>
                            </div>
                        ) : (
                            <div className="aspect-video rounded-xl bg-gray-50 dark:bg-gray-900 border-2 border-dashed border-gray-200 dark:border-gray-700 flex flex-col items-center justify-center text-gray-400">
                                <ImagePlus className="w-8 h-8 mb-2 opacity-50" />
                                <span className="text-xs">No image selected</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Right Column: Form Details */}
            <div className="lg:col-span-2 space-y-6">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm space-y-6">
                    
                    {/* Title */}
                    <div>
                        <label htmlFor="title" className="block text-sm font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                            <Type className="w-4 h-4 text-indigo-500" />
                            Course Title
                        </label>
                        <input
                            type="text"
                            id="title"
                            placeholder="e.g. Advanced Solidity Patterns"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                        />
                    </div>

                    {/* Description */}
                    <div>
                        <label htmlFor="description" className="block text-sm font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                            <FileText className="w-4 h-4 text-indigo-500" />
                            Description
                        </label>
                        <textarea
                            id="description"
                            placeholder="What will students learn in this course?"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows={5}
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all resize-none"
                        />
                    </div>

                    {/* Tags */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                            <Tags className="w-4 h-4 text-indigo-500" />
                            Topics / Tags
                        </label>
                        <Select
                            instanceId="tag-select"
                            isMulti
                            options={availableTags}
                            value={selectedTags}
                            onChange={(selectedOptions) => setSelectedTags(selectedOptions as SelectOption[])}
                            styles={selectStyles}
                            placeholder="Select relevant topics..."
                            className="text-sm"
                        />
                    </div>
                </div>
            </div>
        </div>

        {/* Error Message */}
        {error && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-2 text-red-600 dark:text-red-400">
                <AlertCircle className="w-5 h-5" />
                {error}
            </div>
        )}

        {/* Submit Button */}
        <div className="flex justify-end">
            <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center gap-2 px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/20 transition-all transform active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {isSubmitting ? (
                    <>
                        <Loader2 className="w-5 h-5 animate-spin" /> Creating...
                    </>
                ) : (
                    <>
                        <PlusCircle className="w-5 h-5" /> Create Course
                    </>
                )}
            </button>
        </div>
      </form>
    </div>
  );
}