// components/Header.tsx
'use client';

import { useState, useEffect } from 'react'; // Added useState
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/firebase/config';
import useAuth from '@/hooks/useAuth';
import Image from 'next/image';
import { useTheme } from '@/contexts/ThemeContext';
import { 
    LogOut, 
    ArrowRight, 
    Search, 
    Sun, 
    Moon, 
    Command 
} from 'lucide-react';

export default function Header() {
  const { user, loading } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const router = useRouter();
  
  const [profileUrl, setProfileUrl] = useState('/dashboard');
  const [searchQuery, setSearchQuery] = useState(''); // 1. State for search

  useEffect(() => {
    const fetchUserRole = async () => {
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            const role = userDoc.data().role;
            if (role === 'educator') {
                setProfileUrl('/educator/profile');
            } else {
                setProfileUrl('/student/profile');
            }
          }
        } catch (error) {
          console.error("Error fetching role:", error);
        }
      }
    };

    fetchUserRole();
  }, [user]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push('/login');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  // 2. Handle Search Submission
  const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
        // Redirect to the course catalog with the query param
        router.push(`/courses?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-gray-200/50 dark:border-gray-800/50 bg-white/80 dark:bg-gray-950/80 backdrop-blur-xl transition-all duration-300">
      <div className="w-full px-6 md:px-8">
        <div className="flex h-20 items-center justify-between">
          
          {/* --- LEFT: Logo --- */}
          <div className="flex-shrink-0 flex items-center gap-8">
            <Link href="/dashboard" className="flex items-center gap-2 group relative">
                <div className="absolute -inset-2 bg-indigo-500/20 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <Image
                    src="/logo5.png"
                    alt="BlockchainLMS Logo"
                    width={160}  
                    height={48} 
                    priority
                    className="h-11 w-auto relative z-10 transition-transform duration-300 group-hover:scale-[1.02]" 
                />
            </Link>
          </div>

          {/* --- CENTER: Search Bar --- */}
          {user && (
              <div className="hidden md:flex flex-1 max-w-md mx-8">
                  <div className="relative w-full group">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Search className="h-4 w-4 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
                      </div>
                      <input 
                          type="text" 
                          value={searchQuery} // Bind value
                          onChange={(e) => setSearchQuery(e.target.value)} // Update state
                          onKeyDown={handleSearch} // Listen for Enter key
                          placeholder="Search courses, lessons..." 
                          className="block w-full pl-10 pr-12 py-2.5 border border-gray-200 dark:border-gray-800 rounded-full leading-5 bg-gray-50/50 dark:bg-gray-900/50 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all sm:text-sm"
                      />
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                          <span className="text-xs text-gray-400 border border-gray-200 dark:border-gray-700 rounded px-1.5 py-0.5 flex items-center gap-1">
                              <Command className="w-3 h-3" /> K
                          </span>
                      </div>
                  </div>
              </div>
          )}

          {/* --- RIGHT: Controls (Rest remains the same) --- */}
          <div className="flex items-center gap-3 sm:gap-6">
            <button 
                onClick={toggleTheme}
                className="p-2.5 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors focus:outline-none"
                aria-label="Toggle Theme"
            >
                {theme === 'dark' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
            </button>

            <div className="h-8 w-px bg-gray-200 dark:bg-gray-800 hidden sm:block" />

            {loading ? (
              <div className="flex items-center gap-3 animate-pulse">
                <div className="h-9 w-9 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
                <div className="hidden sm:block h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded"></div>
              </div>
            ) : user ? (
              <div className="flex items-center gap-4">
                <div className="hidden lg:block text-right">
                    <p className="text-sm font-bold text-gray-900 dark:text-white truncate max-w-[150px]">
                        {user.displayName}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[150px]">
                        {user.email}
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <Link href={profileUrl} className="relative group">
                        <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full opacity-0 group-hover:opacity-100 transition duration-500 blur-sm" />
                        {user.photoURL ? (
                        <img
                            src={user.photoURL}
                            alt="Profile"
                            className="relative h-10 w-10 rounded-full object-cover border-2 border-white dark:border-gray-900"
                        />
                        ) : (
                        <div className="relative h-10 w-10 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-sm border-2 border-white dark:border-gray-900">
                            {user.email?.[0].toUpperCase()}
                        </div>
                        )}
                    </Link>
                    
                    <button
                        onClick={handleLogout}
                        className="p-2.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all"
                        title="Sign Out"
                    >
                        <LogOut className="w-5 h-5" />
                    </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Link href="/login" className="text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-white transition-colors px-4 py-2">
                  Log in
                </Link>
                <Link href="/signup" className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-full shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/40 transition-all active:scale-95">
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