// components/VideoUploader.tsx
'use client';
import { useState } from 'react';
import axios from 'axios';

interface VideoUploaderProps {
    onUploadComplete: (url: string) => void;
    onUploadStart: () => void;
    onUploadError: () => void;
}

// --- IMPORTANT: UPDATE THESE VALUES ---
const CLOUDINARY_UPLOAD_PRESET = "lms_uploads"; // Should be the same unsigned preset
const CLOUDINARY_CLOUD_NAME = "dvfszba6c"; // Your cloud name

export default function VideoUploader({ onUploadComplete, onUploadStart, onUploadError }: VideoUploaderProps) {
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [fileName, setFileName] = useState('');

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        setFileName(file.name);
        onUploadStart();

        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

        try {
            const response = await axios.post(
                `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/video/upload`, // Note the /video/upload endpoint
                formData,
                {
                    onUploadProgress: (progressEvent) => {
                        const percentCompleted = Math.round((progressEvent.loaded * 100) / (progressEvent.total || 1));
                        setProgress(percentCompleted);
                    },
                }
            );
            const { secure_url } = response.data;
            onUploadComplete(secure_url);
        } catch (err) {
            console.error("Video upload failed", err);
            onUploadError();
        } finally {
            setUploading(false);
        }
    };

    return (
        <div>
            <label className="block text-sm font-medium text-gray-700">Lesson Video (Optional)</label>
            {!uploading && !fileName && (
                <label htmlFor="video-upload" className="mt-1 relative cursor-pointer bg-white rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none p-2 border-2 border-dashed border-gray-300 block text-center">
                    <span>Select Video</span>
                    <input id="video-upload" name="video-upload" type="file" className="sr-only" onChange={handleFileChange} accept="video/*" />
                </label>
            )}

            {uploading && (
                <div className="mt-2">
                    <p className="text-sm text-gray-500 mb-1">Uploading: {fileName}</p>
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                        <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${progress}%` }}></div>
                    </div>
                </div>
            )}
            
            {!uploading && fileName && (
                <div className="mt-2 p-2 bg-green-100 text-green-800 text-sm rounded-md">
                    ✓ Video uploaded successfully.
                </div>
            )}
        </div>
    );
}