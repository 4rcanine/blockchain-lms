// app/(student)/settings/page.tsx
'use client';

import { useState } from 'react';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '@/firebase/config';
import useAuth from '@/hooks/useAuth';
import { useTheme } from '@/contexts/ThemeContext';
import { 
    Moon, 
    Sun, 
    Shield, 
    KeyRound, 
    Loader2, 
    CheckCircle, 
    AlertCircle,
    Palette
} from 'lucide-react';

export default function SettingsPage() {
    const { user } = useAuth();
    const { theme, toggleTheme } = useTheme();
    
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
            setMessage(`Link sent to ${user.email}`);
        } catch (err: any) {
            console.error("Password reset error:", err);
            setError(err.message || 'Failed to send reset email.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            {/* --- Header --- */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Settings</h1>
                <p className="text-gray-500 dark:text-gray-400 mt-2">
                    Manage your preferences and account security.
                </p>
            </div>

            <div className="grid gap-6">
                
                {/* --- 1. Appearance Section --- */}
                <section className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                    <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex items-center gap-3">
                        <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                            <Palette className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Appearance</h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Customize how the application looks.</p>
                        </div>
                    </div>
                    
                    <div className="p-6 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className={`p-3 rounded-full ${theme === 'dark' ? 'bg-gray-700' : 'bg-orange-100'}`}>
                                {theme === 'dark' ? (
                                    <Moon className="w-6 h-6 text-blue-300" />
                                ) : (
                                    <Sun className="w-6 h-6 text-orange-500" />
                                )}
                            </div>
                            <div>
                                <p className="font-medium text-gray-900 dark:text-white">Interface Theme</p>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    Currently using <span className="font-bold capitalize">{theme}</span> mode
                                </p>
                            </div>
                        </div>

                        {/* Custom Toggle Switch */}
                        <button
                            onClick={toggleTheme}
                            className={`
                                relative inline-flex h-8 w-14 items-center rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2
                                ${theme === 'dark' ? 'bg-indigo-600' : 'bg-gray-200'}
                            `}
                        >
                            <span className="sr-only">Toggle theme</span>
                            <span
                                className={`
                                    inline-block h-6 w-6 transform rounded-full bg-white shadow-md transition-transform duration-300
                                    ${theme === 'dark' ? 'translate-x-7' : 'translate-x-1'}
                                `}
                            />
                        </button>
                    </div>
                </section>

                {/* --- 2. Security Section --- */}
                <section className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                    <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex items-center gap-3">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                            <Shield className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Security</h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Manage your password and account access.</p>
                        </div>
                    </div>

                    <div className="p-6">
                        <div className="flex items-start gap-4 mb-6">
                            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-full">
                                <KeyRound className="w-6 h-6 text-gray-600 dark:text-gray-300" />
                            </div>
                            <div>
                                <h3 className="font-medium text-gray-900 dark:text-white">Password Reset</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 max-w-md">
                                    We will send a secure link to <strong>{user?.email}</strong> to reset your password.
                                </p>
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                            <button
                                onClick={handlePasswordReset}
                                disabled={isSubmitting}
                                className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Sending Email...
                                    </>
                                ) : (
                                    'Send Reset Link'
                                )}
                            </button>

                            {/* Feedback Messages */}
                            {message && (
                                <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 dark:bg-green-900/20 px-3 py-2 rounded-md">
                                    <CheckCircle className="w-4 h-4" />
                                    {message}
                                </div>
                            )}
                            {error && (
                                <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-md">
                                    <AlertCircle className="w-4 h-4" />
                                    {error}
                                </div>
                            )}
                        </div>
                    </div>
                </section>

            </div>
        </div>
    );
}