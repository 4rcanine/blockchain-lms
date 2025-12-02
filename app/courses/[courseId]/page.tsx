// app/courses/[courseId]/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { 
  doc, 
  getDoc, 
  serverTimestamp, 
  collection, 
  writeBatch 
} from 'firebase/firestore';
import { db } from '@/firebase/config';
import useAuth from '@/hooks/useAuth';
import { useParams, useRouter } from 'next/navigation';
import BackButton from '@/components/BackButton';
import Link from 'next/link';
import { 
    BookOpen, 
    CheckCircle, 
    Clock, 
    AlertCircle, 
    Loader2, 
    Tag,
    UserPlus,
    Lock
} from 'lucide-react';

// --- Types ---
interface Course { 
  title: string; 
  description: string; 
  tags: string[]; 
  imageUrl?: string;
  instructorIds?: string[];
}

type EnrollmentStatus = 'unenrolled' | 'pending' | 'enrolled' | 'rejected';

// --- Helper Component: Status Badge ---
const StatusBadge = ({ status }: { status: EnrollmentStatus }) => {
    if (status === 'enrolled') {
        return (
            <div className="flex items-center gap-2 px-4 py-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full text-sm font-bold">
                <CheckCircle className="w-4 h-4" /> Enrolled
            </div>
        );
    }
    if (status === 'pending') {
        return (
            <div className="flex items-center gap-2 px-4 py-2 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-full text-sm font-bold">
                <Clock className="w-4 h-4" /> Enrollment Pending
            </div>
        );
    }
    if (status === 'rejected') {
        return (
            <div className="flex items-center gap-2 px-4 py-2 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-full text-sm font-bold">
                <AlertCircle className="w-4 h-4" /> Application Rejected
            </div>
        );
    }
    return null;
};

export default function CourseDetailPage() {
  const { user } = useAuth();
  const params = useParams();
  const router = useRouter();
  const courseId = params.courseId as string;

  const [course, setCourse] = useState<Course | null>(null);
  const [enrollmentStatus, setEnrollmentStatus] = useState<EnrollmentStatus>('unenrolled');
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // --- 1. Fetch Data Effect ---
  useEffect(() => {
    if (!courseId) return;

    const fetchCourseAndEnrollmentStatus = async () => {
      try {
        // Fetch course details
        const courseDocRef = doc(db, 'courses', courseId);
        const courseDocSnap = await getDoc(courseDocRef);
        if (!courseDocSnap.exists()) {
          setError('Course not found.');
          return;
        }
        setCourse(courseDocSnap.data() as Course);

        // If user is logged in, check their enrollment request status
        if (user) {
          const requestDocRef = doc(db, 'courses', courseId, 'enrollmentRequests', user.uid);
          const requestDocSnap = await getDoc(requestDocRef);
          
          if (requestDocSnap.exists()) {
            setEnrollmentStatus(requestDocSnap.data().status as EnrollmentStatus);
          } else {
            setEnrollmentStatus('unenrolled');
          }
        }
      } catch (err) {
        console.error(err);
        setError('Failed to load course details.');
      } finally {
        setLoading(false);
      }
    };

    fetchCourseAndEnrollmentStatus();
  }, [courseId, user]);

  // --- 2. Handle Enrollment ---
  const handleEnroll = async () => {
    if (!user) {
      router.push('/login');
      return;
    }
    if (!course) return;

    const instructorIds = course.instructorIds;
    if (!instructorIds || instructorIds.length === 0) {
        setError("Cannot enroll: No instructor assigned to this course.");
        return;
    }

    setIsSubmitting(true);
    try {
      const batch = writeBatch(db);

      // A. Create enrollment request
      const requestDocRef = doc(db, 'courses', courseId, 'enrollmentRequests', user.uid);
      batch.set(requestDocRef, {
        status: 'pending',
        requestedAt: serverTimestamp(),
        studentEmail: user.email,
        studentId: user.uid,
        courseId: courseId, 
      }, { merge: true });

      // B. Notify Instructors
      instructorIds.forEach((instructorId) => {
          const notificationRef = doc(collection(db, 'users', instructorId, 'notifications'));
          batch.set(notificationRef, {
              message: `${user.email} has requested to enroll in your course: ${course.title}`,
              courseId: courseId,
              type: 'enrollment_request',
              createdAt: serverTimestamp(),
              isRead: false
          });
      });
      
      await batch.commit();
      setEnrollmentStatus('pending');
    } catch (error) {
      console.error("Failed to submit enrollment request:", error);
      setError('Failed to submit enrollment request. Please try again.');
    } finally {
        setIsSubmitting(false);
    }
  };
  
  // --- 3. Render Helpers ---
  const getButtonConfig = () => {
    switch (enrollmentStatus) {
      case 'enrolled':
        return { 
            text: 'Go to Course', 
            disabled: false, 
            onClick: () => router.push(`/courses/${courseId}/view`),
            className: 'bg-green-600 hover:bg-green-700 text-white'
        };
      case 'pending':
        return { 
            text: 'Application Pending', 
            disabled: true, 
            className: 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800 cursor-not-allowed'
        };
      case 'rejected':
        return { 
            text: 'Enrollment Declined', 
            disabled: true, 
            className: 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 cursor-not-allowed' 
        };
      default:
        return { 
            text: 'Request Enrollment', 
            disabled: false, 
            onClick: handleEnroll, 
            className: 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/30' 
        };
    }
  };

  if (loading) return (
    <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
    </div>
  );

  if (error) return (
    <div className="flex h-[50vh] items-center justify-center">
         <div className="text-center bg-red-50 dark:bg-red-900/20 p-8 rounded-2xl border border-red-100 dark:border-red-800">
            <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-3" />
            <h2 className="text-lg font-bold text-red-700 dark:text-red-400">{error}</h2>
            <BackButton />
         </div>
    </div>
  );

  if (!course) return null;

  const btnConfig = getButtonConfig();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gray-900 py-12 px-4 transition-colors duration-300">
        <div className="max-w-4xl mx-auto">
            
            <div className="mb-6">
                <BackButton />
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
                
                {/* --- Hero Image Section --- */}
                <div className="relative h-64 md:h-80 w-full bg-gray-200 dark:bg-gray-700">
                    {course.imageUrl ? (
                        <img 
                            src={course.imageUrl} 
                            alt={course.title} 
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400 dark:text-gray-500">
                            <BookOpen className="w-20 h-20 opacity-50" />
                        </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                    
                    <div className="absolute bottom-0 left-0 p-8 text-white">
                        <h1 className="text-3xl md:text-5xl font-bold mb-3 drop-shadow-md">{course.title}</h1>
                        <div className="flex flex-wrap gap-2">
                            {course.tags.map(tag => (
                                <span key={tag} className="px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-sm font-medium border border-white/30">
                                    {tag}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>

                {/* --- Content Section --- */}
                <div className="p-8 md:p-10">
                    <div className="flex flex-col md:flex-row gap-10">
                        
                        {/* Left: Description */}
                        <div className="flex-1 space-y-6">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                    <BookOpen className="w-5 h-5 text-indigo-500" /> About this Course
                                </h2>
                                <div className="prose dark:prose-invert max-w-none text-gray-600 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                                    {course.description}
                                </div>
                            </div>
                        </div>

                        {/* Right: Action Card */}
                        <div className="md:w-80 flex-shrink-0">
                            <div className="bg-gray-50 dark:bg-gray-900/50 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 sticky top-24">
                                <h3 className="font-bold text-gray-900 dark:text-white mb-4">Enrollment Status</h3>
                                
                                <div className="mb-6">
                                    <StatusBadge status={enrollmentStatus} />
                                    {enrollmentStatus === 'unenrolled' && (
                                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                                            Join this course to access all lessons, quizzes, and materials.
                                        </p>
                                    )}
                                </div>

                                {user ? (
                                    <button 
                                        onClick={btnConfig.onClick}
                                        disabled={btnConfig.disabled || isSubmitting}
                                        className={`w-full py-3.5 px-4 rounded-xl font-bold transition-all transform active:scale-95 flex items-center justify-center gap-2 ${btnConfig.className}`}
                                    >
                                        {isSubmitting ? (
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                        ) : enrollmentStatus === 'enrolled' ? (
                                            <BookOpen className="w-5 h-5" />
                                        ) : enrollmentStatus === 'unenrolled' ? (
                                            <UserPlus className="w-5 h-5" />
                                        ) : (
                                            <Lock className="w-5 h-5" />
                                        )}
                                        {isSubmitting ? 'Processing...' : btnConfig.text}
                                    </button>
                                ) : (
                                    <button 
                                        onClick={() => router.push('/login')} 
                                        className="w-full py-3.5 px-4 font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-lg transition-transform active:scale-95"
                                    >
                                        Login to Enroll
                                    </button>
                                )}

                                <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                                    <p className="text-xs text-center text-gray-400 dark:text-gray-500">
                                        By enrolling, you agree to the course terms and community guidelines.
                                    </p>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    </div>
  );
}