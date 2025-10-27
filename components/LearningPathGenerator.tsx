// components/LearningPathGenerator.tsx
'use client';
import { useState } from 'react';
import axios from 'axios';

interface LearningPathGeneratorProps {
    onPathGenerated: (path: string[]) => void;
}

export default function LearningPathGenerator({ onPathGenerated }: LearningPathGeneratorProps) {
    const [prompt, setPrompt] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!prompt.trim()) return;
        setIsLoading(true);
        setError('');

        try {
            // We call our OWN backend endpoint, not Google's directly
            const response = await axios.post('/api/generate-learning-path', { prompt });
            const { path } = response.data;
            if (path && Array.isArray(path)) {
                onPathGenerated(path); // Send the generated path back to the parent component
            } else {
                throw new Error("Invalid path format received from AI.");
            }
        } catch (err) {
            console.error(err);
            setError('Could not generate a learning path. Please try a different topic.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="p-6 bg-indigo-50 rounded-lg shadow-inner text-center">
            <h2 className="text-2xl font-bold mb-2">Let's Personalize Your Learning!</h2>
            <p className="text-gray-600 mb-4">What do you want to learn about in the world of Web3?</p>
            <form onSubmit={handleSubmit} className="flex flex-col items-center gap-2">
                <input
                    type="text"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="e.g., How to build a dApp, NFT art, or DeFi concepts"
                    className="w-full max-w-lg p-3 border rounded-md"
                />
                <button type="submit" disabled={isLoading} className="px-6 py-3 font-bold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:bg-gray-400">
                    {isLoading ? 'Generating Path...' : 'Create My Learning Path'}
                </button>
                {error && <p className="text-red-500 mt-2">{error}</p>}
            </form>
        </div>
    );
}