// components/ImageUploader.tsx
'use client';
import { useState } from 'react';
import axios from 'axios';

interface ImageUploaderProps {
    onUploadComplete: (url: string) => void;
}

// --- IMPORTANT: UPDATE THESE VALUES ---
// These should be the same as in your AddContentModal.tsx
const CLOUDINARY_UPLOAD_PRESET = "lms_uploads"; // The name of your unsigned preset
const CLOUDINARY_CLOUD_NAME = "dvfszba6c"; // Your cloud name

export default function ImageUploader({ onUploadComplete }: ImageUploaderProps) {
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState('');
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Create a local preview
        const reader = new FileReader();
        reader.onloadend = () => {
            setPreviewUrl(reader.result as string);
        };
        reader.readAsDataURL(file);

        // Start the upload
        setUploading(true);
        setError('');
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

        try {
            const response = await axios.post(
                `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/upload`,
                formData
            );
            const { secure_url } = response.data;
            onUploadComplete(secure_url); // Send the final URL to the parent page
        } catch (err) {
            console.error("Upload failed", err);
            setError("Image upload failed. Please try again.");
            setPreviewUrl(null); // Clear preview on error
        } finally {
            setUploading(false);
        }
    };

    return (
        <div>
            <label className="block text-sm font-medium text-gray-700">Course Cover Image</label>
            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                <div className="space-y-1 text-center">
                    {previewUrl ? (
                        <img src={previewUrl} alt="Image preview" className="mx-auto h-24 w-auto rounded-md" />
                    ) : (
                        <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
                            <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    )}
                    <div className="flex text-sm text-gray-600">
                        <label htmlFor="file-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none">
                            <span>{uploading ? 'Uploading...' : 'Upload a file'}</span>
                            <input id="file-upload" name="file-upload" type="file" className="sr-only" onChange={handleFileChange} disabled={uploading} accept="image/*" />
                        </label>
                        <p className="pl-1">or drag and drop</p>
                    </div>
                    <p className="text-xs text-gray-500">PNG, JPG, GIF up to 10MB</p>
                </div>
            </div>
            {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
        </div>
    );
}