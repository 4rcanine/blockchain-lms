// app/(student)/profile/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/firebase/config';
import useAuth from '@/hooks/useAuth';
import ImageUploader from '@/components/ImageUploader'; // We'll reuse this component!

interface UserProfile {
    email: string;
    displayName?: string;
    photoURL?: string;
}

export default function ProfilePage() {
    const { user, loading } = useAuth();
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [displayName, setDisplayName] = useState('');
    const [photoURL, setPhotoURL] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [message, setMessage] = useState('');

    useEffect(() => {
        if (user) {
            const fetchProfile = async () => {
                const userDocRef = doc(db, 'users', user.uid);
                const userDocSnap = await getDoc(userDocRef);
                if (userDocSnap.exists()) {
                    const data = userDocSnap.data() as UserProfile;
                    setProfile(data);
                    setDisplayName(data.displayName || '');
                    setPhotoURL(data.photoURL || '');
                }
            };
            fetchProfile();
        }
    }, [user]);

    const handleSaveChanges = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        setIsSaving(true);
        setMessage('');

        try {
            const userDocRef = doc(db, 'users', user.uid);
            await updateDoc(userDocRef, {
                displayName: displayName,
                photoURL: photoURL
            });
            setMessage('Profile updated successfully!');
        } catch (error) {
            console.error("Error updating profile: ", error);
            setMessage('Failed to update profile.');
        } finally {
            setIsSaving(false);
        }
    };

    if (loading || !profile) {
        return <p>Loading profile...</p>;
    }

    return (
        <div>
            <h1 className="text-3xl font-bold mb-6">My Profile</h1>
            <form onSubmit={handleSaveChanges} className="max-w-xl space-y-6">
                <div>
                    <label className="block text-sm font-medium text-gray-700">Email Address</label>
                    <input type="email" value={profile.email} disabled className="w-full px-3 py-2 mt-1 bg-gray-100 border border-gray-300 rounded-md" />
                </div>
                <div>
                    <label htmlFor="displayName" className="block text-sm font-medium text-gray-700">Display Name</label>
                    <input id="displayName" type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md" />
                </div>
                
                {/* Re-using our ImageUploader for the profile picture */}
                <ImageUploader onUploadComplete={(url) => setPhotoURL(url)} />

                {/* Display the current photo if it exists */}
                {photoURL && (
                    <div>
                        <p className="text-sm font-medium text-gray-700">Current Profile Picture</p>
                        <img src={photoURL} alt="Profile" className="mt-2 h-24 w-24 rounded-full object-cover" />
                    </div>
                )}
                
                <div>
                    <button type="submit" disabled={isSaving} className="px-4 py-2 font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:bg-gray-400">
                        {isSaving ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
                {message && <p className="text-sm font-medium text-green-600">{message}</p>}
            </form>
        </div>
    );
}