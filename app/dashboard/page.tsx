// app/dashboard/page.tsx
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
  DocumentData,
} from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import useAuth from '@/hooks/useAuth';
import { db } from '@/firebase/config';
import Link from 'next/link';
import LearningPathGenerator from '@/components/LearningPathGenerator';

// ----------------------------- Types ------------------------------------
interface UserProfile {
  email: string;
  role: 'student' | 'educator' | 'admin';
  enrolledCourses?: string[];
  learningPath?: string[]; // tags or keywords
}
interface Course {
  id: string;
  title: string;
  description: string;
  tags?: string[];
  instructorId?: string;
  [k: string]: any;
}

// -------------------------- Utility: batch 'in' queries ------------------
// Firestore 'in' operator supports up to 10 values. This helper splits ids into batches.
async function fetchDocsByIds(collectionRef: ReturnType<typeof collection>, ids: string[]): Promise<DocumentData[]> {
  if (!ids || ids.length === 0) return [];
  const batches: string[][] = [];
  for (let i = 0; i < ids.length; i += 10) batches.push(ids.slice(i, i + 10));
  const results: DocumentData[] = [];
  for (const batch of batches) {
    const q = query(collectionRef, where('__name__', 'in', batch));
    const snap = await getDocs(q);
    snap.docs.forEach((d) => results.push({ id: d.id, ...(d.data() as any) }));
  }
  return results;
}

// ---------------------------- Enhanced CourseCard ------------------------
const CourseCard = ({ course, isEducator = false }: { course: Course; isEducator?: boolean }) => {
  const shortDesc =
    course.description && course.description.length > 120 ? `${course.description.slice(0, 117)}...` : course.description || '';

  return (
    <article className="bg-white p-4 rounded-lg shadow hover:shadow-lg transition-shadow h-full flex flex-col">
      <div className="flex-1">
        <h3 className="font-bold text-lg mb-2">{course.title}</h3>
        <p className="text-sm text-gray-600 mb-3">{shortDesc}</p>

        {course.tags && course.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {course.tags.map((t) => (
              <span key={t} className="text-xs px-2 py-1 bg-gray-100 rounded-full text-gray-700">
                {t}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="mt-3 flex items-center justify-between">
        {isEducator ? (
          <Link href={`/courses/${course.id}/manage`} className="text-sm font-semibold text-indigo-600 hover:underline">
            Manage Course →
          </Link>
        ) : (
          <Link href={`/courses/${course.id}/view`} className="text-sm font-semibold text-indigo-600 hover:underline">
            Start Learning →
          </Link>
        )}

        {isEducator && (
          <Link href={`/courses/${course.id}/analytics`} className="text-xs px-2 py-1 bg-gray-200 rounded ml-2">
            Analytics
          </Link>
        )}
      </div>
    </article>
  );
};

// ------------------------------- Dashboard --------------------------------
export default function Dashboard() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [enrolledCourses, setEnrolledCourses] = useState<Course[]>([]);
  const [createdCourses, setCreatedCourses] = useState<Course[]>([]);
  const [suggestedCourses, setSuggestedCourses] = useState<Course[]>([]);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch profile + courses based on role
  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.push('/login');
      return;
    }

    const fetchDashboardData = async () => {
      setIsDataLoading(true);
      try {
        // Fetch user profile
        const userDocRef = doc(db, 'users', user.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (!userDocSnap.exists()) throw new Error('User profile not found.');
        const profileData = userDocSnap.data() as UserProfile;
        setUserProfile(profileData);

        // Student: fetch enrolled courses (batched if >10)
        if (profileData.role === 'student') {
          if (profileData.enrolledCourses && profileData.enrolledCourses.length > 0) {
            const enrolledDocs = await fetchDocsByIds(collection(db, 'courses'), profileData.enrolledCourses);
            setEnrolledCourses(enrolledDocs as Course[]);
          } else {
            setEnrolledCourses([]);
          }
        }

        // Educator: fetch courses created by educator
        if (profileData.role === 'educator') {
          const createdQ = query(collection(db, 'courses'), where('instructorId', '==', user.uid));
          const createdSnap = await getDocs(createdQ);
          const createdList = createdSnap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as Course[];
          setCreatedCourses(createdList);
        }

        setError(null);
      } catch (err: any) {
        console.error(err);
        setError('Failed to fetch dashboard data.');
      } finally {
        setIsDataLoading(false);
      }
    };

    fetchDashboardData();
  }, [user, loading, router]);

  // Save learning path to user's doc
  const handleSavePath = async (path: string[]) => {
    if (!user || !userProfile) return;
    try {
      const userDocRef = doc(db, 'users', user.uid);
      await updateDoc(userDocRef, { learningPath: path });
      setUserProfile({ ...userProfile, learningPath: path });
    } catch (err) {
      console.error('Failed to save learning path:', err);
    }
  };

  // Generate suggestions when learningPath changes
  useEffect(() => {
    const generateSuggestions = async () => {
      if (!userProfile?.learningPath || userProfile.learningPath.length === 0) {
        setSuggestedCourses([]);
        return;
      }

      try {
        const coursesSnapshot = await getDocs(query(collection(db, 'courses')));
        const allCourses = coursesSnapshot.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as Course[];

        // Score each course by matching tags with learningPath
        const scored = allCourses
          .map((c) => {
            const tags = c.tags || [];
            let score = 0;
            tags.forEach((t) => {
              if (userProfile.learningPath!.includes(t)) score++;
            });
            return { course: c, score };
          })
          // exclude already enrolled courses for students
          .filter((x) => {
            if (userProfile.role === 'student' && userProfile.enrolledCourses?.includes(x.course.id)) return false;
            return x.score > 0;
          })
          .sort((a, b) => b.score - a.score)
          .slice(0, 3) // top 3 suggestions (adjust as needed)
          .map((x) => x.course);

        setSuggestedCourses(scored);
      } catch (err) {
        console.error('Failed to generate suggestions:', err);
      }
    };

    generateSuggestions();
  }, [userProfile?.learningPath, userProfile?.role, userProfile?.enrolledCourses]);

  // -------------------- Renderers for role-specific dashboards --------------------

  const renderStudentDashboard = () => {
    if (!userProfile) return null;

    return (
      <div className="space-y-12">
        {/* If no learning path -> show generator */}
        {!userProfile.learningPath || userProfile.learningPath.length === 0 ? (
          <div>
            <h2 className="text-2xl font-semibold mb-4">Personalize Your Learning</h2>
            <p className="text-sm text-gray-600 mb-4">
              Generate a recommended learning path and we'll suggest courses tailored to your goals.
            </p>
            <LearningPathGenerator onPathGenerated={handleSavePath} />
          </div>
        ) : (
          suggestedCourses.length > 0 && (
            <div>
              <h2 className="text-2xl font-semibold mb-4">Courses Suggested For You</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {suggestedCourses.map((c) => (
                  <CourseCard key={c.id} course={c} />
                ))}
              </div>
            </div>
          )
        )}

        {/* Enrolled courses always visible */}
        <div>
          <h2 className="text-2xl font-semibold mb-4">My Enrolled Courses</h2>
          {enrolledCourses.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {enrolledCourses.map((c) => (
                <CourseCard key={c.id} course={c} />
              ))}
            </div>
          ) : (
            <p>
              You are not yet enrolled in any courses.{' '}
              <Link href="/courses" className="text-indigo-600 hover:underline">
                Browse the catalog!
              </Link>
            </p>
          )}
        </div>
      </div>
    );
  };

  const renderEducatorDashboard = () => {
    return (
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
    );
  };

  const renderAdminDashboard = () => {
    return (
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
      </div>
    );
  };

  // -------------------- Main render + loading/errors --------------------
  if (loading || isDataLoading) {
    return <div className="text-center mt-10">Loading Dashboard...</div>;
  }
  if (error) {
    return <div className="text-center mt-10 text-red-500">{error}</div>;
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-gray-600">Welcome back, {userProfile?.email}!</p>
      </div>

      {/* Role-specific content */}
      {userProfile?.role === 'student' && renderStudentDashboard()}
      {userProfile?.role === 'educator' && renderEducatorDashboard()}
      {userProfile?.role === 'admin' && renderAdminDashboard()}
    </div>
  );
}
