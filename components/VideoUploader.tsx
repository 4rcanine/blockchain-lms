// components/VideoUploader.tsx
'use client';

import { useState } from 'react';
import axios from 'axios';
import { 
    UploadCloud, 
    FileVideo, 
    CheckCircle, 
    Loader2, 
    X, 
    Video
} from 'lucide-react';

interface VideoUploaderProps {
    onUploadComplete: (url: string) => void;
    onUploadStart: () => void;
    onUploadError: () => void;
}

// --- IMPORTANT: UPDATE THESE VALUES ---
const CLOUDINARY_UPLOAD_PRESET = "lms_uploads"; 
const CLOUDINARY_CLOUD_NAME = "dvfszba6c"; 

export default function VideoUploader({ onUploadComplete, onUploadStart, onUploadError }: VideoUploaderProps) {
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [fileName, setFileName] = useState('');
    const [isSuccess, setIsSuccess] = useState(false);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        setIsSuccess(false);
        setFileName(file.name);
        onUploadStart();

        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

        try {
            const response = await axios.post(
                `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/video/upload`,
                formData,
                {
                    onUploadProgress: (progressEvent) => {
                        const percentCompleted = Math.round((progressEvent.loaded * 100) / (progressEvent.total || 1));
                        setProgress(percentCompleted);
                    },
                }
            );
            const { secure_url } = response.data;
            setIsSuccess(true);
            onUploadComplete(secure_url);
        } catch (err) {
            console.error("Video upload failed", err);
            setFileName(''); // Reset on error
            onUploadError();
        } finally {
            setUploading(false);
        }
    };

    const handleReset = () => {
        setFileName('');
        setIsSuccess(false);
        setProgress(0);
    };

    return (
        <div className="w-full">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                <Video className="w-4 h-4 text-indigo-500" /> Lesson Video (Optional)
            </label>

            {/* 1. IDLE STATE: Upload Zone */}
            {!uploading && !isSuccess && (
                <div className="relative group">
                    <label 
                        htmlFor="video-upload" 
                        className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl cursor-pointer bg-gray-50 dark:bg-gray-800/50 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:border-indigo-400 dark:hover:border-indigo-500 transition-all duration-300"
                    >
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                            <div className="p-2 bg-white dark:bg-gray-700 rounded-full shadow-sm mb-3 group-hover:scale-110 transition-transform">
                                <UploadCloud className="w-6 h-6 text-gray-500 dark:text-gray-400 group-hover:text-indigo-500" />
                            </div>
                            <p className="mb-1 text-sm text-gray-500 dark:text-gray-400">
                                <span className="font-semibold text-indigo-600 dark:text-indigo-400">Click to upload</span> or drag and drop
                            </p>
                            <p className="text-xs text-gray-400 dark:text-gray-500">MP4, WebM or Ogg (MAX. 100MB)</p>
                        </div>
                        <input 
                            id="video-upload" 
                            name="video-upload" 
                            type="file" 
                            className="hidden" 
                            onChange={handleFileChange} 
                            accept="video/*" 
                        />
                    </label>
                </div>
            )}

            {/* 2. UPLOADING STATE: Progress Bar */}
            {uploading && (
                <div className="p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg">
                            <Loader2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400 animate-spin" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                {fileName}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Uploading...</p>
                        </div>
                        <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">{progress}%</span>
                    </div>
                    <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                        <div 
                            className="bg-indigo-600 h-2 rounded-full transition-all duration-300 ease-out" 
                            style={{ width: `${progress}%` }} 
                        />
                    </div>
                </div>
            )}
            
            {/* 3. SUCCESS STATE: File Info & Reset */}
            {isSuccess && (
                <div className="p-4 bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 rounded-xl flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 overflow-hidden">
                        <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-full">
                            <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-900 dark:text-white truncate max-w-[200px]">
                                {fileName}
                            </p>
                            <p className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                                <FileVideo className="w-3 h-3" /> Upload successful
                            </p>
                        </div>
                    </div>
                    <button 
                        type="button"
                        onClick={handleReset}
                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-white dark:hover:bg-gray-800 rounded-full transition-all shadow-sm hover:shadow"
                        title="Remove video"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}
        </div>
    );
}