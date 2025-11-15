//app/(student)/dashboard/page.tsx

'use client';

import React, { useEffect, useState } from 'react';
import {
  doc,
  getDoc,
  collection,
  collectionGroup,
  query,
  where,
  getDocs,
  updateDoc,
  orderBy,
  limit,
  DocumentData,
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

interface EnrollmentNotification {
  courseId: string;
  courseTitle: string;
  enrollmentDocId: string;
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
    // Note: The original implementation used '__name__', 'in', which is typically
    // used for document IDs. For general queries using fields, the 'where'
    // condition would target that field. Given the context (likely for a future
    // use case or if `collectionRef` is not 'courses'), I will leave the original
    // logic as is, assuming it works for the intended Firebase structure.
    const q = query(collectionRef, where('__name__', 'in', batch));
    const snap = await getDocs(q);
    snap.docs.forEach((d) => results.push({ id: d.id, ...(d.data() as any) }));
  }
  return results;
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
        // Wrap image with Link
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
        {/* === UPDATED: Wrap <h3> with <Link> === */}
        <Link href={linkHref} className="hover:underline">
          <h3 className="font-bold text-lg mb-2">{course.title}</h3>
        </Link>
        {/* ================================== */}

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

        {/* --- NEW Progress Bar --- */}
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

// ------------------------------- Dashboard --------------------------------
export default function Dashboard() {
  const { user: authUser, loading: authLoading } = useAuth();
  const router = useRouter();

  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [enrolledCourses, setEnrolledCourses] = useState<Course[]>([]);
  const [createdCourses, setCreatedCourses] = useState<Course[]>([]);
  const [suggestedCourses, setSuggestedCourses] = useState<Course[]>([]);
  const [recentActivity, setRecentActivity] = useState<Course[]>([]);
  const [notifications, setNotifications] = useState<EnrollmentNotification[]>([]); // NEW: Notification state
  const [error, setError] = useState<string | null>(null);
  const [changingPath, setChangingPath] = useState(false);
  const [isDataLoading, setIsDataLoading] = useState(true);

  // ---------------- Fetch Dashboard Data ----------------
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

        // --- Student Enrolled Courses with Progress ---
        let enrolledCourseIds: string[] = [];
        if (profile.role === 'student') {
          const reqQuery = query(
            collectionGroup(db, 'enrollmentRequests'),
            where('status', '==', 'enrolled'),
            where('studentId', '==', authUser.uid)
          );
          const enrolledSnap = await getDocs(reqQuery);

          if (!enrolledSnap.empty) {
            const courseIds = enrolledSnap.docs.map((doc) => doc.ref.parent.parent!.id);
            enrolledCourseIds = courseIds; // Store for notification logic & recent activity filter
            const progressMap = new Map(
              enrolledSnap.docs.map((doc) => [
                doc.ref.parent.parent!.id,
                doc.data().completedItems?.length || 0,
              ])
            );

            const coursesSnap = await getDocs(
              query(collection(db, 'courses'), where('__name__', 'in', courseIds))
            );

            const coursesList: Course[] = [];
            for (const courseDoc of coursesSnap.docs) {
              const cData = { id: courseDoc.id, ...courseDoc.data() } as Course;
              const modulesSnap = await getDocs(collection(db, 'courses', courseDoc.id, 'modules'));
              let totalLessons = 0;
              modulesSnap.forEach((mod) => {
                totalLessons += mod.data().lessons?.length || 0;
              });
              const completed = progressMap.get(courseDoc.id) || 0;
              cData.progress = totalLessons > 0 ? Math.round((completed / totalLessons) * 100) : 0;
              coursesList.push(cData);
            }
            setEnrolledCourses(coursesList);
          } else {
            setEnrolledCourses([]);
          }

          // --- NEW: Fetch Notifications (moved inside student logic) ---
          const requestsQuery = query(
            collectionGroup(db, 'enrollmentRequests'),
            where('studentId', '==', authUser.uid),
            where('status', '==', 'enrolled'),
            where('acknowledgedByStudent', '==', false) // Find un-acknowledged approvals
          );
          const notificationSnapshot = await getDocs(requestsQuery);

          if (!notificationSnapshot.empty) {
            const newNotifications: EnrollmentNotification[] = [];
            for (const doc of notificationSnapshot.docs) {
              const courseId = doc.ref.parent.parent!.id;
              const courseDoc = await getDoc(doc.ref.parent.parent!);
              if (courseDoc.exists()) {
                newNotifications.push({
                  courseId: courseId,
                  courseTitle: courseDoc.data().title,
                  enrollmentDocId: doc.id,
                });
              }
            }
            setNotifications(newNotifications);
          } else {
            setNotifications([]);
          }
        }

        // --- Educator Created Courses ---
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

        // --- Recent Activity (Updated to filter out enrolled courses for students) ---
        const coursesCollectionRef = collection(db, 'courses');
        let recentQ;
        
        // Batch 'not in' is not directly supported, so we fetch all recent courses
        // and then filter in memory if the user is a student with enrolled courses.
        // For simplicity and to use the `limit` clause effectively for *recent* items,
        // we'll fetch the top 20 and filter in memory if they are enrolled.
        // A full Firebase-optimized solution would involve querying courses that
        // don't have an enrollment subcollection for the user, which is complex.
        
        // Fetch the top 20 most recently updated courses
        recentQ = query(coursesCollectionRef, orderBy('updatedAt', 'desc'), limit(20));
        const recentSnap = await getDocs(recentQ);
        
        let recentCourses = recentSnap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as Course[];

        if (profile.role === 'student') {
            // Filter out courses the student is already enrolled in
            recentCourses = recentCourses.filter(c => !enrolledCourseIds.includes(c.id));
        }

        // Take the top 5 after filtering
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

  // --- NEW: Function to dismiss a notification ---
  const handleDismissNotification = async (notification: EnrollmentNotification) => {
    try {
      const requestDocRef = doc(
        db,
        'courses',
        notification.courseId,
        'enrollmentRequests',
        notification.enrollmentDocId
      );
      await updateDoc(requestDocRef, {
        acknowledgedByStudent: true,
      });
      // Remove the notification from the UI instantly
      setNotifications((prevNotifications) =>
        prevNotifications.filter((n) => n.enrollmentDocId !== notification.enrollmentDocId)
      );
    } catch (error) {
      console.error('Failed to dismiss notification:', error);
    }
  };

  // ---------------- Save & Change Learning Path ----------------
  const handleSavePath = async (path: string[]) => {
    if (!authUser || !userProfile) return;
    try {
      await updateDoc(doc(db, 'users', authUser.uid), { learningPath: path });
      setUserProfile({ ...userProfile, learningPath: path });
      // Rerun suggestions after path is saved
      // NOTE: This effect runs automatically due to the dependency on `userProfile?.learningPath`
    } catch (err) {
      console.error('Failed to save learning path:', err);
    }
  };

  const handleChangeLearningPath = async () => {
    if (!authUser || !userProfile) return;
    if (!confirm('Are you sure you want to change your learning path? This will reset your current path and suggestions.')) return;

    try {
      setChangingPath(true);
      await updateDoc(doc(db, 'users', authUser.uid), { learningPath: [] });
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
        const allCoursesSnap = await getDocs(collection(db, 'courses'));
        const allCourses = allCoursesSnap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as Course[];
        const enrolledIds = enrolledCourses.map(c => c.id); // Use already fetched enrolled courses
        
        const scored = allCourses
          .map((c) => {
            const tags = c.tags || [];
            const score = tags.filter((t) => userProfile.learningPath!.includes(t)).length;
            return { ...c, score };
          })
          .filter(
            // Filter by score > 0 AND NOT enrolled
            (c) =>
              c.score > 0 &&
              !enrolledIds.includes(c.id) // Use the enrolledIds list
          )
          .sort((a, b) => b.score - a.score)
          .slice(0, 3);
        setSuggestedCourses(scored);
      } catch (err) {
        console.error('Failed to generate suggestions:', err);
      }
    };
    // Re-run when learningPath or enrolledCourses changes
    generateSuggestions();
  }, [userProfile?.learningPath, enrolledCourses]); 

  // ---------------- Render Sections ----------------
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
    const learningPath = userProfile.learningPath || [];
    const firstStep = learningPath[0];

    return (
      <div className="space-y-12">
        {/* --- NEW Notification Section --- */}
        {notifications.length > 0 && (
          <div className="p-6 bg-green-100 border border-green-300 rounded-lg">
            <h2 className="text-2xl font-semibold text-green-800 mb-4">Notifications</h2>
            <div className='space-y-3'>
              {notifications.map((note) => (
                <div
                  key={note.enrollmentDocId} // Use unique doc ID for key
                  className="flex justify-between items-center bg-white p-3 rounded-md shadow-sm"
                >
                  <p>
                    🎉 You've been enrolled in{' '}
                    <Link href={`/courses/${note.courseId}/view`} className='font-bold text-indigo-600 hover:underline'>
                      {note.courseTitle}
                    </Link>
                    !
                  </p>
                  <button
                    onClick={() => handleDismissNotification(note)}
                    className="text-sm font-semibold text-gray-500 hover:text-gray-800"
                  >
                    Dismiss
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {!learningPath.length ? (
          <div>
            <h2 className="text-2xl font-semibold mb-4">Personalize Your Learning</h2>
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
                  <h2 className="text-2xl font-semibold mb-3">🎯 Your Learning Path</h2>
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
                  Begin with: <span className="font-bold text-indigo-700">{firstStep}</span>
                </p>
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
  if (authLoading || isDataLoading)
    return <div className="text-center mt-10">Loading Dashboard...</div>;
  if (error)
    return <div className="text-center mt-10 text-red-500">{error}</div>;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-gray-600">
          Welcome back, {userProfile?.displayName || authUser?.displayName || userProfile?.email}!
        </p>
      </div>

      {userProfile?.role === 'student' && renderStudentDashboard()}
      {userProfile?.role === 'educator' && renderEducatorDashboard()}
      {userProfile?.role === 'admin' && renderAdminDashboard()}
    </div>
  );
}