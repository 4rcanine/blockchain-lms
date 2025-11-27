// components/Header.tsx
'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { auth } from '@/firebase/config';
import useAuth from '@/hooks/useAuth';
import Image from 'next/image';
import { LogOut, User, LogIn, ArrowRight } from 'lucide-react';

export default function Header() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      console.log('User logged out successfully');
      router.push('/login');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  return (
    // FIX: Sticky header with glassmorphism effect
    <header className="sticky top-0 z-40 w-full border-b border-gray-100 dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          
          {/* Left Side: Logo */}
          <div className="flex-shrink-0">
            <Link href="/dashboard" className="flex items-center gap-2 group">
              <Image
                src="/logo5.png"
                alt="BlockchainLMS Logo"
                width={140}  
                height={40} 
                priority
                className="h-10 w-auto transition-transform duration-300 group-hover:scale-105" 
              />
            </Link>
          </div>

          {/* Right Side: Auth & User Controls */}
          <div className="flex items-center gap-4">
            {loading ? (
              // Loading Skeleton
              <div className="flex items-center gap-3 animate-pulse">
                <div className="h-8 w-24 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
                <div className="h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
              </div>
            ) : user ? (
              <div className="flex items-center gap-3 md:gap-5">
                
                {/* User Info (Hidden on mobile) */}
                <div className="hidden md:flex flex-col items-end text-right">
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Signed in as</span>
                    <span className="text-sm font-semibold text-gray-900 dark:text-white truncate max-w-[150px]">
                        {user.displayName || user.email}
                    </span>
                </div>

                <div className="flex items-center gap-3 pl-3 border-l border-gray-200 dark:border-gray-700">
                    {/* Profile Picture */}
                    <Link 
                        href="/profile" 
                        className="relative group focus:outline-none"
                    >
                        {user.photoURL ? (
                        <img
                            src={user.photoURL}
                            alt="Profile"
                            className="h-9 w-9 rounded-full object-cover ring-2 ring-gray-100 dark:ring-gray-700 group-hover:ring-indigo-500 transition-all"
                        />
                        ) : (
                        <div className="h-9 w-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm ring-2 ring-gray-100 dark:ring-gray-700 group-hover:ring-indigo-500 transition-all shadow-md">
                            {user.email?.[0].toUpperCase()}
                        </div>
                        )}
                    </Link>

                    {/* Logout Button */}
                    <button
                        onClick={handleLogout}
                        title="Log out"
                        className="p-2 text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-all active:scale-95"
                    >
                        <LogOut className="w-5 h-5" />
                    </button>
                </div>
              </div>
            ) : (
              // Logged Out State
              <div className="flex items-center gap-3">
                <Link
                  href="/login"
                  className="text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-white transition-colors px-3 py-2"
                >
                  Log in
                </Link>
                <Link
                  href="/signup"
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-full shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/40 transition-all active:scale-95"
                >
                  Sign Up <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}