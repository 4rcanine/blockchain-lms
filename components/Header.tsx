// components/Header.tsx
'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase/config';
import useAuth from '../hooks/useAuth';

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
    <header className="w-full bg-white shadow-md">
      <nav className="container mx-auto px-6 py-3 flex justify-between items-center">
        <div className="flex items-center space-x-6">
          <Link href="/" className="text-xl font-bold text-indigo-600">
            BlockchainLMS
          </Link>
        </div>

        <div className="flex items-center space-x-4">
          {loading ? (
            <div className="text-gray-500">...</div>
          ) : user ? (
            <>
              <span className="text-gray-700 hidden sm:block">
                Welcome, {user.displayName || user.email}
              </span>
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition"
              >
                Logout
              </button>

              {/* --- Profile Picture --- */}
              <Link href="/profile">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt="Profile"
                    className="h-10 w-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="h-10 w-10 rounded-full bg-indigo-500 flex items-center justify-center text-white font-bold">
                    {user.email?.[0].toUpperCase()}
                  </div>
                )}
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition"
              >
                Login
              </Link>
              <Link
                href="/signup"
                className="px-4 py-2 border border-indigo-500 text-indigo-600 rounded-lg hover:bg-indigo-50 transition"
              >
                Sign Up
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
