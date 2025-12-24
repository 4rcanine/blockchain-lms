// app/(admin)/layout.tsx
'use client';

import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import useAuth from '../../hooks/useAuth'; 
import { db } from '../../firebase/config';

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const [isAuthorized, setIsAuthorized] = useState(false);

    useEffect(() => {
        if (authLoading) return; 
        if (!user) {
            router.push('/login');
            return;
        }

        const checkAdminRole = async () => {
            const userDocRef = doc(db, 'users', user.uid);
            const userDocSnap = await getDoc(userDocRef);
            if (userDocSnap.exists() && userDocSnap.data().role === 'admin') {
                setIsAuthorized(true);
            } else {
                router.push('/dashboard');
            }
        };

        checkAdminRole();
    }, [user, authLoading, router]);

    const pathname = usePathname();

    if (!isAuthorized) {
        return <div>Verifying admin privileges...</div>;
    }

    const activeLink = "px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-md";
    const inactiveLink = "px-4 py-2 text-sm font-semibold text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-md";

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