// app/(educator)/layout.tsx
'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/firebase/config';
import useAuth from '@/hooks/useAuth';

// Navigation links for the Educator Sidebar
const sidebarNavLinks = [
    { name: 'My Dashboard', href: '/dashboard' },
    // Note: Ensure this path exists in your app structure
    { name: 'My Courses', href: '/courses' }, 
    { name: 'Notifications', href: '/notifications' },
    { name: 'My Profile', href: '/profile' },
];

export default function EducatorLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
    const { user } = useAuth();
    const pathname = usePathname();
    const [unreadCount, setUnreadCount] = useState(0);

    // --- Real-time Notification Listener ---
    useEffect(() => {
        if (!user) return;

        // Listen to the user's subcollection for unread items
        const notifsRef = collection(db, 'users', user.uid, 'notifications');
        const q = query(notifsRef, where('isRead', '==', false));

        // onSnapshot creates a real-time listener
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setUnreadCount(snapshot.size);
        });

        // Cleanup the listener when the component unmounts
        return () => unsubscribe();
    }, [user]);

    return (
        <div className="flex">
            {/* Helper style to calculate height based on your global Header */}
            <style jsx global>{`
                .h-screen-minus-header {
                    min-height: calc(100vh - 70px); /* Adjust 70px to match your Header height */
                }
            `}</style>

            {/* --- SIDEBAR --- */}
            <aside className="w-64 bg-gray-50 border-r p-6 h-screen-minus-header hidden md:block">
                <h2 className="text-xl font-bold mb-6 text-indigo-900">Educator Portal</h2>
                <nav className="space-y-2">
                    {sidebarNavLinks.map((link) => {
                        // Check if the current path starts with the link href (for active state)
                        const isActive = pathname === link.href || (link.href !== '/dashboard' && pathname.startsWith(link.href));
                        
                        return (
                            <Link
                                key={link.name}
                                href={link.href}
                                className={`flex justify-between items-center px-4 py-3 rounded-md text-sm font-medium transition-colors ${
                                    isActive
                                        ? 'bg-indigo-100 text-indigo-700'
                                        : 'text-gray-600 hover:bg-gray-200'
                                }`}
                            >
                                <span>{link.name}</span>
                                
                                {/* --- NOTIFICATION BADGE --- */}
                                {link.name === 'Notifications' && unreadCount > 0 && (
                                    <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-red-600 rounded-full shadow-sm">
                                        {unreadCount}
                                    </span>
                                )}
                            </Link>
                        );
                    })}
                </nav>
            </aside>

            {/* --- MAIN CONTENT AREA --- */}
            <main className="flex-1 p-8 overflow-y-auto h-screen-minus-header bg-white">
                {children}
            </main>
        </div>
    );
}