'use client';

import { useEffect, useState } from 'react';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/firebase/config';
import { useParams } from 'next/navigation';
import { User, Briefcase, Github, Twitter, Globe, Wallet, Loader2, BookOpen } from 'lucide-react';
import Link from 'next/link';
import BackButton from '@/components/BackButton';

// --- Type Definitions ---
interface UserProfile {
    email: string;
    role: 'student' | 'educator' | 'admin';
    displayName?: string;
    photoURL?: string;
    firstName?: string;
    lastName?: string;
    headline?: string;
    aboutMe?: string;
    socials?: { github?: string; twitter?: string; website?: string; };
    walletAddress?: string;
    enrolledCourses?: string[]; 
}

interface Course {
    id: string;
    title: string;
    imageUrl?: string;
    description?: string;
}

export default function UserProfilePage() {
    const params = useParams();
    const userId = params.userId as string;

    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [courses, setCourses] = useState<Course[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!userId) return;

        const fetchProfileAndCourses = async () => {
            try {
                // 1. Fetch the user's profile
                const userDocRef = doc(db, 'users', userId);
                const userDocSnap = await getDoc(userDocRef);
                if (!userDocSnap.exists()) {
                    throw new Error("User not found.");
                }
                const profileData = userDocSnap.data() as UserProfile;
                setProfile(profileData);

                // 2. Fetch courses based on their role
                let coursesQuery;
                if (profileData.role === 'educator') {
                    coursesQuery = query(collection(db, 'courses'), where('instructorIds', 'array-contains', userId));
                } else if (profileData.role === 'student' && profileData.enrolledCourses && profileData.enrolledCourses.length > 0) {
                    coursesQuery = query(collection(db, 'courses'), where('__name__', 'in', profileData.enrolledCourses));
                }

                if (coursesQuery) {
                    const coursesSnapshot = await getDocs(coursesQuery);
                    const coursesList = coursesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Course[];
                    setCourses(coursesList);
                }
            } catch (error) {
                console.error("Failed to fetch profile:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchProfileAndCourses();
    }, [userId]);

    if (loading) {
        return (
            <div className="flex h-[50vh] items-center justify-center">
                <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
            </div>
        );
    }

    if (!profile) {
        return (
            <div className="flex flex-col items-center justify-center h-[50vh] text-gray-500 dark:text-gray-400">
                <User className="w-12 h-12 mb-2 opacity-20" />
                <p>User not found.</p>
                <div className="mt-4">
                     <BackButton /> 
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto py-12 px-4">
            
            <BackButton />

            {/* --- Profile Header Card --- */}
            <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 shadow-sm border border-gray-100 dark:border-gray-700 mb-8 flex flex-col md:flex-row items-center md:items-start gap-8 transition-colors">
                
                {/* Avatar */}
                <div className="relative group">
                    {profile.photoURL ? (
                        <img 
                            src={profile.photoURL} 
                            alt={profile.displayName} 
                            className="w-32 h-32 rounded-full object-cover border-4 border-indigo-50 dark:border-gray-700 shadow-lg" 
                        />
                    ) : (
                        <div className="w-32 h-32 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-4xl font-bold text-white shadow-lg border-4 border-indigo-50 dark:border-gray-700">
                            {profile.displayName?.[0].toUpperCase() || 'U'}
                        </div>
                    )}
                    <div className="absolute bottom-1 right-1 bg-white dark:bg-gray-900 p-1.5 rounded-full border border-gray-100 dark:border-gray-700 shadow-sm">
                        {profile.role === 'educator' ? (
                            <Briefcase className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                        ) : (
                            <User className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                        )}
                    </div>
                </div>

                {/* Info */}
                <div className="text-center md:text-left flex-1">
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{profile.displayName}</h1>
                    {profile.headline && (
                        <p className="text-lg text-gray-600 dark:text-gray-300 mb-4">{profile.headline}</p>
                    )}
                    
                    <div className="flex flex-wrap justify-center md:justify-start gap-3">
                        {profile.socials?.github && (
                            <a href={`https://github.com/${profile.socials.github}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-gray-700/50 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                                <Github className="w-4 h-4" /> GitHub
                            </a>
                        )}
                        {profile.socials?.twitter && (
                            <a href={`https://twitter.com/${profile.socials.twitter}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors">
                                <Twitter className="w-4 h-4" /> Twitter
                            </a>
                        )}
                        {profile.socials?.website && (
                            <a href={profile.socials.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-3 py-1.5 bg-purple-50 dark:bg-purple-900/20 rounded-lg text-sm font-medium text-purple-600 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors">
                                <Globe className="w-4 h-4" /> Website
                            </a>
                        )}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* --- About Me Column --- */}
                <div className="lg:col-span-1 space-y-8">
                    {profile.aboutMe && (
                        <section>
                            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                <User className="w-5 h-5 text-indigo-500" /> About
                            </h2>
                            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
                                <p className="text-gray-600 dark:text-gray-300 whitespace-pre-wrap leading-relaxed text-sm">
                                    {profile.aboutMe}
                                </p>
                            </div>
                        </section>
                    )}
                    
                    {profile.walletAddress && (
                        <section>
                             <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                <Wallet className="w-5 h-5 text-emerald-500" /> Wallet
                            </h2>
                            <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
                                <code className="text-xs text-gray-500 dark:text-gray-400 break-all font-mono">
                                    {profile.walletAddress}
                                </code>
                            </div>
                        </section>
                    )}
                </div>

                {/* --- Courses Column --- */}
                <div className="lg:col-span-2">
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                        <BookOpen className="w-5 h-5 text-indigo-500" /> 
                        {profile.role === 'educator' ? 'Created Courses' : 'Enrolled Courses'}
                    </h2>
                    
                    {courses.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {courses.map(course => (
                                <Link key={course.id} href={`/courses/${course.id}`} className="group">
                                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-md border border-gray-100 dark:border-gray-700 overflow-hidden transition-all hover:-translate-y-1 h-full flex flex-col">
                                        <div className="h-32 bg-gray-200 dark:bg-gray-700 relative overflow-hidden">
                                            {course.imageUrl ? (
                                                <img src={course.imageUrl} alt={course.title} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-gray-400 dark:text-gray-500">
                                                    <BookOpen className="w-8 h-8 opacity-50" />
                                                </div>
                                            )}
                                        </div>
                                        <div className="p-4 flex flex-col flex-grow">
                                            <h3 className="font-bold text-gray-900 dark:text-white mb-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors line-clamp-1">
                                                {course.title}
                                            </h3>
                                            {course.description && (
                                                <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                                                    {course.description}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    ) : (
                        <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700 text-center">
                            <p className="text-gray-500 dark:text-gray-400">No courses found.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}