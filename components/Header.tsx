// components/Header.tsx
'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase/config'; // Adjust path if needed
import useAuth from '../hooks/useAuth'; // Adjust path if needed

export default function Header() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      console.log('User logged out successfully');
      router.push('/login'); // Redirect to login page after logout
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  return (
    <header className="w-full bg-white shadow-md">
      <nav className="container mx-auto px-6 py-4 flex justify-between items-center">
        <Link href="/" className="text-xl font-bold text-indigo-600">
          BlockchainLMS
        </Link>

         <Link href="/courses" className="text-gray-700 hover:text-indigo-600 font-semibold">
            Courses
         </Link>
        
        <div className="flex items-center space-x-4">
          {loading ? (
            <div className="text-gray-500">Loading...</div>
          ) : user ? (
            <>
              <span className="text-gray-700">Welcome, {user.email}</span>
              <button
                onClick={handleLogout}
                className="px-4 py-2 font-medium text-white bg-red-500 rounded-md hover:bg-red-600"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="text-gray-700 hover:text-indigo-600">
                Login
              </Link>
              <Link href="/signup" className="px-4 py-2 font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700">
                Sign Up
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}