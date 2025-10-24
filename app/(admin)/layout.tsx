// app/(admin)/layout.tsx
'use client';

import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import useAuth from '../../hooks/useAuth'; // Adjust path if needed
import { db } from '../../firebase/config'; // Adjust path if needed

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    // --- PART 1: Authorization Logic from Phase 8 ---
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    // This is the line that was missing!
    const [isAuthorized, setIsAuthorized] = useState(false);

    useEffect(() => {
        if (authLoading) return; // Wait until auth state is determined
        if (!user) {
            router.push('/login'); // Not logged in, redirect
            return;
        }

        // Check the user's role from Firestore
        const checkAdminRole = async () => {
            const userDocRef = doc(db, 'users', user.uid);
            const userDocSnap = await getDoc(userDocRef);
            if (userDocSnap.exists() && userDocSnap.data().role === 'admin') {
                setIsAuthorized(true);
            } else {
                router.push('/dashboard'); // Not an admin, redirect to dashboard
            }
        };

        checkAdminRole();
    }, [user, authLoading, router]);

    // --- PART 2: Navigation UI Logic from Phase 9 ---
    const pathname = usePathname(); // Hook to get the current URL path

    // Show a loading state until authorization is confirmed
    if (!isAuthorized) {
        return <div>Verifying admin privileges...</div>;
    }

    // Styles for our navigation links
    const activeLink = "px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-md";
    const inactiveLink = "px-4 py-2 text-sm font-semibold text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-md";

    // --- PART 3: The Combined Return Statement ---
    return (
        <div>
            {/* Admin Navigation */}
            <div className="mb-6">
                <h1 className="text-3xl font-bold">Admin Panel</h1>
                <nav className="flex items-center space-x-4 mt-4">
                    <Link href="/admin/users" className={pathname === '/admin/users' ? activeLink : inactiveLink}>
                        User Management
                    </Link>
                    <Link href="/admin/tags" className={pathname === '/admin/tags' ? activeLink : inactiveLink}>
                        Tag Management
                    </Link>
                </nav>
            </div>
            <hr className="mb-6"/>
            
            {/* Page Content */}
            <div>
                {children}
            </div>
        </div>
    );
}