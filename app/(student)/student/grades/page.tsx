// app/(student)/student/grades/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { collection, collectionGroup, getDocs, query, where, doc, getDoc } from 'firebase/firestore';
import { db } from '@/firebase/config';
import useAuth from '@/hooks/useAuth';
import Link from 'next/link';
import { 
    GraduationCap, 
    Award, 
    CheckCircle, 
    CircleDashed, 
    Loader2, 
    BookOpen,
    Trophy,
    MinusCircle
} from 'lucide-react';

// --- Type Definitions ---
interface CourseGradeInfo {
    id: string;
    title: string;
    imageUrl?: string;
    overallGrade: number | null;
    letterGrade: string;
    gradedQuizzes: { id: string; title: string; score: number; total: number }[];
    ungradedQuizzes: { id: string; title: string }[];
}

const getLetterGrade = (percentage: number | null) => {
    if (percentage === null) return 'N/A';
    if (percentage >= 97) return 'A+';
    if (percentage >= 93) return 'A';
    if (percentage >= 90) return 'A-';
    if (percentage >= 87) return 'B+';
    if (percentage >= 83) return 'B';
    if (percentage >= 80) return 'B-';
    if (percentage >= 77) return 'C+';
    if (percentage >= 73) return 'C';
    if (percentage >= 70) return 'C-';
    if (percentage >= 60) return 'D';
    return 'F';
};

const getGradeColor = (grade: number | null) => {
    if (grade === null) return 'text-gray-500 bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700';
    if (grade >= 90) return 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800';
    if (grade >= 80) return 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800';
    if (grade >= 70) return 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800';
    return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800';
};

export default function GradesPage() {
    const { user, loading: authLoading } = useAuth();
    const [courseGrades, setCourseGrades] = useState<CourseGradeInfo[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (authLoading || !user) return;

        const fetchGrades = async () => {
            try {
                // 1. Get Enrolled Courses
                const userDoc = await getDoc(doc(db, 'users', user.uid));
                if (!userDoc.exists()) return;
                const enrolledIds = userDoc.data().enrolledCourses || [];

                if (enrolledIds.length === 0) {
                    setLoading(false);
                    return;
                }

                // 2. Fetch Course Details
                const coursePromises = enrolledIds.map((id: string) => getDoc(doc(db, 'courses', id)));
                const courseSnapshots = await Promise.all(coursePromises);
                const courses = courseSnapshots.filter(snap => snap.exists()).map(snap => ({ id: snap.id, ...snap.data() }));

                // 3. Fetch ALL Quiz Data (Metadata)
                const allQuizzesSnapshot = await getDocs(collectionGroup(db, 'quiz-data'));
                
                // 4. Fetch ALL My Attempts
                const allAttemptsSnapshot = await getDocs(query(collectionGroup(db, 'quizAttempts'), where('studentId', '==', user.uid)));

                // 5. Process Data
                const gradesData: CourseGradeInfo[] = courses.map((course: any) => {
                    const quizzesForCourse = allQuizzesSnapshot.docs
                        .map(d => ({ id: d.id, ref: d.ref, ...d.data() } as any))
                        .filter(q => q.courseId === course.id);

                    const gradedQuizzes: any[] = [];
                    const ungradedQuizzes: any[] = [];
                    let totalScore = 0;
                    let totalPossibleScore = 0;

                    quizzesForCourse.forEach(quiz => {
                        const attemptDoc = allAttemptsSnapshot.docs.find(a => a.ref.path.includes(quiz.ref.parent.parent.id));

                        if (attemptDoc) {
                            const data = attemptDoc.data();
                            const score = data.score || 0;
                            const total = data.totalQuestions || quiz.questions?.length || 0;
                            
                            gradedQuizzes.push({ 
                                id: quiz.id,
                                title: quiz.title, 
                                score: score, 
                                total: total 
                            });
                            
                            if (total > 0) {
                                totalScore += score;
                                totalPossibleScore += total;
                            }
                        } else {
                            ungradedQuizzes.push({ 
                                id: quiz.id,
                                title: quiz.title 
                            });
                        }
                    });

                    // Calculate percentage
                    const percentage = totalPossibleScore > 0 
                        ? Math.round((totalScore / totalPossibleScore) * 100) 
                        : null;

                    return {
                        id: course.id,
                        title: course.title,
                        imageUrl: course.imageUrl,
                        overallGrade: percentage,
                        letterGrade: getLetterGrade(percentage),
                        gradedQuizzes,
                        ungradedQuizzes,
                    };
                });

                setCourseGrades(gradesData);
            } catch (error) {
                console.error("Failed to fetch grades:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchGrades();
    }, [user, authLoading]);

    if (loading) {
        return (
            <div className="flex h-[50vh] items-center justify-center">
                <Loader2 className="w-10 h-10 text-indigo-500 animate-spin mb-4" />
                <p className="text-gray-500 dark:text-gray-400 font-medium sr-only">Calculating grades...</p>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto pb-20">
            {/* Header */}
            <div className="mb-10">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                    <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                        <Award className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    Academic Records
                </h1>
                <p className="text-gray-500 dark:text-gray-400 mt-2 ml-1">
                    Track your performance and quiz results across all courses.
                </p>
            </div>

            {courseGrades.length === 0 ? (
                 <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-3xl border border-dashed border-gray-200 dark:border-gray-700">
                    <div className="w-20 h-20 bg-gray-100 dark:bg-gray-700/50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <GraduationCap className="w-10 h-10 text-gray-400 dark:text-gray-500" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No Grades Yet</h3>
                    <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto mb-6">
                        Enroll in a course and complete quizzes to see your grades here.
                    </p>
                    <Link href="/courses" className="px-6 py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition">
                        Browse Courses
                    </Link>
                </div>
            ) : (
                <div className="grid gap-8">
                    {courseGrades.map(course => (
                        <div key={course.id} className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden transition-all hover:shadow-md">
                            
                            {/* Card Header */}
                            <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex flex-col md:flex-row md:items-center gap-6">
                                {/* Course Image & Title */}
                                <div className="flex items-center gap-4 flex-1">
                                    <div className="w-16 h-16 rounded-xl overflow-hidden bg-gray-200 dark:bg-gray-700 flex-shrink-0 border border-gray-100 dark:border-gray-600">
                                        {course.imageUrl ? (
                                            <img src={course.imageUrl} alt={course.title} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center">
                                                <BookOpen className="w-6 h-6 text-gray-400" />
                                            </div>
                                        )}
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-bold text-gray-900 dark:text-white line-clamp-1">{course.title}</h2>
                                        <Link href={`/courses/${course.id}`} className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline font-medium">
                                            View Course Material
                                        </Link>
                                    </div>
                                </div>

                                {/* Overall Grade Badge */}
                                <div className={`flex items-center gap-4 px-6 py-3 rounded-xl border ${getGradeColor(course.overallGrade)}`}>
                                    <div className="text-right">
                                        <p className="text-xs font-bold uppercase opacity-80">Overall Grade</p>
                                        <p className="text-2xl font-extrabold">
                                            {course.overallGrade !== null ? `${course.overallGrade}%` : 'N/A'}
                                        </p>
                                    </div>
                                    <div className="text-4xl font-black opacity-30 border-l border-current pl-4">
                                        {course.letterGrade}
                                    </div>
                                </div>
                            </div>
                            
                            {/* Details Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-gray-100 dark:divide-gray-700">
                                
                                {/* Graded Quizzes */}
                                <div className="p-6">
                                    <h3 className="flex items-center gap-2 text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-4">
                                        <CheckCircle className="w-4 h-4 text-green-500" /> Completed Assessments
                                    </h3>
                                    {course.gradedQuizzes.length > 0 ? (
                                        <ul className="space-y-3">
                                            {course.gradedQuizzes.map((q, i) => (
                                                <li key={i} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-100 dark:border-gray-700">
                                                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate mr-4">{q.title}</span>
                                                    <span className="text-sm font-bold text-gray-900 dark:text-white bg-white dark:bg-gray-800 px-2 py-1 rounded border border-gray-200 dark:border-gray-600">
                                                        {q.score}/{q.total}
                                                    </span>
                                                </li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center h-32 text-gray-400">
                                            <MinusCircle className="w-8 h-8 mb-2 opacity-20" />
                                            <p className="text-sm italic">No graded quizzes yet.</p>
                                        </div>
                                    )}
                                </div>

                                {/* Ungraded/Pending Quizzes */}
                                <div className="p-6">
                                    <h3 className="flex items-center gap-2 text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-4">
                                        <CircleDashed className="w-4 h-4 text-amber-500" /> Pending / To-Do
                                    </h3>
                                    {course.ungradedQuizzes.length > 0 ? (
                                        <ul className="space-y-3">
                                            {course.ungradedQuizzes.map((q, i) => (
                                                <li key={i} className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
                                                    <span className="text-sm text-gray-600 dark:text-gray-400 truncate">{q.title}</span>
                                                    <Link 
                                                        href={`/courses/${course.id}/view`}
                                                        className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                                                    >
                                                        Start Quiz
                                                    </Link>
                                                </li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <div className="h-full flex flex-col items-center justify-center text-center py-4 text-gray-400">
                                            <Trophy className="w-8 h-8 text-amber-400 mb-2 opacity-80" />
                                            <p className="text-sm font-medium text-gray-900 dark:text-white">All caught up!</p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">You've completed all available quizzes.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}