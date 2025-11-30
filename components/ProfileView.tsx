// components/ProfileView.tsx
'use client';

import { useEffect, useState } from 'react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/firebase/config';
import useAuth from '@/hooks/useAuth';
import ImageUploader from '@/components/ImageUploader';
import { 
    User, 
    Briefcase, 
    Github, 
    Twitter, 
    Globe, 
    Wallet, 
    Save, 
    Loader2, 
    CheckCircle 
} from 'lucide-react';

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
    const [isSaving, setIsSaving] = useState(false);
    const [message, setMessage] = useState('');

    // --- State for all fields ---
    const [email, setEmail] = useState('');
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

    // Fetch user profile data on load
    useEffect(() => {
        if (user) {
            const fetchProfile = async () => {
                try {
                    const userDocRef = doc(db, 'users', user.uid);
                    const userDocSnap = await getDoc(userDocRef);
                    
                    setEmail(user.email || '');

                    if (userDocSnap.exists()) {
                        const data = userDocSnap.data() as UserProfile;
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
                } catch (error) {
                    console.error("Error fetching profile:", error);
                }
            };
            fetchProfile();
        }
    }, [user]);

    // Handle form submission
    const handleSaveChanges = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        setIsSaving(true);
        setMessage('');

        try {
            const userDocRef = doc(db, 'users', user.uid);
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
            setTimeout(() => setMessage(''), 3000);
        } catch (error) {
            console.error("Error updating profile: ", error);
            setMessage('Failed to update profile.');
        } finally {
            setIsSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex h-[50vh] items-center justify-center">
                <div className="flex flex-col items-center gap-2">
                    <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                    <p className="text-sm text-gray-500 dark:text-gray-400">Loading profile...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto pb-20">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">My Profile</h1>
                <p className="text-gray-500 dark:text-gray-400 mt-1">Manage your personal information and public presence.</p>
            </div>

            <form onSubmit={handleSaveChanges} className="space-y-8">
                
                {/* --- 1. Personal Info Section --- */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden transition-colors">
                    <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex items-center gap-3 bg-gray-50/50 dark:bg-gray-800/50">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                            <User className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Personal Information</h2>
                    </div>
                    
                    <div className="p-6 space-y-6">
                        {/* Grid for Names */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">First Name</label>
                                <input 
                                    id="firstName" 
                                    type="text" 
                                    value={firstName} 
                                    onChange={(e) => setFirstName(e.target.value)} 
                                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                                />
                            </div>
                            <div>
                                <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Last Name</label>
                                <input 
                                    id="lastName" 
                                    type="text" 
                                    value={lastName} 
                                    onChange={(e) => setLastName(e.target.value)} 
                                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                                />
                            </div>
                        </div>

                        {/* Email & Display Name */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email Address</label>
                                <input 
                                    type="email" 
                                    value={email} 
                                    disabled 
                                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed" 
                                />
                            </div>
                            <div>
                                <label htmlFor="displayName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Display Name</label>
                                <input 
                                    id="displayName" 
                                    type="text" 
                                    value={displayName} 
                                    onChange={(e) => setDisplayName(e.target.value)} 
                                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                                />
                            </div>
                        </div>

                        {/* About Me */}
                        <div>
                            <label htmlFor="aboutMe" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">About Me</label>
                            <textarea 
                                id="aboutMe" 
                                value={aboutMe} 
                                onChange={(e) => setAboutMe(e.target.value)} 
                                rows={4} 
                                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all resize-none"
                            />
                        </div>
                    </div>
                </div>

                {/* --- 2. Profile Picture & Branding --- */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden transition-colors">
                    <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex items-center gap-3 bg-gray-50/50 dark:bg-gray-800/50">
                        <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                            <Briefcase className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                        </div>
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Profile & Branding</h2>
                    </div>
                    
                    <div className="p-6 flex flex-col md:flex-row gap-8">
                        {/* Image Uploader Area */}
                        <div className="flex flex-col items-center gap-4 min-w-[200px]">
                            <div className="relative group">
                                {photoURL ? (
                                    <img 
                                        src={photoURL} 
                                        alt="Profile" 
                                        className="w-32 h-32 rounded-full object-cover border-4 border-white dark:border-gray-700 shadow-md" 
                                    />
                                ) : (
                                    <div className="w-32 h-32 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-400 dark:text-gray-500 font-bold text-3xl">
                                        {displayName ? displayName[0].toUpperCase() : 'U'}
                                    </div>
                                )}
                            </div>
                            <div className="w-full">
                                <ImageUploader onUploadComplete={(url) => setPhotoURL(url)} />
                            </div>
                        </div>

                        {/* Branding Inputs */}
                        <div className="flex-1 space-y-6">
                            <div>
                                <label htmlFor="headline" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Professional Headline</label>
                                <input 
                                    id="headline" 
                                    type="text" 
                                    placeholder="e.g., Blockchain Developer & Smart Contract Auditor" 
                                    value={headline} 
                                    onChange={(e) => setHeadline(e.target.value)} 
                                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* --- 3. Social & Web3 --- */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden transition-colors">
                    <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex items-center gap-3 bg-gray-50/50 dark:bg-gray-800/50">
                        <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
                            <Globe className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Social & Web3</h2>
                    </div>

                    <div className="p-6 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* GitHub */}
                            <div>
                                <label htmlFor="github" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">GitHub</label>
                                <div className="flex rounded-xl shadow-sm">
                                    <span className="px-4 inline-flex items-center min-w-fit rounded-l-xl border border-r-0 border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400 text-sm">
                                        <Github className="w-4 h-4 mr-2" /> github.com/
                                    </span>
                                    <input 
                                        id="github" 
                                        type="text" 
                                        value={github} 
                                        onChange={(e) => setGithub(e.target.value)} 
                                        className="flex-1 min-w-0 block w-full px-4 py-2.5 rounded-none rounded-r-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                                    />
                                </div>
                            </div>

                            {/* Twitter */}
                            <div>
                                <label htmlFor="twitter" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Twitter / X</label>
                                <div className="flex rounded-xl shadow-sm">
                                    <span className="px-4 inline-flex items-center min-w-fit rounded-l-xl border border-r-0 border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400 text-sm">
                                        <Twitter className="w-4 h-4 mr-2" /> twitter.com/
                                    </span>
                                    <input 
                                        id="twitter" 
                                        type="text" 
                                        value={twitter} 
                                        onChange={(e) => setTwitter(e.target.value)} 
                                        className="flex-1 min-w-0 block w-full px-4 py-2.5 rounded-none rounded-r-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Website */}
                        <div>
                            <label htmlFor="website" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Personal Website</label>
                            <div className="relative rounded-xl shadow-sm">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Globe className="h-5 w-5 text-gray-400" />
                                </div>
                                <input 
                                    id="website" 
                                    type="url" 
                                    placeholder="https://..." 
                                    value={website} 
                                    onChange={(e) => setWebsite(e.target.value)} 
                                    className="block w-full pl-10 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                                />
                            </div>
                        </div>

                        {/* Wallet */}
                        <div>
                            <label htmlFor="walletAddress" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Ethereum Wallet</label>
                            <div className="relative rounded-xl shadow-sm">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Wallet className="h-5 w-5 text-gray-400" />
                                </div>
                                <input 
                                    id="walletAddress" 
                                    type="text" 
                                    placeholder="0x..." 
                                    value={walletAddress} 
                                    onChange={(e) => setWalletAddress(e.target.value)} 
                                    className="block w-full pl-10 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white font-mono text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                                />
                            </div>
                        </div>
                    </div>
                </div>
                
                {/* --- Sticky Footer for Save --- */}
                <div className="sticky bottom-6 z-10 flex justify-end">
                    <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md p-2 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 flex items-center gap-4 pr-6 pl-2">
                        {message && (
                            <span className="flex items-center gap-1 text-sm font-medium text-green-600 dark:text-green-400 animate-in fade-in slide-in-from-bottom-2">
                                <CheckCircle className="w-4 h-4" /> {message}
                            </span>
                        )}
                        <button 
                            type="submit" 
                            disabled={isSaving} 
                            className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl shadow-lg shadow-indigo-500/20 transition-all transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isSaving ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <Save className="w-5 h-5" />
                            )}
                            {isSaving ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </div>

            </form>
        </div>
    );
}