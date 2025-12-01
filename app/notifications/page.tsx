// app/notifications/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { collection, query, orderBy, getDocs, doc, updateDoc, where } from 'firebase/firestore';
import { db } from '@/firebase/config';
import useAuth from '@/hooks/useAuth';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import BackButton from '@/components/BackButton'; // 1. Import BackButton
import { 
    Bell, 
    CheckCircle, 
    UserPlus, 
    BookOpen, 
    Clock, 
    ChevronRight, 
    Check,
    Inbox
} from 'lucide-react';

interface Notification {
    id: string;
    message: string;
    courseId: string;
    type: string;
    createdAt: any;
    isRead: boolean;
}

// --- Helper to get icon based on type ---
const getNotificationIcon = (type: string) => {
    switch (type) {
        case 'enrollment_request':
            return <UserPlus className="w-5 h-5 text-amber-500" />;
        case 'enrollment_approved':
            return <CheckCircle className="w-5 h-5 text-green-500" />;
        case 'enrollment_added':
            return <BookOpen className="w-5 h-5 text-indigo-500" />;
        default:
            return <Bell className="w-5 h-5 text-gray-400" />;
    }
};

export default function NotificationsPage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (authLoading) return;
        if (!user) {
            router.push('/login');
            return;
        }

        const fetchNotifications = async () => {
            const notifsRef = collection(db, 'users', user.uid, 'notifications');
            // Order by Read status first (unread on top), then date
            const q = query(notifsRef, orderBy('isRead', 'asc'), orderBy('createdAt', 'desc'));
            
            try {
                const snapshot = await getDocs(q);
                const notifsList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Notification[];
                setNotifications(notifsList);
            } catch (error) {
                console.error("Error fetching notifications:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchNotifications();
    }, [user, authLoading, router]);

    const handleMarkAsRead = async (notificationId: string) => {
        if (!user) return;
        try {
            // Optimistic UI update
            setNotifications(prev => prev.map(n => n.id === notificationId ? { ...n, isRead: true } : n));
            const notifRef = doc(db, 'users', user.uid, 'notifications', notificationId);
            await updateDoc(notifRef, { isRead: true });
        } catch (error) {
            console.error("Error marking as read:", error);
        }
    };

    const handleMarkAllRead = async () => {
        if (!user) return;
        const unreadIds = notifications.filter(n => !n.isRead).map(n => n.id);
        if (unreadIds.length === 0) return;

        // Optimistic update
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));

        // Batch update in background
        unreadIds.forEach(async (id) => {
            await updateDoc(doc(db, 'users', user.uid, 'notifications', id), { isRead: true });
        });
    };

    const getLinkForNotification = (notif: Notification) => {
        if (notif.type === 'enrollment_request') {
            return `/courses/${notif.courseId}/enrollments`; // Educator view
        }
        // Student view (or fallback)
        return `/courses/${notif.courseId}/view`; 
    };

    if (loading) {
        return (
            <div className="flex h-[50vh] items-center justify-center bg-slate-50 dark:bg-gray-900">
                <div className="flex flex-col items-center gap-2">
                    <div className="w-8 h-8 border-4 border-indigo-200 dark:border-indigo-900 border-t-indigo-600 dark:border-t-indigo-400 rounded-full animate-spin"></div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Loading updates...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-gray-900 py-12 px-4 sm:px-6 transition-colors duration-300">
            <div className="max-w-3xl mx-auto">
                
                {/* 2. Added BackButton */}
                <BackButton />
                
                {/* Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Notifications</h1>
                        <p className="text-gray-500 dark:text-gray-400 mt-1">Stay updated with your course activity.</p>
                    </div>
                    {notifications.some(n => !n.isRead) && (
                        <button 
                            onClick={handleMarkAllRead}
                            className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 flex items-center gap-1 bg-white dark:bg-gray-800 px-4 py-2 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 transition-colors"
                        >
                            <Check className="w-4 h-4" /> Mark all as read
                        </button>
                    )}
                </div>

                {/* List */}
                <div className="space-y-3">
                    {notifications.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-gray-800 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700">
                            <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-full mb-4">
                                <Inbox className="w-8 h-8 text-gray-400 dark:text-gray-500" />
                            </div>
                            <p className="text-lg font-medium text-gray-900 dark:text-white">All caught up!</p>
                            <p className="text-gray-500 dark:text-gray-400 text-sm">You have no new notifications.</p>
                        </div>
                    ) : (
                        notifications.map(notif => (
                            <div 
                                key={notif.id} 
                                className={`
                                    group relative p-5 rounded-xl border transition-all duration-200
                                    ${!notif.isRead 
                                        ? 'bg-white dark:bg-gray-800 border-l-4 border-l-indigo-500 border-y-gray-100 border-r-gray-100 dark:border-y-gray-700 dark:border-r-gray-700 shadow-md dark:shadow-none' 
                                        : 'bg-gray-50/80 dark:bg-gray-900/50 border-transparent dark:border-gray-800 opacity-80 hover:opacity-100'
                                    }
                                `}
                            >
                                <div className="flex gap-4">
                                    {/* Icon */}
                                    <div className={`mt-1 p-2 rounded-full h-fit ${!notif.isRead ? 'bg-indigo-50 dark:bg-indigo-900/30' : 'bg-gray-200 dark:bg-gray-800'}`}>
                                        {getNotificationIcon(notif.type)}
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1">
                                        <p className={`text-sm sm:text-base ${!notif.isRead ? 'text-gray-900 dark:text-white font-medium' : 'text-gray-600 dark:text-gray-400'}`}>
                                            {notif.message}
                                        </p>
                                        
                                        <div className="flex items-center gap-4 mt-3">
                                            <span className="flex items-center text-xs text-gray-400 dark:text-gray-500">
                                                <Clock className="w-3 h-3 mr-1" />
                                                {notif.createdAt?.seconds 
                                                    ? new Date(notif.createdAt.seconds * 1000).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                                                    : 'Just now'
                                                }
                                            </span>
                                            
                                            {/* Action Link */}
                                            <Link 
                                                href={getLinkForNotification(notif)} 
                                                className="flex items-center text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline group-hover:translate-x-1 transition-transform"
                                            >
                                                View Details <ChevronRight className="w-3 h-3 ml-0.5" />
                                            </Link>
                                        </div>
                                    </div>

                                    {/* Mark Read Button (only for unread) */}
                                    {!notif.isRead && (
                                        <button 
                                            onClick={() => handleMarkAsRead(notif.id)} 
                                            className="absolute top-4 right-4 p-1.5 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                                            title="Mark as read"
                                        >
                                            <span className="w-2 h-2 bg-indigo-600 rounded-full block md:hidden"></span>
                                            <Check className="w-4 h-4 hidden md:block" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}