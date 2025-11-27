// app/(educator)/layout.tsx
'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/firebase/config';
import useAuth from '@/hooks/useAuth';
import { 
    LayoutDashboard, 
    BookCopy, 
    Bell, 
    UserCircle, 
    PlusSquare,
    PenTool,
    Settings
} from 'lucide-react';

const sidebarNavLinks = [
    { name: 'Dashboard', href: '/educator/dashboard', icon: LayoutDashboard },
    { name: 'My Courses', href: '/courses/my-courses', icon: BookCopy },
    { name: 'Create Course', href: '/courses/create', icon: PlusSquare },
    { name: 'Notifications', href: '/notifications', icon: Bell },
    { name: 'My Profile', href: '/educator/profile', icon: UserCircle },
    { name: 'Settings', href: '/educator/settings', icon: Settings },
];

export default function EducatorLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
    const { user } = useAuth();
    const pathname = usePathname();
    const [unreadCount, setUnreadCount] = useState(0);

    // Fetch unread notifications count
    useEffect(() => {
        if (!user) return;
        const notifsRef = collection(db, 'users', user.uid, 'notifications');
        const q = query(notifsRef, where('isRead', '==', false));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setUnreadCount(snapshot.size);
        });
        return () => unsubscribe();
    }, [user]);

    return (
        // Flex container fills the height provided by RootLayout (h-full)
        <div className="flex h-full bg-slate-50 dark:bg-gray-900 transition-colors duration-300">
            
            {/* 
              Sidebar:
              - h-full: Ensures it stretches the full height.
              - overflow-y-auto: Allows sidebar to scroll independently.
            */}
            <aside className="w-72 h-full bg-white dark:bg-gray-800 border-r border-gray-100 dark:border-gray-700 p-6 hidden md:flex flex-col shadow-[4px_0_24px_-12px_rgba(0,0,0,0.02)] z-10 overflow-y-auto transition-colors duration-300">
                
                {/* Branding / Header - Matches Student Layout Styling */}
                <div className="flex items-center gap-3 mb-8 px-2">
                    <div className="p-2 bg-purple-600 rounded-lg shadow-lg shadow-purple-200 dark:shadow-none">
                        <PenTool className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-gray-800 dark:text-white leading-tight">Educator Hub</h2>
                        <p className="text-xs text-gray-400 dark:text-gray-500 font-medium">Instructor Portal</p>
                    </div>
                </div>

                {/* Navigation Links */}
                <nav className="space-y-1.5 flex-1">
                    {sidebarNavLinks.map((link) => {
                        const isActive = pathname === link.href || (link.href !== '/educator/dashboard' && pathname.startsWith(link.href));
                        const Icon = link.icon;

                        return (
                            <Link
                                key={link.name}
                                href={link.href}
                                className={`
                                    group flex items-center justify-between gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ease-in-out
                                    ${isActive 
                                        ? 'bg-purple-50 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 shadow-sm translate-x-1' 
                                        : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50 hover:text-gray-900 dark:hover:text-gray-200 hover:translate-x-1'
                                    }
                                `}
                            >
                                <div className="flex items-center gap-3">
                                    <Icon 
                                        className={`w-5 h-5 transition-colors ${isActive ? 'text-purple-600 dark:text-purple-400' : 'text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-300'}`} 
                                        strokeWidth={isActive ? 2.5 : 2}
                                    />
                                    {link.name}
                                </div>
                                
                                {link.name === 'Notifications' && unreadCount > 0 && (
                                    <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-red-100 bg-red-600 rounded-full">
                                        {unreadCount}
                                    </span>
                                )}
                            </Link>
                        );
                    })}
                </nav>
            </aside>

            {/* 
              Main Content Area:
              - flex-1: Takes remaining width.
              - h-full: Takes full height of container.
              - overflow-y-auto: Allows content to scroll independently.
            */}
            <main className="flex-1 h-full overflow-y-auto scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-gray-700 scrollbar-track-transparent">
                <div className="max-w-7xl mx-auto p-6 md:p-10">
                    {children}
                </div>
            </main>
        </div>
    );
}