// components/BackButton.tsx
'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react'; // Using an icon for a clean look

export default function BackButton() {
    const router = useRouter();

    // The router.back() function is a built-in Next.js feature
    // that navigates to the previous page in the browser's history stack.
    const handleBack = () => {
        router.back();
    };

    return (
        <button
            onClick={handleBack}
            className="flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white transition-colors mb-6"
        >
            <ArrowLeft className="w-4 h-4" />
            Back
        </button>
    );
}