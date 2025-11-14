// app/(student)/settings/page.tsx
'use client';

import { useState } from 'react';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '@/firebase/config';
import useAuth from '@/hooks/useAuth';

export default function SettingsPage() {
    const { user } = useAuth();
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handlePasswordReset = async () => {
        if (!user || !user.email) {
            setError('Could not find a valid user email to send a reset link.');
            return;
        }

        setIsSubmitting(true);
        setMessage('');
        setError('');

        try {
            await sendPasswordResetEmail(auth, user.email);
            setMessage(`A password reset link has been sent to ${user.email}. Please check your inbox.`);
        } catch (err: any) {
            console.error("Password reset error:", err);
            setError(`Failed to send reset email: ${err.message}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div>
            <h1 className="text-3xl font-bold mb-6">Settings</h1>

            <div className="max-w-xl p-6 bg-white shadow-md rounded-lg">
                <h2 className="text-xl font-semibold">Account Management</h2>
                <div className="mt-4 border-t pt-4">
                    <p className="text-sm font-medium text-gray-700">Change Your Password</p>
                    <p className="text-sm text-gray-500 mb-2">
                        Click the button below to send a password reset link to your email.
                    </p>

                    <button
                        onClick={handlePasswordReset}
                        disabled={isSubmitting}
                        className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:bg-gray-400"
                    >
                        {isSubmitting ? 'Sending...' : 'Send Password Reset Email'}
                    </button>
                    
                    {message && <p className="text-sm font-medium text-green-600 mt-2">{message}</p>}
                    {error && <p className="text-sm font-medium text-red-500 mt-2">{error}</p>}
                </div>

                {/* You can add more settings here in the future, like notification preferences */}
            </div>
        </div>
    );
}