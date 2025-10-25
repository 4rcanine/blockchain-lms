// components/AddContentModal.tsx
'use client';
import { useState } from 'react';
import axios from 'axios';

interface AddContentModalProps {
    onClose: () => void;
    onContentAdded: (markdown: string) => void;
}

// --- IMPORTANT: UPDATE THESE VALUES ---
const CLOUDINARY_UPLOAD_PRESET = "lms_uploads"; // The name of the unsigned preset you just created
const CLOUDINARY_CLOUD_NAME = "dvfszba6c"; 

export default function AddContentModal({ onClose, onContentAdded }: AddContentModalProps) {
    const [file, setFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState('');

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
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
            // This posts directly to the Cloudinary API
            const response = await axios.post(
                `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/upload`,
                formData
            );
            
            const { secure_url, resource_type } = response.data;
            let markdown = '';
            if (resource_type === 'image') {
                markdown = `![Image](${secure_url})`;
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
                <h2 className="text-xl font-bold mb-4">Add Content</h2>
                <p className="text-sm text-gray-600 mb-4">Upload an image or a document (PDF, DOCX, etc).</p>
                <input type="file" onChange={handleFileChange} className="w-full border p-2 rounded-md" />
                {error && <p className="text-red-500 mt-2">{error}</p>}
                <div className="mt-4 flex justify-end gap-2">
                    <button onClick={onClose} className="px-4 py-2 bg-gray-200 rounded-md">Cancel</button>
                    <button onClick={handleUpload} disabled={!file || uploading} className="px-4 py-2 bg-indigo-600 text-white rounded-md disabled:bg-gray-400">
                        {uploading ? 'Uploading...' : 'Upload & Insert'}
                    </button>
                </div>
            </div>
        </div>
    );
}