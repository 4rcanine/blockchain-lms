// components/Header.tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/firebase/config';
import useAuth from '@/hooks/useAuth';
import Image from 'next/image';
import { LogOut, ArrowRight } from 'lucide-react';

export default function Header() {
  const { user, loading } = useAuth();
  const router = useRouter();
  
  // Default to dashboard (the traffic cop) until we know the role
  const [profileUrl, setProfileUrl] = useState('/dashboard');

  // --- FIX: Fetch Role to determine correct Profile Link ---
  useEffect(() => {
    const fetchUserRole = async () => {
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            const role = userDoc.data().role;
            // Set the specific path based on role
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

  return (
    <header className="sticky top-0 z-40 w-full border-b border-gray-100 dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-20 items-center justify-between">
          
          {/* Left Side: Logo */}
          <div className="flex-shrink-0">
            <Link href="/dashboard" className="flex items-center gap-2 group">
              <Image
                src="/logo5.png"
                alt="BlockchainLMS Logo"
                width={160}  
                height={48} 
                priority
                className="h-12 w-auto transition-transform duration-300 group-hover:scale-105" 
              />
            </Link>
          </div>

          {/* Right Side: Auth & User Controls */}
          <div className="flex items-center gap-4">
            {loading ? (
              <div className="flex items-center gap-3 animate-pulse">
                <div className="h-10 w-24 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
                <div className="h-10 w-10 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
              </div>
            ) : user ? (
              <div className="flex items-center gap-3 md:gap-6">
                
                <div className="hidden md:flex flex-col items-end text-right">
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Signed in as</span>
                    <span className="text-sm font-bold text-gray-900 dark:text-white truncate max-w-[150px]">
                        {user.displayName || user.email}
                    </span>
                </div>

                <div className="flex items-center gap-3 pl-4 border-l border-gray-200 dark:border-gray-700 h-10">
                    {/* FIX: Updated href to use dynamic profileUrl */}
                    <Link 
                        href={profileUrl} 
                        className="relative group focus:outline-none"
                    >
                        {user.photoURL ? (
                        <img
                            src={user.photoURL}
                            alt="Profile"
                            className="h-10 w-10 rounded-full object-cover ring-2 ring-gray-100 dark:ring-gray-700 group-hover:ring-indigo-500 transition-all"
                        />
                        ) : (
                        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm ring-2 ring-gray-100 dark:ring-gray-700 group-hover:ring-indigo-500 transition-all shadow-md">
                            {user.email?.[0].toUpperCase()}
                        </div>
                        )}
                    </Link>

                    <button
                        onClick={handleLogout}
                        title="Log out"
                        className="p-2.5 text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-all active:scale-95"
                    >
                        <LogOut className="w-5 h-5" />
                    </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Link
                  href="/login"
                  className="text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-white transition-colors px-4 py-2"
                >
                  Log in
                </Link>
                <Link
                  href="/signup"
                  className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-full shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/40 transition-all active:scale-95"
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