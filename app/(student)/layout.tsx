// app/(student)/layout.tsx
'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/firebase/config';
import useAuth from '@/hooks/useAuth';
import Chatbot from '@/components/Chatbot';
import { 
    LayoutDashboard, 
    Bell, 
    User, 
    Calendar, 
    BookOpen, 
    Settings,
    GraduationCap
} from 'lucide-react';

// Define links with associated icons
const sidebarNavLinks = [
    // --- FIXED: Point to specific student dashboard ---
    { name: 'Dashboard', href: '/student/dashboard', icon: LayoutDashboard },
    
    { name: 'Course Catalog', href: '/courses', icon: BookOpen },
    { name: 'My Calendar', href: '/calendar', icon: Calendar },
    { name: 'Notifications', href: '/notifications', icon: Bell },
    { name: 'My Profile', href: '/profile', icon: User },
    { name: 'Settings', href: '/settings', icon: Settings },
];

export default function StudentLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { user } = useAuth();
    const pathname = usePathname();
    const [unreadCount, setUnreadCount] = useState(0);

    // --- Real-time Notification Listener ---
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
        <div className="flex bg-slate-50">
            <style jsx global>{`
                .h-screen-minus-header {
                    height: calc(100vh - 70px); /* Adjust based on your actual header height */
                }
            `}</style>

            {/* --- SIDEBAR NAVIGATION --- */}
            <aside className="w-72 bg-white border-r border-gray-100 p-6 h-screen-minus-header hidden md:flex flex-col shadow-[4px_0_24px_-12px_rgba(0,0,0,0.02)] z-10">
                
                {/* Sidebar Header */}
                <div className="flex items-center gap-3 mb-8 px-2">
                    <div className="p-2 bg-indigo-600 rounded-lg shadow-lg shadow-indigo-200">
                        <GraduationCap className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-gray-800 leading-tight">Student Hub</h2>
                        <p className="text-xs text-gray-400 font-medium">Learning Portal</p>
                    </div>
                </div>

                {/* Navigation Links */}
                <nav className="space-y-1.5 flex-1">
                    {sidebarNavLinks.map((link) => {
                        const isActive = pathname === link.href || (link.href !== '/student/dashboard' && pathname.startsWith(link.href));
                        const Icon = link.icon;

                        return (
                            <Link
                                key={link.name}
                                href={link.href}
                                className={`
                                    group flex items-center justify-between gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ease-in-out
                                    ${isActive 
                                        ? 'bg-indigo-50 text-indigo-700 shadow-sm translate-x-1' 
                                        : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900 hover:translate-x-1'
                                    }
                                `}
                            >
                                <div className="flex items-center gap-3">
                                    <Icon 
                                        className={`w-5 h-5 transition-colors ${isActive ? 'text-indigo-600' : 'text-gray-400 group-hover:text-gray-600'}`} 
                                        strokeWidth={isActive ? 2.5 : 2}
                                    />
                                    {link.name}
                                </div>

                                {/* --- Notification Badge --- */}
                                {link.name === 'Notifications' && unreadCount > 0 && (
                                    <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-red-500 rounded-full shadow-sm">
                                        {unreadCount}
                                    </span>
                                )}
                                
                                {isActive && link.name !== 'Notifications' && (
                                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-pulse" />
                                )}
                            </Link>
                        );
                    })}
                </nav>

                {/* Optional Footer/Banner in Sidebar */}
                <div className="mt-auto pt-6 border-t border-gray-100">
                    <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl p-4 text-white text-center shadow-md">
                        <p className="text-xs font-semibold opacity-90 mb-1">Keep learning!</p>
                        <p className="text-[10px] opacity-75">Complete your daily goals.</p>
                    </div>
                </div>
            </aside>

            {/* --- MAIN CONTENT AREA --- */}
            <main className="flex-1 overflow-y-auto h-screen-minus-header scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent">
                <div className="max-w-7xl mx-auto p-6 md:p-10">
                    {children}
                </div>
            </main>

            {/* --- AI ASSISTANT --- */}
            <div className="fixed bottom-6 right-6 z-50">
                <Chatbot />
            </div>
        </div>
    );
}