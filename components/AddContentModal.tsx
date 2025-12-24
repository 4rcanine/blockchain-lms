// components/AddContentModal.tsx
'use client';

import { useState, useRef } from 'react';
import axios from 'axios';
import { 
    UploadCloud, 
    X, 
    FileText, 
    Image as ImageIcon, 
    Loader2, 
    CheckCircle 
} from 'lucide-react';

interface AddContentModalProps {
    onClose: () => void;
    onContentAdded: (markdown: string) => void;
}

// --- CONFIGURATION ---
const CLOUDINARY_UPLOAD_PRESET = "lms_uploads"; 
const CLOUDINARY_CLOUD_NAME = "dvfszba6c"; 

export default function AddContentModal({ onClose, onContentAdded }: AddContentModalProps) {
    const [file, setFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState('');
    const [dragActive, setDragActive] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    // Handle Drag Events
    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            setFile(e.dataTransfer.files[0]);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    const handleUpload = async () => {
        if (!file) return;
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
            
            const { secure_url, resource_type, original_filename } = response.data;
            let markdown = '';
            
            // Smart Markdown formatting
            if (resource_type === 'image') {
                markdown = `![${original_filename}](${secure_url})`;
            } else if (resource_type === 'video') {
                 markdown = `[Watch Video: ${original_filename}](${secure_url})`;
            } else {
                markdown = `[Download ${file.name}](${secure_url})`;
            }
            
            onContentAdded(markdown);
            onClose();

        } catch (err) {
            console.error("Upload failed", err);
            setError("Upload failed. Please try again.");
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-opacity">
            <div 
                className="bg-white dark:bg-gray-800 w-full max-w-md rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden transform transition-all scale-100"
                role="dialog"
            >
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white">Add Content</h2>
                    <button 
                        onClick={onClose}
                        className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6">
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                        Upload an image to embed it, or a document (PDF, DOCX) to create a download link.
                    </p>

                    {/* Drop Zone */}
                    <div 
                        className={`
                            relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200
                            ${dragActive 
                                ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' 
                                : 'border-gray-300 dark:border-gray-600 hover:border-indigo-400 dark:hover:border-indigo-500 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                            }
                        `}
                        onDragEnter={handleDrag}
                        onDragLeave={handleDrag}
                        onDragOver={handleDrag}
                        onDrop={handleDrop}
                        onClick={() => inputRef.current?.click()}
                    >
                        <input 
                            ref={inputRef}
                            type="file" 
                            className="hidden" 
                            onChange={handleFileChange} 
                        />
                        
                        {!file ? (
                            <div className="flex flex-col items-center">
                                <div className="p-3 bg-indigo-100 dark:bg-indigo-900/50 rounded-full mb-3 text-indigo-600 dark:text-indigo-400">
                                    <UploadCloud className="w-8 h-8" />
                                </div>
                                <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                                    Click to upload <span className="font-normal text-gray-500">or drag and drop</span>
                                </p>
                                <p className="text-xs text-gray-400 mt-1">SVG, PNG, JPG, PDF, DOCX</p>
                            </div>
                        ) : (
                            <div className="flex items-center gap-4 bg-indigo-50 dark:bg-indigo-900/20 p-3 rounded-lg border border-indigo-100 dark:border-indigo-800">
                                <div className="p-2 bg-white dark:bg-gray-800 rounded-md shadow-sm text-indigo-600 dark:text-indigo-400">
                                    {file.type.startsWith('image/') ? <ImageIcon className="w-6 h-6" /> : <FileText className="w-6 h-6" />}
                                </div>
                                <div className="text-left flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                        {file.name}
                                    </p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                        {(file.size / 1024).toFixed(1)} KB
                                    </p>
                                </div>
                                <button 
                                    onClick={(e) => { e.stopPropagation(); setFile(null); }}
                                    className="p-1 text-gray-400 hover:text-red-500 hover:bg-white dark:hover:bg-gray-800 rounded-full transition-colors"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        )}
                    </div>

                    {error && (
                        <p className="text-red-500 text-sm mt-3 flex items-center gap-1">
                            <X className="w-4 h-4" /> {error}
                        </p>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900 border-t border-gray-100 dark:border-gray-700 flex justify-end gap-3">
                    <button 
                        onClick={onClose} 
                        className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={handleUpload} 
                        disabled={!file || uploading} 
                        className="px-6 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {uploading ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" /> Uploading...
                            </>
                        ) : (
                            <>
                                Insert <CheckCircle className="w-4 h-4" />
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}