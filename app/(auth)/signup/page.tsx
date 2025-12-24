// app/(auth)/signup/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '@/firebase/config';
import ImageUploader from '@/components/ImageUploader';
import { 
    User, 
    Briefcase, 
    Save, 
    Loader2, 
    ArrowRight, 
    ArrowLeft, 
    CheckCircle,
    Mail,
    Lock
} from 'lucide-react';
import Link from 'next/link';

type UserRole = 'student' | 'educator';

export default function SignUpPage() {
    const router = useRouter();
    
    // --- State Management ---
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState<UserRole>('student');
    const [error, setError] = useState('');

    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [displayName, setDisplayName] = useState('');
    const [photoURL, setPhotoURL] = useState('');

    const [step, setStep] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleNextStep = (e: React.FormEvent) => {
        e.preventDefault();
        if (password.length < 6) {
            setError('Password must be at least 6 characters long.');
            return;
        }
        setError('');
        setStep(2);
    };

    const handleFinalSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!firstName || !lastName || !displayName) {
            setError('Please fill out your first name, last name, and display name.');
            return;
        }
        setIsSubmitting(true);
        setError('');

        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            await setDoc(doc(db, "users", user.uid), {
                uid: user.uid,
                email: user.email,
                role: role,
                enrolledCourses: [],
                firstName,
                lastName,
                displayName,
                photoURL,
                headline: '',
                aboutMe: '',
                socials: { github: '', twitter: '', website: '' },
                walletAddress: ''
            });
            
            router.push('/dashboard');

        } catch (error: any) {
            console.error('Error signing up:', error);
            setError(error.message);
            setStep(1);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-gray-950 flex items-center justify-center p-4 transition-colors duration-300">
            <div className="max-w-lg w-full bg-white dark:bg-gray-900 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-800 overflow-hidden transition-all duration-300">
                
                {/* --- Progress Bar --- */}
                <div className="h-1.5 w-full bg-gray-100 dark:bg-gray-800">
                    <div 
                        className="h-full bg-indigo-600 transition-all duration-500 ease-in-out" 
                        style={{ width: step === 1 ? '50%' : '100%' }} 
                    />
                </div>

                <div className="p-8 md:p-10">
                    
                    {/* --- Header --- */}
                    <div className="text-center mb-8">
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
                            {step === 1 ? 'Create Account' : 'Complete Profile'}
                        </h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                            {step === 1 ? 'Join our learning community today.' : 'Tell us a bit more about yourself.'}
                        </p>
                    </div>

                    {/* --- Error Message --- */}
                    {error && (
                        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-3 text-red-600 dark:text-red-400 text-sm">
                            <div className="p-1 bg-white dark:bg-red-900 rounded-full">
                                <span className="block w-1.5 h-1.5 bg-red-500 rounded-full" />
                            </div>
                            {error}
                        </div>
                    )}

                    {step === 1 && (
                        <form onSubmit={handleNextStep} className="space-y-6">
                            
                            {/* Role Selector */}
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">I am a...</label>
                                <div className="grid grid-cols-2 gap-2 bg-gray-100 dark:bg-gray-800 p-1.5 rounded-2xl">
                                    <button 
                                        type="button" 
                                        onClick={() => setRole('student')} 
                                        className={`flex items-center justify-center gap-2 p-3 rounded-xl text-sm font-semibold transition-all duration-200 ${role === 'student' ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
                                    >
                                        <User className="w-4 h-4" /> Student
                                    </button>
                                    <button 
                                        type="button" 
                                        onClick={() => setRole('educator')} 
                                        className={`flex items-center justify-center gap-2 p-3 rounded-xl text-sm font-semibold transition-all duration-200 ${role === 'educator' ? 'bg-white dark:bg-gray-700 text-purple-600 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
                                    >
                                        <Briefcase className="w-4 h-4" /> Educator
                                    </button>
                                </div>
                            </div>

                            {/* Email */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email Address</label>
                                <div className="relative">
                                    <Mail className="absolute left-4 top-3.5 w-5 h-5 text-gray-400" />
                                    <input 
                                        type="email" 
                                        value={email} 
                                        onChange={(e) => setEmail(e.target.value)} 
                                        required 
                                        placeholder="you@example.com"
                                        className="w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none" 
                                    />
                                </div>
                            </div>

                            {/* Password */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Password</label>
                                <div className="relative">
                                    <Lock className="absolute left-4 top-3.5 w-5 h-5 text-gray-400" />
                                    <input 
                                        type="password" 
                                        value={password} 
                                        onChange={(e) => setPassword(e.target.value)} 
                                        required 
                                        placeholder="••••••••"
                                        className="w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none" 
                                    />
                                </div>
                                <p className="text-xs text-gray-500 mt-2 ml-1">Must be at least 6 characters.</p>
                            </div>

                            <button 
                                type="submit" 
                                className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/30 transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
                            >
                                Next Step <ArrowRight className="w-5 h-5" />
                            </button>

                            <p className="text-center text-sm text-gray-600 dark:text-gray-400">
                                Already have an account? <Link href="/login" className="text-indigo-600 hover:underline font-semibold">Log in</Link>
                            </p>
                        </form>
                    )}

                    {step === 2 && (
                        <form onSubmit={handleFinalSubmit} className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-300">
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">First Name*</label>
                                    <input 
                                        type="text" 
                                        value={firstName} 
                                        onChange={(e) => setFirstName(e.target.value)} 
                                        required 
                                        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none" 
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Last Name*</label>
                                    <input 
                                        type="text" 
                                        value={lastName} 
                                        onChange={(e) => setLastName(e.target.value)} 
                                        required 
                                        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none" 
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Display Name*</label>
                                <input 
                                    type="text" 
                                    value={displayName} 
                                    onChange={(e) => setDisplayName(e.target.value)} 
                                    required 
                                    placeholder="How should we call you?"
                                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none" 
                                />
                            </div>

                            <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Profile Picture</label>
                                <div className="flex items-center gap-4">
                                    <div className="flex-1">
                                        <ImageUploader onUploadComplete={setPhotoURL} />
                                    </div>
                                    {photoURL && (
                                        <img src={photoURL} alt="Preview" className="w-16 h-16 rounded-full object-cover border-2 border-indigo-500" />
                                    )}
                                </div>
                            </div>
                            
                            <div className="flex gap-3 pt-2">
                                <button 
                                    type="button" 
                                    onClick={() => setStep(1)} 
                                    className="flex-1 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-semibold rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center justify-center gap-2"
                                >
                                    <ArrowLeft className="w-4 h-4" /> Back
                                </button>
                                <button 
                                    type="submit" 
                                    disabled={isSubmitting} 
                                    className="flex-[2] py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/30 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed active:scale-[0.98]"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <Loader2 className="w-5 h-5 animate-spin" /> Creating...
                                        </>
                                    ) : (
                                        <>
                                            Complete Setup <CheckCircle className="w-5 h-5" />
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}