// app/(admin)/admin/users/[userId]/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore'; // Removed updateDoc
import { db } from '../../../../../firebase/config';
import { useParams } from 'next/navigation';
import { User, Mail, Shield, Loader2, List } from 'lucide-react'; // Added List icon

interface UserProfile {
    uid: string;
    email: string;
    role: 'student' | 'educator' | 'admin';
    displayName?: string;
    enrolledCourses?: string[];
}

export default function UserDetailPage() {
    const params = useParams();
    const userId = params.userId as string;
    
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchUser = async () => {
        setLoading(true);
        try {
            const userDocRef = doc(db, 'users', userId);
            const userSnap = await getDoc(userDocRef);
            
            if (!userSnap.exists()) {
                throw new Error("User profile not found.");
            }
            
            setProfile({ uid: userSnap.id, ...userSnap.data() } as UserProfile);
            setError(null);
        } catch (err: any) {
            setError(err.message || "Failed to load user data. Check permissions.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (userId) fetchUser();
    }, [userId]);

    // --- REMOVED: handleRoleChange function ---

    if (loading) return <div className="text-center mt-10"><Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-500" /></div>;
    if (error) return <div className="text-red-600 p-4">Error: {error}</div>;
    if (!profile) return <div className="text-gray-500 p-4">User not found.</div>;

    return (
        <div className="space-y-6 max-w-3xl">
            <h1 className="text-3xl font-bold mb-4">User Details: {profile.displayName || profile.email}</h1>
            
            <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 space-y-4">
                
                <h2 className="text-xl font-semibold border-b pb-2 mb-4">Profile Information</h2>

                {/* Role Display */}
                <div className="flex items-center gap-3">
                    <Shield className="w-5 h-5 text-indigo-600" />
                    <span className="text-gray-700">Role: </span>
                    <span className="font-bold text-lg capitalize text-indigo-700">
                        {profile.role}
                    </span>
                </div>

                <div className="flex items-center gap-3">
                    <Mail className="w-5 h-5 text-gray-500" />
                    <span className="text-gray-700">Email: </span>
                    <span className="font-medium">{profile.email}</span>
                </div>
                
                <div className="flex items-center gap-3">
                    <User className="w-5 h-5 text-gray-500" />
                    <span className="text-sm text-gray-700">UID: {profile.uid}</span>
                </div>

                {/* Enrolled Courses Overview */}
                <div className="pt-4 border-t">
                    <h3 className="font-semibold text-lg flex items-center gap-2">
                        <List className="w-5 h-5 text-gray-600" /> Enrollment Status
                    </h3>
                    <p className="text-sm text-gray-600 mt-2">
                        This user is currently enrolled in: 
                        <span className="font-medium text-indigo-600"> {profile.enrolledCourses?.length || 0} courses</span>.
                    </p>
                    {profile.enrolledCourses && profile.enrolledCourses.length > 0 && (
                        <p className="text-xs text-gray-500 mt-1 italic">
                            (List of Course IDs: {profile.enrolledCourses.join(', ')})
                        </p>
                    )}
                </div>
                
                <div className="pt-4 border-t">
                    <p className="text-xs text-gray-500">
                        To delete this user, return to the User Management list page and use the Trash icon.
                    </p>
                </div>
            </div>
        </div>
    );
}