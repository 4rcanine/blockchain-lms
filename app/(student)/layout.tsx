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
    GraduationCap,
    Award
} from 'lucide-react';

const sidebarNavLinks = [
    { name: 'Dashboard', href: '/student/dashboard', icon: LayoutDashboard },
    { name: 'Course Catalog', href: '/courses', icon: BookOpen },
    { name: 'My Calendar', href: '/calendar', icon: Calendar },
    { name: 'My Grades', href: '/student/grades', icon: Award },
    { name: 'Notifications', href: '/notifications', icon: Bell },
    { name: 'My Profile', href: '/student/profile', icon: User },
    { name: 'Settings', href: '/student/settings', icon: Settings },
];

export default function StudentLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { user } = useAuth();
    const pathname = usePathname();
    const [unreadCount, setUnreadCount] = useState(0);

    useEffect(() => {
        if (!user) return;
        const notifsRef = collection(db, 'users', user.uid, 'notifications');
        const q = query(notifsRef, where('isRead', '==', false));
        
        const unsubscribe = onSnapshot(q, 
            (snapshot) => {
                setUnreadCount(snapshot.size);
            },
            (error) => {
                console.log("Notification listener error:", error.code);
            }
        );
        return () => unsubscribe();
    }, [user]);

    return (
        // FIX: Switched to 'fixed' positioning.
        // This anchors the layout exactly 80px (20 * 4) from the top, preventing body scroll.
        <div className="fixed top-20 bottom-0 left-0 right-0 flex bg-slate-50 dark:bg-gray-900 transition-colors duration-300 overflow-hidden">
            
            {/* Ambient Background Blobs */}
            <div className="absolute top-0 left-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none -z-10" />
            <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-3xl pointer-events-none -z-10" />

            {/* Sidebar */}
            <aside className="w-72 h-full bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl border-r border-gray-200/50 dark:border-gray-700/50 hidden md:flex flex-col shadow-[4px_0_24px_-12px_rgba(0,0,0,0.02)] z-10">
                
                {/* Sidebar Header */}
                <div className="flex items-center gap-3 mb-8 px-2 pt-6">
                    <div className="p-2.5 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-500/20 dark:shadow-none">
                        <GraduationCap className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-gray-800 dark:text-white leading-tight">Student Hub</h2>
                        <p className="text-xs text-gray-400 dark:text-gray-500 font-medium">Learning Portal</p>
                    </div>
                </div>

                {/* Navigation Links */}
                <nav className="space-y-1.5 flex-1 overflow-y-auto custom-scrollbar px-2 pb-4">
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
                                        ? 'bg-indigo-50/80 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 shadow-sm translate-x-1 backdrop-blur-sm' 
                                        : 'text-gray-500 dark:text-gray-400 hover:bg-white/50 dark:hover:bg-gray-700/50 hover:text-gray-900 dark:hover:text-gray-200 hover:translate-x-1'
                                    }
                                `}
                            >
                                <div className="flex items-center gap-3">
                                    <Icon 
                                        className={`w-5 h-5 transition-colors ${isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-300'}`} 
                                        strokeWidth={isActive ? 2.5 : 2}
                                    />
                                    {link.name}
                                </div>

                                {link.name === 'Notifications' && unreadCount > 0 && (
                                    <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-red-500 rounded-full shadow-sm">
                                        {unreadCount}
                                    </span>
                                )}
                                
                                {isActive && link.name !== 'Notifications' && (
                                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-600 dark:bg-indigo-400 animate-pulse" />
                                )}
                            </Link>
                        );
                    })}
                </nav>

                <div className="mt-auto pt-6 border-t border-gray-100 dark:border-gray-700/50 p-6">
                    <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl p-4 text-white text-center shadow-lg shadow-indigo-500/20">
                        <p className="text-xs font-semibold opacity-90 mb-1">Keep learning!</p>
                        <p className="text-[10px] opacity-75">Complete your daily goals.</p>
                    </div>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 h-full overflow-y-auto scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-gray-700 scrollbar-track-transparent relative z-0">
                <div className="max-w-7xl mx-auto p-6 md:p-10">
                    {children}
                </div>
            </main>

            <div className="fixed bottom-6 right-6 z-50">
                <Chatbot />
            </div>
        </div>
    );
}