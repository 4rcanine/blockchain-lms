// components/DashboardView.tsx
'use client';

import React, { useEffect, useState } from 'react';
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  orderBy,
  limit,
  deleteDoc,
  collectionGroup,
  DocumentData,
} from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import useAuth from '@/hooks/useAuth';
import { db } from '@/firebase/config';
import Link from 'next/link';
import { 
    Clock, 
    BookOpen, 
    Bell, 
    CheckCircle, 
    AlertCircle, 
    ArrowRight,
    LayoutDashboard,
    Loader2,
    Sparkles
} from 'lucide-react';

// ----------------------------- Types ------------------------------------

interface AuthUser {
    uid: string;
    email: string | null;
    displayName: string | null;
}

interface UserProfile {
  email: string;
  role: 'student' | 'educator' | 'admin';
  enrolledCourses?: string[];
  learningPath?: string[];
  displayName?: string;
}

interface Course {
  id: string;
  title: string;
  description: string;
  tags?: string[];
  imageUrl?: string;
  instructorId?: string;
  createdAt?: any;
  updatedAt?: any;
  progress?: number;
  lastAccessedAt?: number; 
  [k: string]: any;
}

interface AppNotification {
  id: string;
  message: string;
  courseId: string;
  type: 'enrollment_approved' | 'enrollment_added' | 'enrollment_request';
  isRead: boolean;
  createdAt: any;
}

// ---------------------------- ProgressBar ------------------------
const ProgressBar = ({ progress }: { progress: number }) => (
  <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2 mt-3 overflow-hidden">
    <div 
        className="bg-gradient-to-r from-indigo-500 to-purple-500 h-full rounded-full transition-all duration-500 ease-out" 
        style={{ width: `${progress}%` }}
    ></div>
  </div>
);

// ---------------------------- CourseCard ------------------------
const CourseCard = ({
  course,
  isEducator = false,
  isEnrolled = false,
}: {
  course: Course;
  isEducator?: boolean;
  isEnrolled?: boolean;
}) => {
  let linkHref = `/courses/${course.id}`;
  let linkText = 'View & Enroll';

  if (isEducator) {
    linkHref = `/courses/${course.id}/manage`;
    linkText = 'Manage Course';
  } else if (isEnrolled) {
    linkHref = `/courses/${course.id}/view`;
    linkText = 'Continue Learning';
  }

  return (
    <div className="group bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-xl hover:shadow-indigo-500/10 transition-all duration-300 flex flex-col overflow-hidden hover:-translate-y-1">
      {course.imageUrl ? (
        <Link href={linkHref} className="relative h-40 overflow-hidden">
          <img
            src={course.imageUrl}
            alt={course.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />
        </Link>
      ) : (
        <div className="w-full h-40 bg-gray-50 dark:bg-gray-700/50 flex items-center justify-center border-b border-gray-100 dark:border-gray-700">
          <BookOpen className="w-8 h-8 text-gray-300 dark:text-gray-600" />
        </div>
      )}

      <div className="p-5 flex flex-col flex-grow">
        <Link href={linkHref} className="group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
          <h3 className="font-bold text-lg mb-2 text-gray-900 dark:text-white line-clamp-1" title={course.title}>
              {course.title}
          </h3>
        </Link>

        {/* --- TAGS SECTION (NOW CLICKABLE) --- */}
        {course.tags && course.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {course.tags.slice(0, 3).map((tag: string) => (
              <Link
                href={`/tags/${encodeURIComponent(tag)}`}
                key={tag}
                className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-900/30 rounded-full border border-indigo-100 dark:border-indigo-800/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors"
              >
                {tag}
              </Link>
            ))}
          </div>
        )}

        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 flex-grow line-clamp-2">
          {course.description || "No description provided."}
        </p>

        {isEnrolled && typeof course.progress === 'number' && (
          <div className="mb-4">
            <div className="flex justify-between items-center text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
              <span>Progress</span>
              <span className="text-indigo-600 dark:text-indigo-400">{course.progress}%</span>
            </div>
            <ProgressBar progress={course.progress} />
          </div>
        )}

        <Link
          href={linkHref}
          className="mt-auto flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-semibold text-gray-700 dark:text-gray-200 bg-gray-50 dark:bg-gray-700/50 hover:bg-indigo-600 hover:text-white dark:hover:bg-indigo-600 dark:hover:text-white transition-all duration-300"
        >
          {linkText} <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
};

// ------------------------------- Main Component --------------------------------
export default function DashboardView() {
  const { 
    user: authUser, 
    loading: authLoading 
  } = useAuth() as { user: AuthUser | null; loading: boolean };
  const router = useRouter();

  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [enrolledCourses, setEnrolledCourses] = useState<Course[]>([]);
  const [createdCourses, setCreatedCourses] = useState<Course[]>([]);
  const [suggestedCourses, setSuggestedCourses] = useState<Course[]>([]);
  const [recentActivity, setRecentActivity] = useState<Course[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]); 
  const [error, setError] = useState<string | null>(null);
  const [isDataLoading, setIsDataLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!authUser) {
        if (!authLoading) router.push('/login');
        return;
      }

      setIsDataLoading(true);
      try {
        const userDocRef = doc(db, 'users', authUser.uid);
        const userSnap = await getDoc(userDocRef);
        if (!userSnap.exists()) throw new Error('User profile not found.');
        const profile = userSnap.data() as UserProfile;
        setUserProfile(profile);

        const notifQ = query(
            collection(db, 'users', authUser.uid, 'notifications'),
            orderBy('createdAt', 'desc')
        );
        const notifSnap = await getDocs(notifQ);
        setNotifications(notifSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as AppNotification[]);

        // --- STUDENT LOGIC ---
        if (profile.role === 'student' && profile.enrolledCourses && profile.enrolledCourses.length > 0) {
            const courseIds = profile.enrolledCourses;
            const coursesList: Course[] = [];

            await Promise.all(courseIds.map(async (courseId) => {
                const courseDocSnap = await getDoc(doc(db, 'courses', courseId));
                if (!courseDocSnap.exists()) return;
                const cData = { id: courseDocSnap.id, ...courseDocSnap.data() } as Course;

                const modulesSnap = await getDocs(collection(db, 'courses', courseId, 'modules'));
                let totalLessons = 0;
                modulesSnap.forEach((mod) => {
                    totalLessons += mod.data().lessons?.length || 0;
                });

                const enrollmentDocSnap = await getDoc(doc(db, 'courses', courseId, 'enrollmentRequests', authUser.uid));
                let completedCount = 0;
                let lastAccessed = 0; 

                if(enrollmentDocSnap.exists()) {
                    const enrollData = enrollmentDocSnap.data();
                    completedCount = enrollData.completedItems?.length || 0;
                    lastAccessed = enrollData.lastAccessedAt?.toMillis() || 0;
                }

                cData.progress = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;
                cData.lastAccessedAt = lastAccessed;

                coursesList.push(cData);
            }));

            setEnrolledCourses(coursesList);

            // History Logic
            const history = [...coursesList]
                .filter(c => (c.lastAccessedAt || 0) > 0)
                .sort((a, b) => (b.lastAccessedAt || 0) - (a.lastAccessedAt || 0))
                .slice(0, 4);

            setRecentActivity(history);
        } else {
            setEnrolledCourses([]);
            setRecentActivity([]);
        }

        // --- EDUCATOR LOGIC ---
        if (profile.role === 'educator') {
          const createdQ = query(
            collection(db, 'courses'),
            where('instructorIds', 'array-contains', authUser.uid)
          );
          const createdSnap = await getDocs(createdQ);
          const eduCourses = createdSnap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as Course[];
          setCreatedCourses(eduCourses);
          
           const sortedEduCourses = [...eduCourses].sort((a, b) => {
               const aTime = a.updatedAt?.seconds || a.createdAt?.seconds || 0;
               const bTime = b.updatedAt?.seconds || b.createdAt?.seconds || 0;
               return bTime - aTime;
           }).slice(0, 4);
           setRecentActivity(sortedEduCourses);
        }
        
      } catch (err) {
        console.error(err);
        setError('Failed to fetch dashboard data.');
      } finally {
        setIsDataLoading(false);
      }
    };

    fetchDashboardData();
  }, [authUser, authLoading, router]);

  const handleDismissNotification = async (notification: AppNotification) => {
    try {
      if(!authUser) return;
      const notifRef = doc(db, 'users', authUser.uid, 'notifications', notification.id);
      await deleteDoc(notifRef);
      setNotifications((prev) => prev.filter((n) => n.id !== notification.id));
    } catch (error) {
      console.error('Failed to dismiss notification:', error);
    }
  };

  useEffect(() => {
    const generateSuggestions = async () => {
      if (!userProfile?.learningPath?.length) {
        setSuggestedCourses([]);
        return;
      }
      try {
        const allCoursesSnap = await getDocs(collection(db, 'courses'));
        const allCourses = allCoursesSnap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as Course[];
        const enrolledIds = enrolledCourses.map(c => c.id); 
        
        const scored = allCourses
          .map((c) => {
            const tags = c.tags || [];
            const score = tags.filter((t) => userProfile.learningPath!.includes(t)).length;
            return { ...c, score };
          })
          .filter((c) => c.score > 0 && !enrolledIds.includes(c.id))
          .sort((a, b) => b.score - a.score)
          .slice(0, 3);
        setSuggestedCourses(scored);
      } catch (err) {
        console.error('Failed to generate suggestions:', err);
      }
    };
    generateSuggestions();
  }, [userProfile?.learningPath, enrolledCourses]); 

  // --- RENDER SECTIONS ---

  const renderRecentActivity = () =>
    recentActivity.length > 0 ? (
      <div>
        <div className="flex items-center gap-2 mb-6">
            <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Pick Up Where You Left Off</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {recentActivity.map((c) => (
            <CourseCard key={c.id} course={c} isEnrolled={true} />
          ))}
        </div>
      </div>
    ) : null;

  const renderStudentDashboard = () => (
    <div className="space-y-16">
        
        {/* 1. Notifications */}
        {notifications.length > 0 && (
          <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 flex items-center gap-3">
                <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                    <Bell className="w-5 h-5 text-red-600 dark:text-red-400" />
                </div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">Notifications</h2>
            </div>
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {notifications.map((note) => (
                <div key={note.id} className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                  <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-blue-500" />
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        {note.message}
                        {note.courseId && (
                            <Link href={`/courses/${note.courseId}/view`} className="ml-1.5 font-semibold text-indigo-600 dark:text-indigo-400 hover:underline">
                                View →
                            </Link>
                        )}
                      </p>
                  </div>
                  <button
                    onClick={() => handleDismissNotification(note)}
                    className="text-xs font-medium text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 px-3 py-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    Dismiss
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 2. My Enrolled Courses */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
                <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                    <LayoutDashboard className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">My Learning</h2>
            </div>
            <Link href="/courses" className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:underline">
                Browse Catalog
            </Link>
          </div>

          {enrolledCourses.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {enrolledCourses.map((c) => (
                <CourseCard key={c.id} course={c} isEnrolled />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700">
                <p className="text-gray-500 dark:text-gray-400 mb-4">You haven't enrolled in any courses yet.</p>
                <Link href="/courses" className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-500/30">
                    Explore Courses
                </Link>
            </div>
          )}
        </div>

        {/* 3. Suggested Courses */}
        {suggestedCourses.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-6">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                    <Sparkles className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Suggested For You</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {suggestedCourses.map((c) => (
                <CourseCard key={c.id} course={c} isEnrolled={false} />
              ))}
            </div>
          </div>
        )}

        {/* 4. Recent Activity (History) */}
        {renderRecentActivity()}
    </div>
  );

  const renderEducatorDashboard = () => (
    <div className="space-y-16">
      <div>
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-3">
             <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                <BookOpen className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
             </div>
             <h2 className="text-2xl font-bold text-gray-900 dark:text-white">My Created Courses</h2>
          </div>
          <Link
            href="/courses/create"
            className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl shadow-lg shadow-indigo-500/20 transition-all hover:scale-105 active:scale-95"
          >
            Create New Course <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
        {createdCourses.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {createdCourses.map((c) => (
              <CourseCard key={c.id} course={c} isEducator />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700"><p className="text-gray-500 dark:text-gray-400">You haven't created any courses yet.</p></div>
        )}
      </div>
      {renderRecentActivity()}
    </div>
  );

  const renderAdminDashboard = () => (
    <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm space-y-8">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Admin Tools</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Link href="/admin/users" className="group block p-6 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-200 dark:border-gray-600 hover:border-indigo-500 dark:hover:border-indigo-500 transition-all">
          <h3 className="font-bold text-lg text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 mb-2">User Management</h3>
          <p className="text-sm text-gray-600 dark:text-gray-300">View, edit, and manage all registered users.</p>
        </Link>
        <Link href="/admin/tags" className="group block p-6 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-200 dark:border-gray-600 hover:border-indigo-500 dark:hover:border-indigo-500 transition-all">
          <h3 className="font-bold text-lg text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 mb-2">Tag Management</h3>
          <p className="text-sm text-gray-600 dark:text-gray-300">Create and organize course categories and tags.</p>
        </Link>
      </div>
      {renderRecentActivity()}
    </div>
  );

  if (authLoading || isDataLoading) return <div className="flex flex-col items-center justify-center h-[50vh]"><Loader2 className="w-10 h-10 text-indigo-500 animate-spin mb-4" /><p className="text-gray-500 dark:text-gray-400 font-medium">Loading your dashboard...</p></div>;
  if (error) return <div className="flex justify-center mt-10"><div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-xl flex items-center gap-3 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800"><AlertCircle className="w-5 h-5" /><p>{error}</p></div></div>;

  return (
    <div className="max-w-7xl mx-auto pb-20">
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Dashboard</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Welcome back, <span className="font-semibold text-indigo-600 dark:text-indigo-400">{userProfile?.displayName || authUser?.displayName || userProfile?.email}</span>!
        </p>
      </div>

      {userProfile?.role === 'student' && renderStudentDashboard()}
      {userProfile?.role === 'educator' && renderEducatorDashboard()}
      {userProfile?.role === 'admin' && renderAdminDashboard()}
    </div>
  );
}