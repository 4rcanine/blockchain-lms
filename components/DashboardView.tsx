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
  <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
    <div className="bg-blue-600 h-1.5 rounded-full" style={{ width: `${progress}%` }}></div>
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
  let linkText = 'View & Enroll →';

  if (isEducator) {
    linkHref = `/courses/${course.id}/manage`;
    linkText = 'Manage Course →';
  } else if (isEnrolled) {
    linkHref = `/courses/${course.id}/view`;
    linkText = 'Continue Learning →';
  }

  return (
    <div className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow flex flex-col">
      {course.imageUrl ? (
        <Link href={linkHref}>
          <img
            src={course.imageUrl}
            alt={course.title}
            className="w-full h-40 object-cover rounded-t-lg"
          />
        </Link>
      ) : (
        <div className="w-full h-40 bg-gray-200 rounded-t-lg flex items-center justify-center">
          <span className="text-gray-400">No Image</span>
        </div>
      )}

      <div className="p-4 flex flex-col flex-grow">
        <Link href={linkHref} className="hover:underline">
          <h3 className="font-bold text-lg mb-2">{course.title}</h3>
        </Link>

        {course.tags && course.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {course.tags.map((tag: string) => (
              <Link
                href={`/tags/${encodeURIComponent(tag)}`}
                key={tag}
                className="px-2 py-1 text-xs font-semibold text-indigo-800 bg-indigo-100 rounded-full hover:bg-indigo-200"
              >
                {tag}
              </Link>
            ))}
          </div>
        )}

        <p className="text-sm text-gray-600 mb-4 flex-grow">
          {course.description?.substring(0, 80)}...
        </p>

        {isEnrolled && typeof course.progress === 'number' && (
          <div className="mb-2">
            <div className="flex justify-between items-center text-xs text-gray-500">
              <span>Progress</span>
              <span>{course.progress}%</span>
            </div>
            <ProgressBar progress={course.progress} />
          </div>
        )}

        <Link
          href={linkHref}
          className="font-semibold text-sm text-indigo-600 hover:underline mt-auto"
        >
          {linkText}
        </Link>
      </div>
    </div>
  );
};

// ------------------------------- Main Component --------------------------------
export default function DashboardView() { // Renamed to DashboardView
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

        // Fetch Notifications
        const notifQ = query(
            collection(db, 'users', authUser.uid, 'notifications'),
            orderBy('createdAt', 'desc')
        );
        const notifSnap = await getDocs(notifQ);
        const fetchedNotifs = notifSnap.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })) as AppNotification[];
        setNotifications(fetchedNotifs);

        // STUDENT LOGIC
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
                if(enrollmentDocSnap.exists()) {
                    completedCount = enrollmentDocSnap.data().completedItems?.length || 0;
                }

                cData.progress = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;
                coursesList.push(cData);
            }));

            setEnrolledCourses(coursesList);
        } else {
            setEnrolledCourses([]);
        }

        // EDUCATOR LOGIC
        if (profile.role === 'educator') {
          const createdQ = query(
            collection(db, 'courses'),
            where('instructorIds', 'array-contains', authUser.uid)
          );
          const createdSnap = await getDocs(createdQ);
          setCreatedCourses(
            createdSnap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as Course[]
          );
        }

        // Recent Activity
        const coursesCollectionRef = collection(db, 'courses');
        const recentQ = query(coursesCollectionRef, orderBy('updatedAt', 'desc'), limit(10));
        const recentSnap = await getDocs(recentQ);
        let recentCourses = recentSnap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as Course[];

        if (profile.role === 'student' && profile.enrolledCourses) {
            recentCourses = recentCourses.filter(c => !profile.enrolledCourses?.includes(c.id));
        }
        setRecentActivity(recentCourses.slice(0, 5));
        
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

  const renderRecentActivity = () =>
    recentActivity.length ? (
      <div>
        <h2 className="text-2xl font-semibold mb-4">🕓 Recent Activity</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {recentActivity.map((c) => (
            <CourseCard key={c.id} course={c} />
          ))}
        </div>
      </div>
    ) : null;

  const renderStudentDashboard = () => {
    if (!userProfile) return null;
    return (
      <div className="space-y-12">
        {notifications.length > 0 && (
          <div className="p-6 bg-green-100 border border-green-300 rounded-lg">
            <h2 className="text-2xl font-semibold text-green-800 mb-4">Notifications</h2>
            <div className='space-y-3'>
              {notifications.map((note) => (
                <div key={note.id} className="flex justify-between items-center bg-white p-3 rounded-md shadow-sm">
                  <p className="text-gray-800">
                    {note.message}
                    {note.courseId && (
                        <Link href={`/courses/${note.courseId}/view`} className='ml-2 font-bold text-indigo-600 hover:underline'>
                            View Course →
                        </Link>
                    )}
                  </p>
                  <button onClick={() => handleDismissNotification(note)} className="text-sm font-semibold text-gray-500 hover:text-gray-800 ml-4">
                    Dismiss
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
        {suggestedCourses.length > 0 && (
          <div>
            <h2 className="text-2xl font-semibold mb-4">📚 Courses Suggested For You</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {suggestedCourses.map((c) => (
                <CourseCard key={c.id} course={c} isEnrolled={false} />
              ))}
            </div>
          </div>
        )}
        <div>
          <h2 className="text-2xl font-semibold mb-4">My Enrolled Courses</h2>
          {enrolledCourses.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {enrolledCourses.map((c) => (
                <CourseCard key={c.id} course={c} isEnrolled />
              ))}
            </div>
          ) : (
            <p>You are not yet enrolled in any courses. <Link href="/courses" className="text-indigo-600 hover:underline">Browse the catalog!</Link></p>
          )}
        </div>
        {renderRecentActivity()}
      </div>
    );
  };

  const renderEducatorDashboard = () => (
    <div className="space-y-12">
      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-semibold">My Created Courses</h2>
          <Link href="/courses/create" className="px-4 py-2 font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700">
            Create New Course
          </Link>
        </div>
        {createdCourses.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {createdCourses.map((c) => (
              <CourseCard key={c.id} course={c} isEducator />
            ))}
          </div>
        ) : (
          <p>You have not created any courses yet.</p>
        )}
      </div>
      {renderRecentActivity()}
    </div>
  );

  const renderAdminDashboard = () => (
    <div className="p-6 bg-gray-100 rounded-lg">
      <h2 className="text-2xl font-semibold mb-4">Admin Tools</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link href="/admin/users" className="block p-4 bg-white rounded-md shadow hover:shadow-lg transition-shadow">
          <h3 className="font-bold">User Management</h3>
          <p className="text-sm text-gray-600">View and manage all users.</p>
        </Link>
        <Link href="/admin/tags" className="block p-4 bg-white rounded-md shadow hover:shadow-lg transition-shadow">
          <h3 className="font-bold">Tag Management</h3>
          <p className="text-sm text-gray-600">Create and manage course tags.</p>
        </Link>
      </div>
      {renderRecentActivity()}
    </div>
  );

  if (authLoading || isDataLoading) return <div className="text-center mt-10">Loading Dashboard...</div>;
  if (error) return <div className="text-center mt-10 text-red-500">{error}</div>;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-gray-600">Welcome back, {userProfile?.displayName || authUser?.displayName || userProfile?.email}!</p>
      </div>
      {userProfile?.role === 'student' && renderStudentDashboard()}
      {userProfile?.role === 'educator' && renderEducatorDashboard()}
      {userProfile?.role === 'admin' && renderAdminDashboard()}
    </div>
  );
}