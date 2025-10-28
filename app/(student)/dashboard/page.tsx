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
  orderBy,
  limit,
} from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import useAuth from '@/hooks/useAuth';
import { db } from '@/firebase/config';
import Link from 'next/link';
import LearningPathGenerator from '@/components/LearningPathGenerator';
import { Loader2, RefreshCcw } from 'lucide-react';

// ----------------------------- Types ------------------------------------
interface UserProfile {
  email: string;
  role: 'student' | 'educator' | 'admin';
  enrolledCourses?: string[];
  learningPath?: string[];
}

interface Course {
  id: string;
  title: string;
  description: string;
  tags: string[];
  imageUrl?: string; // ✅ Added for course cover image
  instructorId?: string;
  createdAt?: any;
  updatedAt?: any;
  [k: string]: any;
}

// -------------------------- Utility: batch 'in' queries ------------------
async function fetchDocsByIds(
  collectionRef: ReturnType<typeof collection>,
  ids: string[]
): Promise<DocumentData[]> {
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

// ---------------------------- UPDATED CourseCard ------------------------
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
      {/* --- ✅ Course Cover Image --- */}
      {course.imageUrl ? (
        <img
          src={course.imageUrl}
          alt={course.title}
          className="w-full h-40 object-cover rounded-t-lg"
        />
      ) : (
        <div className="w-full h-40 bg-gray-200 rounded-t-lg flex items-center justify-center">
          <span className="text-gray-400">No Image</span>
        </div>
      )}
      <div className="p-4 flex flex-col flex-grow">
        <h3 className="font-bold text-lg mb-2">{course.title}</h3>
        <p className="text-sm text-gray-600 mb-4 flex-grow">
          {course.description?.substring(0, 80)}...
        </p>
        <Link
          href={linkHref}
          className="font-semibold text-sm text-indigo-600 hover:underline mt-2"
        >
          {linkText}
        </Link>
      </div>
    </div>
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
  const [recentActivity, setRecentActivity] = useState<Course[]>([]);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [changingPath, setChangingPath] = useState(false);

  // ---------------- Fetch Dashboard Data ----------------
  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.push('/login');
      return;
    }

    const fetchDashboardData = async () => {
      setIsDataLoading(true);
      try {
        const userDocRef = doc(db, 'users', user.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (!userDocSnap.exists()) throw new Error('User profile not found.');
        const profileData = userDocSnap.data() as UserProfile;
        setUserProfile(profileData);

        // Fetch enrolled courses for students
        if (profileData.role === 'student') {
          if (profileData.enrolledCourses?.length) {
            const enrolledDocs = await fetchDocsByIds(
              collection(db, 'courses'),
              profileData.enrolledCourses
            );
            setEnrolledCourses(enrolledDocs as Course[]);
          } else setEnrolledCourses([]);
        }

        // Fetch educator-created courses
        if (profileData.role === 'educator') {
          const createdQ = query(
        collection(db, 'courses'),
        where('instructorIds', 'array-contains', user.uid)
    );
          const createdSnap = await getDocs(createdQ);
          setCreatedCourses(
            createdSnap.docs.map((d) => ({
              id: d.id,
              ...(d.data() as any),
            })) as Course[]
          );
        }

        // Fetch recent activity
        const recentQ = query(
          collection(db, 'courses'),
          orderBy('updatedAt', 'desc'),
          limit(5)
        );
        const recentSnap = await getDocs(recentQ);
        const recent = recentSnap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as any),
        })) as Course[];
        setRecentActivity(recent);

        setError(null);
      } catch (err) {
        console.error(err);
        setError('Failed to fetch dashboard data.');
      } finally {
        setIsDataLoading(false);
      }
    };

    fetchDashboardData();
  }, [user, loading, router]);

  // ---------------- Save Learning Path ----------------
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

  // ---------------- Change Learning Path ----------------
  const handleChangeLearningPath = async () => {
    if (!user || !userProfile) return;
    if (!confirm('Are you sure you want to change your learning path?')) return;

    try {
      setChangingPath(true);
      const userDocRef = doc(db, 'users', user.uid);
      await updateDoc(userDocRef, { learningPath: [] });
      setUserProfile({ ...userProfile, learningPath: [] });
    } catch (err) {
      console.error('Failed to reset learning path:', err);
    } finally {
      setChangingPath(false);
    }
  };

  // ---------------- Generate Suggested Courses ----------------
  useEffect(() => {
    const generateSuggestions = async () => {
      if (!userProfile?.learningPath?.length) {
        setSuggestedCourses([]);
        return;
      }

      try {
        const snapshot = await getDocs(query(collection(db, 'courses')));
        const allCourses = snapshot.docs.map((d) => ({
          id: d.id,
          ...(d.data() as any),
        })) as Course[];

        const scoredCourses = allCourses
          .map((c) => {
            const tags = c.tags || [];
            let score = 0;
            tags.forEach((t) => {
              if (userProfile.learningPath!.includes(t)) score++;
            });
            return { ...c, score };
          })
          .filter(
            (c) =>
              c.score > 0 &&
              (!userProfile.enrolledCourses ||
                !userProfile.enrolledCourses.includes(c.id))
          )
          .sort((a, b) => b.score - a.score)
          .slice(0, 3);

        setSuggestedCourses(scoredCourses);
      } catch (err) {
        console.error('Failed to generate suggestions:', err);
      }
    };

    generateSuggestions();
  }, [userProfile?.learningPath, userProfile?.enrolledCourses]);

  // -------------------- Renderers --------------------
  const renderRecentActivity = () => {
    if (!recentActivity.length) return null;
    return (
      <div>
        <h2 className="text-2xl font-semibold mb-4">🕓 Recent Activity</h2>
        <p className="text-sm text-gray-600 mb-4">
          The most recently updated or added courses across the platform.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {recentActivity.map((c) => (
            <CourseCard key={c.id} course={c} />
          ))}
        </div>
      </div>
    );
  };

  const renderStudentDashboard = () => {
    if (!userProfile) return null;
    const learningPath = userProfile.learningPath || [];
    const firstStep = learningPath[0];

    return (
      <div className="space-y-12">
        {!learningPath.length ? (
          <div>
            <h2 className="text-2xl font-semibold mb-4">
              Personalize Your Learning
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              Generate a learning path and we’ll suggest courses tailored to your goals.
            </p>
            <LearningPathGenerator onPathGenerated={handleSavePath} />
          </div>
        ) : (
          <div className="space-y-8">
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                <div>
                  <h2 className="text-2xl font-semibold mb-3">
                    🎯 Your Learning Path
                  </h2>
                  <div className="flex flex-wrap gap-2">
                    {learningPath.map((step, i) => (
                      <span
                        key={i}
                        className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm"
                      >
                        {step}
                      </span>
                    ))}
                  </div>
                </div>
                <button
                  onClick={handleChangeLearningPath}
                  disabled={changingPath}
                  className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 disabled:opacity-50 transition"
                >
                  {changingPath ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Changing...
                    </>
                  ) : (
                    <>
                      <RefreshCcw className="w-4 h-4" /> Change Learning Path
                    </>
                  )}
                </button>
              </div>
            </div>

            {firstStep && (
              <div className="bg-indigo-50 p-6 rounded-lg border border-indigo-200">
                <h3 className="text-xl font-semibold">🚀 Start Here</h3>
                <p className="text-gray-700">
                  Begin with:{' '}
                  <span className="font-bold text-indigo-700">{firstStep}</span>
                </p>
              </div>
            )}

            {suggestedCourses.length > 0 && (
              <div>
                <h2 className="text-2xl font-semibold mb-4">
                  📚 Courses Suggested For You
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {suggestedCourses.map((c) => (
                    <CourseCard key={c.id} course={c} isEnrolled={false} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div>
          <h2 className="text-2xl font-semibold mb-4">My Enrolled Courses</h2>
          {enrolledCourses.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {enrolledCourses.map((c) => (
                <CourseCard key={c.id} course={c} isEnrolled={true} />
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

        {renderRecentActivity()}
      </div>
    );
  };

  const renderEducatorDashboard = () => (
    <div className="space-y-12">
      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-semibold">My Created Courses</h2>
          <Link
            href="/courses/create"
            className="px-4 py-2 font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
          >
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
        <Link
          href="/admin/users"
          className="block p-4 bg-white rounded-md shadow hover:shadow-lg transition-shadow"
        >
          <h3 className="font-bold">User Management</h3>
          <p className="text-sm text-gray-600">View and manage all users.</p>
        </Link>
        <Link
          href="/admin/tags"
          className="block p-4 bg-white rounded-md shadow hover:shadow-lg transition-shadow"
        >
          <h3 className="font-bold">Tag Management</h3>
          <p className="text-sm text-gray-600">Create and manage course tags.</p>
        </Link>
      </div>

      {renderRecentActivity()}
    </div>
  );

  // -------------------- Main Render --------------------
  if (loading || isDataLoading)
    return <div className="text-center mt-10">Loading Dashboard...</div>;
  if (error)
    return <div className="text-center mt-10 text-red-500">{error}</div>;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-gray-600">Welcome back, {userProfile?.email}!</p>
      </div>

      {userProfile?.role === 'student' && renderStudentDashboard()}
      {userProfile?.role === 'educator' && renderEducatorDashboard()}
      {userProfile?.role === 'admin' && renderAdminDashboard()}
    </div>
  );
}
