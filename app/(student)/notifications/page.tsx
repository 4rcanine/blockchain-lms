// app/(student)/notifications/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { collection, query, orderBy, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/firebase/config';
import useAuth from '@/hooks/useAuth';
import Link from 'next/link';

interface Notification {
    id: string;
    message: string;
    courseId: string;
    type: string;
    createdAt: any;
    isRead: boolean;
}

export default function NotificationsPage() {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchNotifications = async () => {
        if (!user) return;
        const notifsRef = collection(db, 'users', user.uid, 'notifications');
        const q = query(notifsRef, orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);
        const notifsList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Notification[];
        setNotifications(notifsList);
        setLoading(false);
    };

    useEffect(() => {
        fetchNotifications();
    }, [user]);

    const handleMarkAsRead = async (notificationId: string) => {
        if (!user) return;
        const notifRef = doc(db, 'users', user.uid, 'notifications', notificationId);
        await updateDoc(notifRef, { isRead: true });
        // Optimistically update the UI
        setNotifications(notifications.map(n => n.id === notificationId ? { ...n, isRead: true } : n));
    };

    const getLinkForNotification = (notif: Notification) => {
        if (notif.type === 'enrollment_request') {
            return `/courses/${notif.courseId}/enrollments`; // For educators
        }
        return `/courses/${notif.courseId}/view`; // For students
    };

    if (loading) return <p>Loading notifications...</p>;

    return (
        <div>
            <h1 className="text-3xl font-bold mb-6">Notifications</h1>
            <div className="space-y-4">
                {notifications.length === 0 && <p>You have no new notifications.</p>}
                {notifications.map(notif => (
                    <div key={notif.id} className={`p-4 rounded-lg flex justify-between items-center ${notif.isRead ? 'bg-white' : 'bg-indigo-50 border-l-4 border-indigo-500'}`}>
                        <div>
                            <p>{notif.message}</p>
                            <p className="text-xs text-gray-500">{new Date(notif.createdAt.seconds * 1000).toLocaleString()}</p>
                            <Link href={getLinkForNotification(notif)} className="text-sm font-semibold text-indigo-600 hover:underline">
                                View Details
                            </Link>
                        </div>
                        {!notif.isRead && (
                            <button onClick={() => handleMarkAsRead(notif.id)} className="text-sm font-medium text-gray-600 hover:text-black">
                                Mark as Read
                            </button>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}