// app/(admin)/layout.tsx
'use client';

import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import useAuth from '../../hooks/useAuth';
import { db } from '../../firebase/config';
import { 
    Users, 
    Tag, 
    LayoutDashboard, 
    BookOpen, 
    Settings, 
    User, 
    Activity, 
    Loader2 
} from 'lucide-react'; // Added icons

// --- Admin Navigation Links ---
const adminNavItems = [
    { name: 'Dashboard', href: '/admin/dashboard', icon: Activity },
    { name: 'User Management', href: '/admin/users', icon: Users },
    { name: 'Course Management', href: '/admin/courses', icon: BookOpen },
    { name: 'Tag Management', href: '/admin/tags', icon: Tag },
    { name: 'Profile', href: '/admin/profile', icon: User },
    { name: 'Settings', href: '/admin/settings', icon: Settings },
];

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
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

    if (authLoading || !user) {
         return <div className="text-center mt-10">Loading authentication...</div>;
    }
    
    if (!isAuthorized) {
        return <div className="text-center mt-10 p-4">Verifying privileges...</div>;
    }

    const activeClasses = "flex items-center gap-3 p-3 rounded-xl bg-indigo-600 text-white font-semibold shadow-md";
    const inactiveClasses = "flex items-center gap-3 p-3 rounded-xl text-gray-700 hover:bg-gray-100 transition-colors";

    return (
        <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
            {/* --- FIXED SIDEBAR (250px) --- */}
            <aside className="w-[250px] flex-shrink-0 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 p-4 flex flex-col">
                
                <h1 className="text-2xl font-extrabold text-indigo-600 dark:text-indigo-400 mb-8">
                    Admin
                </h1>

                <nav className="space-y-2 flex-grow">
                    {adminNavItems.map((item) => {
                        const isActive = pathname.startsWith(item.href);
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={isActive ? activeClasses : inactiveClasses}
                            >
                                <item.icon className="w-5 h-5" />
                                <span className="text-sm">{item.name}</span>
                            </Link>
                        );
                    })}
                </nav>
                
                <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
                    <Link href="/dashboard" className="w-full py-2.5 text-center text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-indigo-600 transition-colors">
                        ← Back to Main Dashboard
                    </Link>
                </div>
            </aside>

            {/* --- MAIN CONTENT AREA --- */}
            <main className="flex-1 overflow-y-auto p-8">
                {children}
            </main>
        </div>
    );
}