// app/(student)/profile/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/firebase/config';
import useAuth from '@/hooks/useAuth';
import ImageUploader from '@/components/ImageUploader';

// --- UPDATED Type Definition ---
interface UserProfile {
    email: string;
    displayName?: string;
    photoURL?: string;
    firstName?: string;
    lastName?: string;
    headline?: string;
    aboutMe?: string;
    socials?: {
        github?: string;
        twitter?: string;
        website?: string;
    };
    walletAddress?: string;
}

export default function ProfilePage() {
    const { user, loading } = useAuth();
    // const [profile, setProfile] = useState<UserProfile | null>(null); // Removed: fetching directly into individual states
    const [isSaving, setIsSaving] = useState(false);
    const [message, setMessage] = useState('');

    // --- State for all fields ---
    const [email, setEmail] = useState(''); // Added: to display email
    const [displayName, setDisplayName] = useState('');
    const [photoURL, setPhotoURL] = useState('');
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [headline, setHeadline] = useState('');
    const [aboutMe, setAboutMe] = useState('');
    const [github, setGithub] = useState('');
    const [twitter, setTwitter] = useState('');
    const [website, setWebsite] = useState('');
    const [walletAddress, setWalletAddress] = useState('');

    useEffect(() => {
        if (user) {
            const fetchProfile = async () => {
                const userDocRef = doc(db, 'users', user.uid);
                const userDocSnap = await getDoc(userDocRef);
                
                // Always set email from user object or the fetched data
                setEmail(user.email || '');

                if (userDocSnap.exists()) {
                    const data = userDocSnap.data() as UserProfile;
                    // setProfile(data); // Original state set removed

                    // Populate all state fields
                    setDisplayName(data.displayName || '');
                    setPhotoURL(data.photoURL || '');
                    setFirstName(data.firstName || '');
                    setLastName(data.lastName || '');
                    setHeadline(data.headline || '');
                    setAboutMe(data.aboutMe || '');
                    setGithub(data.socials?.github || '');
                    setTwitter(data.socials?.twitter || '');
                    setWebsite(data.socials?.website || '');
                    setWalletAddress(data.walletAddress || '');
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
            // --- UPDATED save logic ---
            await updateDoc(userDocRef, {
                displayName,
                photoURL,
                firstName,
                lastName,
                headline,
                aboutMe,
                socials: { github, twitter, website },
                walletAddress
            });
            setMessage('Profile updated successfully!');
        } catch (error) {
            console.error("Error updating profile: ", error);
            setMessage('Failed to update profile.');
        } finally {
            setIsSaving(false);
        }
    };

    if (loading) {
        return <p>Loading profile...</p>;
    }

    return (
        <div>
            <h1 className="text-3xl font-bold mb-6">My Profile</h1>
            {/* The max-w-2xl class provides more room for the expanded form */}
            <form onSubmit={handleSaveChanges} className="max-w-2xl space-y-8">
                
                {/* --- Personal Info --- */}
                <div className="p-6 bg-white shadow-md rounded-lg space-y-4">
                    <h2 className="text-xl font-semibold">Personal Information</h2>
                    
                    {/* Email (Disabled) */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Email Address</label>
                        <input type="email" value={email} disabled className="w-full px-3 py-2 mt-1 bg-gray-100 border border-gray-300 rounded-md" />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">First Name</label>
                            <input id="firstName" type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} className="w-full mt-1 p-2 border rounded-md" />
                        </div>
                        <div>
                            <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">Last Name</label>
                            <input id="lastName" type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} className="w-full mt-1 p-2 border rounded-md" />
                        </div>
                    </div>
                    <div>
                        <label htmlFor="displayName" className="block text-sm font-medium text-gray-700">Display Name</label>
                        <input id="displayName" type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="w-full mt-1 p-2 border rounded-md" />
                    </div>
                    <div>
                        <label htmlFor="headline" className="block text-sm font-medium text-gray-700">Headline</label>
                        <input id="headline" type="text" placeholder="e.g., Aspiring Smart Contract Developer" value={headline} onChange={(e) => setHeadline(e.target.value)} className="w-full mt-1 p-2 border rounded-md" />
                    </div>
                    <div>
                        <label htmlFor="aboutMe" className="block text-sm font-medium text-gray-700">About Me</label>
                        <textarea id="aboutMe" value={aboutMe} onChange={(e) => setAboutMe(e.target.value)} rows={5} className="w-full mt-1 p-2 border rounded-md" />
                    </div>
                </div>

                {/* --- Profile Picture --- */}
                <div className="p-6 bg-white shadow-md rounded-lg">
                    <h2 className="text-xl font-semibold mb-4">Profile Picture</h2>
                    <ImageUploader onUploadComplete={(url) => setPhotoURL(url)} />
                    {photoURL && <img src={photoURL} alt="Profile Preview" className="mt-4 h-24 w-24 rounded-full object-cover" />}
                </div>

                {/* --- Social & Web3 --- */}
                <div className="p-6 bg-white shadow-md rounded-lg space-y-4">
                    <h2 className="text-xl font-semibold">Social & Web3 Links</h2>
                    <div>
                        <label htmlFor="github" className="block text-sm font-medium text-gray-700">GitHub Username</label>
                        <div className="flex items-center mt-1"><span className="p-2 bg-gray-100 border rounded-l-md">github.com/</span><input id="github" type="text" value={github} onChange={(e) => setGithub(e.target.value)} className="w-full p-2 border-t border-b border-r rounded-r-md" /></div>
                    </div>
                    <div>
                        <label htmlFor="twitter" className="block text-sm font-medium text-gray-700">Twitter/X Username</label>
                        <div className="flex items-center mt-1"><span className="p-2 bg-gray-100 border rounded-l-md">twitter.com/</span><input id="twitter" type="text" value={twitter} onChange={(e) => setTwitter(e.target.value)} className="w-full p-2 border-t border-b border-r rounded-r-md" /></div>
                    </div>
                    <div>
                        <label htmlFor="website" className="block text-sm font-medium text-gray-700">Personal Website</label>
                        <input id="website" type="url" placeholder="https://..." value={website} onChange={(e) => setWebsite(e.target.value)} className="w-full mt-1 p-2 border rounded-md" />
                    </div>
                    <div>
                        <label htmlFor="walletAddress" className="block text-sm font-medium text-gray-700">Ethereum Wallet Address</label>
                        <input id="walletAddress" type="text" placeholder="0x..." value={walletAddress} onChange={(e) => setWalletAddress(e.target.value)} className="w-full mt-1 p-2 border rounded-md" />
                    </div>
                </div>
                
                {/* --- Save Button & Message --- */}
                <div className="flex items-center">
                    <button type="submit" disabled={isSaving} className="px-6 py-2 font-bold text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:bg-gray-400">
                        {isSaving ? 'Saving...' : 'Save All Changes'}
                    </button>
                    {message && <p className="inline-block ml-4 text-sm font-medium text-green-600">{message}</p>}
                </div>
            </form>
        </div>
    );
}