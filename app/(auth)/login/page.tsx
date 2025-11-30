// app/(auth)/login/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/firebase/config';
import Link from 'next/link';
import { 
    LogIn, 
    Mail, 
    Lock, 
    Loader2, 
    AlertCircle, 
    ArrowRight 
} from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      await signInWithEmailAndPassword(auth, email, password);
      // Redirect will happen via the Auth Context or manually here
      router.push('/dashboard');
    } catch (err: any) {
      console.error('Login error:', err);
      // Map common firebase errors to user-friendly messages
      if (err.code === 'auth/invalid-credential') {
        setError('Invalid email or password.');
      } else if (err.code === 'auth/too-many-requests') {
        setError('Too many attempts. Please try again later.');
      } else {
        setError('Failed to sign in. Please check your connection.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gray-950 flex items-center justify-center p-4 transition-colors duration-300">
        
        <div className="max-w-md w-full bg-white dark:bg-gray-900 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-800 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
            
            <div className="p-8 md:p-10">
                {/* --- Header --- */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-indigo-100 dark:bg-indigo-900/30 mb-4">
                        <LogIn className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
                        Welcome Back
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                        Enter your credentials to access your workspace.
                    </p>
                </div>

                {/* --- Error State --- */}
                {error && (
                    <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-start gap-3 text-red-600 dark:text-red-400 text-sm animate-in fade-in slide-in-from-top-2">
                        <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                        <span>{error}</span>
                    </div>
                )}

                {/* --- Form --- */}
                <form onSubmit={handleLogin} className="space-y-6">
                    
                    {/* Email Input */}
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Email Address</label>
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <Mail className="h-5 w-5 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
                            </div>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                placeholder="you@example.com"
                                className="block w-full pl-11 pr-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none"
                            />
                        </div>
                    </div>

                    {/* Password Input */}
                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Password</label>
                            <Link href="/forgot-password" className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline">
                                Forgot password?
                            </Link>
                        </div>
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <Lock className="h-5 w-5 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
                            </div>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                placeholder="••••••••"
                                className="block w-full pl-11 pr-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none"
                            />
                        </div>
                    </div>

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/30 transition-all flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" /> Signing in...
                            </>
                        ) : (
                            <>
                                Sign In <ArrowRight className="w-5 h-5" />
                            </>
                        )}
                    </button>
                </form>

                {/* --- Footer --- */}
                <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-800 text-center">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        Don't have an account yet?{' '}
                        <Link href="/signup" className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline transition-colors">
                            Sign up
                        </Link>
                    </p>
                </div>

            </div>
        </div>
    </div>
  );
}