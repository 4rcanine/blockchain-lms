// app/notifications/page.tsx  (This is the new shared page)
'use client';

import { useEffect, useState } from 'react';
import { collection, query, orderBy, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/firebase/config';
import useAuth from '@/hooks/useAuth';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface Notification {
    id: string;
    message: string;
    courseId: string;
    type: string;
    createdAt: any;
    isRead: boolean;
}

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
            const q = query(notifsRef, orderBy('createdAt', 'desc'));
            const snapshot = await getDocs(q);
            const notifsList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Notification[];
            setNotifications(notifsList);
            setLoading(false);
        };

        fetchNotifications();
    }, [user, authLoading, router]);

    const handleMarkAsRead = async (notificationId: string) => {
        if (!user) return;
        const notifRef = doc(db, 'users', user.uid, 'notifications', notificationId);
        await updateDoc(notifRef, { isRead: true });
        setNotifications(notifications.map(n => n.id === notificationId ? { ...n, isRead: true } : n));
    };

    // This function now correctly routes educators
    const getLinkForNotification = (notif: Notification) => {
        if (notif.type === 'enrollment_request') {
            return `/courses/${notif.courseId}/enrollments`; // For educators
        }
        return `/courses/${notif.courseId}/view`; // For students (enrollment_approved, etc.)
    };

    if (loading) return <p>Loading notifications...</p>;

    return (
        <div className="container mx-auto p-4 md:p-8">
            <h1 className="text-3xl font-bold mb-6">Notifications</h1>
            <div className="space-y-4 max-w-3xl mx-auto">
                {notifications.length === 0 && <p className="text-center text-gray-500">You have no notifications.</p>}
                {notifications.map(notif => (
                    <div key={notif.id} className={`p-4 rounded-lg flex justify-between items-center transition-colors ${notif.isRead ? 'bg-white shadow-sm' : 'bg-indigo-50 border-l-4 border-indigo-500'}`}>
                        <div>
                            <p className="text-gray-800">{notif.message}</p>
                            <div className="flex items-center gap-4 mt-2">
                                <Link href={getLinkForNotification(notif)} className="text-sm font-semibold text-indigo-600 hover:underline">
                                    View Details
                                </Link>
                                <p className="text-xs text-gray-500">{new Date(notif.createdAt.seconds * 1000).toLocaleString()}</p>
                            </div>
                        </div>
                        {!notif.isRead && (
                            <button onClick={() => handleMarkAsRead(notif.id)} className="text-sm font-medium text-gray-600 hover:text-black flex-shrink-0 ml-4">
                                Mark as Read
                            </button>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}