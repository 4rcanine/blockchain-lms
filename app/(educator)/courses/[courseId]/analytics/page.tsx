// app/(educator)/courses/[courseId]/analytics/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/firebase/config';
import { useParams } from 'next/navigation';
import useAuth from '@/hooks/useAuth';
import Link from 'next/link';
import { 
    BarChart3, 
    TrendingUp, 
    PieChart, 
    Users, 
    CheckCircle, 
    ArrowLeft, 
    AlertCircle,
    Loader2
} from 'lucide-react';

import { Bar, Line, Pie } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
    LineElement,
    PointElement,
    ArcElement,
    ChartOptions
} from 'chart.js';

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
    LineElement,
    PointElement,
    ArcElement
);

// --- Types ---
interface Course { title: string; }
interface StudentProgress {
    id: string;
    email: string;
    progress: number;
    status: string;
    latestGrade?: number;
}

interface AnalyticsSummary {
    totalStudents: number;
    completedCount: number;
    averageProgress: number;
}

interface EnrollmentData {
    status: 'enrolled' | 'pending' | 'completed';
    progress: number;
    studentEmail?: string; 
    completedItems?: string[];
}

interface RawGrade {
    studentId: string;
    activityName: string;
    grade: number;
    attemptedAt: number;
}

interface ChartData {
    barChartData: ChartDataObject; 
    lineChartData: ChartDataObject; 
    pieChartData: ChartDataObject; 
}

interface ChartDataset {
    label: string;
    data: (number | null)[];
    backgroundColor?: string | string[];
    borderColor?: string | string[];
    tension?: number;
    hoverOffset?: number;
    borderWidth?: number;
}

interface ChartDataObject {
    labels: string[];
    datasets: ChartDataset[];
}

export default function AnalyticsPage() {
    const { user } = useAuth();
    const params = useParams();
    const courseId = params.courseId as string;

    const [course, setCourse] = useState<Course | null>(null);
    const [studentData, setStudentData] = useState<StudentProgress[]>([]);
    const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
    const [chartData, setChartData] = useState<ChartData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Dark Mode Detection for Charts
    const [isDarkMode, setIsDarkMode] = useState(false);
    useEffect(() => {
        // Initial check
        if (typeof window !== 'undefined') {
            setIsDarkMode(document.documentElement.classList.contains('dark'));
        }
        // Listener for theme changes
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.attributeName === 'class') {
                    setIsDarkMode(document.documentElement.classList.contains('dark'));
                }
            });
        });
        observer.observe(document.documentElement, { attributes: true });
        return () => observer.disconnect();
    }, []);

    // Chart Options Generator
    const getChartOptions = (title: string): ChartOptions<any> => ({
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                labels: { color: isDarkMode ? '#e5e7eb' : '#374151' } // gray-200 : gray-700
            },
            title: {
                display: false,
                text: title,
                color: isDarkMode ? '#e5e7eb' : '#374151'
            }
        },
        scales: {
            y: {
                grid: { color: isDarkMode ? '#374151' : '#e5e7eb' }, // gray-700 : gray-200
                ticks: { color: isDarkMode ? '#9ca3af' : '#6b7280' } // gray-400 : gray-500
            },
            x: {
                grid: { display: false },
                ticks: { color: isDarkMode ? '#9ca3af' : '#6b7280' }
            }
        }
    });

    const getPieOptions = (): ChartOptions<'pie'> => ({
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'bottom',
                labels: { color: isDarkMode ? '#e5e7eb' : '#374151' }
            }
        }
    });

    useEffect(() => {
        if (!user || !courseId) return;

        const fetchData = async () => {
            setLoading(true);
            try {
                // 1. Fetch Course
                const courseDocRef = doc(db, 'courses', courseId);
                const courseDocSnap = await getDoc(courseDocRef);
                const latestGradesMap = new Map<string, number>();
                
                // Auth Check
                if (!courseDocSnap.exists() || !courseDocSnap.data().instructorIds?.includes(user.uid)) {
                    throw new Error("Course not found or unauthorized access.");
                }

                setCourse(courseDocSnap.data() as Course);

                // 2. Fetch Raw Grades
                let totalTrackableItems = 0;
                const modulesRef = collection(db, 'courses', courseId, 'modules');
                const modulesSnapshot = await getDocs(modulesRef);
                
                const rawGradesPromises: Promise<RawGrade | null>[] = [];
                
                for (const moduleDoc of modulesSnapshot.docs) {
                    const lessonsRef = collection(moduleDoc.ref, 'lessons');
                    const lessonsSnapshot = await getDocs(lessonsRef);
                    
                    for (const lessonDoc of lessonsSnapshot.docs) {
                        totalTrackableItems++;
                        const quizzesRef = collection(lessonDoc.ref, 'quizzes');
                        const quizzesSnapshot = await getDocs(quizzesRef);
                        
                        for (const quizDoc of quizzesSnapshot.docs) {
                            const attemptsRef = collection(quizDoc.ref, 'quizAttempts');
                            const attemptsSnapshot = await getDocs(attemptsRef);
                            
                            attemptsSnapshot.docs.forEach(attemptDoc => {
                                const attemptData = attemptDoc.data();
                                rawGradesPromises.push(Promise.resolve({
                                    studentId: attemptData.studentId,
                                    activityName: `${lessonDoc.data().title} Quiz`,
                                    grade: attemptData.score || 0,
                                    attemptedAt: attemptData.submittedAt?.toMillis() || Date.now(),
                                } as RawGrade));
                            });
                        }
                    }
                }
            
                const rawGrades = (await Promise.all(rawGradesPromises)).filter((g): g is RawGrade => g !== null);
                
                rawGrades.forEach(grade => {
                    const currentHighest = latestGradesMap.get(grade.studentId) || 0;
                    if (grade.grade > currentHighest) {
                        latestGradesMap.set(grade.studentId, grade.grade);
                    }
                });

                // 3. Fetch Enrollments & Users
                const enrollmentsRef = collection(db, 'courses', courseId, 'enrollmentRequests');
                const enrolledQuery = query(enrollmentsRef, where('status', '==', 'enrolled'));
                const enrolledSnapshot = await getDocs(enrolledQuery);
                const enrollments = enrolledSnapshot.docs.map(doc => ({ 
                    id: doc.id, 
                    ...(doc.data() as EnrollmentData) 
                }));
                
                const studentUids = enrollments.map(e => e.id);
                const usersCollectionRef = collection(db, 'users');
                
                // Batch fetch users (simplified logic, assumes < 10)
                const userPromises = studentUids.map(uid => getDoc(doc(usersCollectionRef, uid)));
                const userSnaps = await Promise.all(userPromises);

                // 4. Combine Data
                let totalProgressSum = 0;
                let completedCount = 0;
                
                const detailedStudentData: StudentProgress[] = enrollments.map(enrollment => {
                    const userData = userSnaps.find(snap => snap.id === enrollment.id)?.data();
                    const completedItems = enrollment.completedItems || [];

                    let progress = 0;
                    if (totalTrackableItems > 0) {
                        progress = parseFloat(((completedItems.length / totalTrackableItems) * 100).toFixed(2));
                    }

                    totalProgressSum += progress;
                    if (progress >= 100) completedCount++;

                    return {
                        id: enrollment.id,
                        email: userData?.email || 'Unknown User',
                        progress: progress,
                        status: enrollment.status,
                        latestGrade: latestGradesMap.get(enrollment.id),
                    };
                });
                
                setStudentData(detailedStudentData);
                setSummary({
                    totalStudents: detailedStudentData.length,
                    completedCount: completedCount,
                    averageProgress: detailedStudentData.length > 0 ? parseFloat((totalProgressSum / detailedStudentData.length).toFixed(2)) : 0,
                });

                setChartData(aggregateChartData(detailedStudentData, rawGrades)); 

            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [user, courseId]);

    if (loading) return (
        <div className="flex h-[50vh] items-center justify-center">
            <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mr-2" />
            <span className="text-gray-500 dark:text-gray-400">Analyzing data...</span>
        </div>
    );

    if (error) return (
        <div className="p-8 text-center">
            <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-xl inline-flex items-center gap-2 text-red-600 dark:text-red-400">
                <AlertCircle className="w-5 h-5" /> {error}
            </div>
        </div>
    );

    if (!summary || !chartData) return null;

    return (
        <div className="max-w-7xl mx-auto pb-20 space-y-8">
            {/* Header */}
            <div className="flex flex-col gap-2">
                <Link href={`/courses/${courseId}/manage`} className="inline-flex items-center text-sm text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors mb-2">
                    <ArrowLeft className="w-4 h-4 mr-1" /> Back to Course Management
                </Link>
                <h1 className="text-sm font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wide">Course Analytics</h1>
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white">{course?.title}</h2>
            </div>

            {/* Stat Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard 
                    icon={<Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />}
                    title="Active Students" 
                    value={summary.totalStudents} 
                    color="bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-900"
                />
                <StatCard 
                    icon={<CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />}
                    title="Completions" 
                    value={summary.completedCount} 
                    color="bg-green-50 dark:bg-green-900/20 border-green-100 dark:border-green-900"
                />
                <StatCard 
                    icon={<TrendingUp className="w-6 h-6 text-purple-600 dark:text-purple-400" />}
                    title="Avg. Progress" 
                    value={`${summary.averageProgress}%`} 
                    color="bg-purple-50 dark:bg-purple-900/20 border-purple-100 dark:border-purple-900"
                />
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                
                {/* Bar Chart */}
                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
                    <div className="flex items-center gap-2 mb-6">
                        <BarChart3 className="w-5 h-5 text-gray-400" />
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">Average Grade per Activity</h3>
                    </div>
                    <div className="h-[300px]">
                        <Bar data={chartData.barChartData} options={getChartOptions('Avg Grades')} />
                    </div>
                </div>

                {/* Line Chart */}
                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
                    <div className="flex items-center gap-2 mb-6">
                        <TrendingUp className="w-5 h-5 text-gray-400" />
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">Performance Trends</h3>
                    </div>
                    <div className="h-[300px]">
                        <Line data={chartData.lineChartData} options={getChartOptions('Trends')} />
                    </div>
                </div>

                {/* Pie Chart */}
                <div className="lg:col-span-2 bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
                    <div className="flex items-center gap-2 mb-6">
                        <PieChart className="w-5 h-5 text-gray-400" />
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">Engagement Share (Submissions)</h3>
                    </div>
                    <div className="h-[300px] w-full max-w-md mx-auto">
                        <Pie data={chartData.pieChartData} options={getPieOptions()} />
                    </div>
                </div>
            </div>

            {/* Student Table */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-100 dark:border-gray-700">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">Detailed Student Progress</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 dark:bg-gray-900/50 text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">
                                <th className="px-6 py-4 font-semibold">Student</th>
                                <th className="px-6 py-4 font-semibold">Progress</th>
                                <th className="px-6 py-4 font-semibold">Latest Grade</th>
                                <th className="px-6 py-4 font-semibold">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                            {studentData.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400 italic">
                                        No students enrolled yet.
                                    </td>
                                </tr>
                            ) : (
                                studentData.map(student => (
                                    <tr key={student.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                                        <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                                            {student.email}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="flex-1 h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                                                    <div 
                                                        className={`h-full rounded-full ${student.progress >= 100 ? 'bg-green-500' : 'bg-indigo-500'}`} 
                                                        style={{ width: `${student.progress}%` }}
                                                    />
                                                </div>
                                                <span className="text-sm font-medium text-gray-600 dark:text-gray-300 w-10">{student.progress}%</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-gray-600 dark:text-gray-300">
                                            {student.latestGrade !== undefined ? (
                                                <span className="font-mono bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-sm">
                                                    {student.latestGrade}%
                                                </span>
                                            ) : (
                                                <span className="text-gray-400 italic text-xs">No Data</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                                student.progress >= 100 
                                                    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' 
                                                    : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                                            }`}>
                                                {student.progress >= 100 ? 'Completed' : 'Active'}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

// --- Components & Helpers ---

const StatCard = ({ title, value, icon, color }: { title: string, value: string | number, icon: React.ReactNode, color: string }) => (
    <div className={`p-6 rounded-2xl border shadow-sm ${color} transition-transform hover:scale-[1.02]`}>
        <div className="flex justify-between items-start mb-4">
            <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wide">{title}</p>
                <p className="text-3xl font-extrabold text-gray-900 dark:text-white mt-1">{value}</p>
            </div>
            <div className="p-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                {icon}
            </div>
        </div>
    </div>
);

function aggregateChartData(students: StudentProgress[], grades: RawGrade[]): ChartData {
    // 1. Bar Chart
    const activityTotals = new Map<string, { sum: number, count: number }>();
    const studentGrades = new Map<string, RawGrade[]>(); 

    grades.forEach(grade => {
        const activity = activityTotals.get(grade.activityName) || { sum: 0, count: 0 };
        activity.sum += grade.grade;
        activity.count += 1;
        activityTotals.set(grade.activityName, activity);

        const studentList = studentGrades.get(grade.studentId) || [];
        studentList.push(grade);
        studentGrades.set(grade.studentId, studentList);
    });

    const barLabels = Array.from(activityTotals.keys()).sort();
    const barData = barLabels.map(activity => {
        const data = activityTotals.get(activity)!;
        return data.sum / data.count;
    });

    // 2. Line Chart
    const lineChartDatasets: ChartDataset[] = [];
    const studentsToTrack = students.slice(0, 3); 

    studentsToTrack.forEach(student => {
        const studentGradesMap = studentGrades.get(student.id) || [];
        const sortedGrades = studentGradesMap.sort((a, b) => a.attemptedAt - b.attemptedAt); 
        
        lineChartDatasets.push({
            label: student.email,
            data: sortedGrades.map(g => g.grade),
            borderColor: getRandomColor(), 
            backgroundColor: 'transparent',
            tension: 0.3,
            borderWidth: 2,
        });
    });

    const maxAttempts = lineChartDatasets.reduce((max, dataset) => Math.max(max, dataset.data.length), 0);
    const lineLabels = Array.from({ length: maxAttempts }, (_, i) => `Attempt ${i + 1}`);

    // 3. Pie Chart
    const studentEngagement = new Map<string, number>();
    grades.forEach(grade => {
        studentEngagement.set(grade.studentId, (studentEngagement.get(grade.studentId) || 0) + 1);
    });

    const pieLabels = students.map(s => s.email);
    const pieData = pieLabels.map(email => {
        const student = students.find(s => s.email === email)!;
        return studentEngagement.get(student.id) || 0;
    });

    return {
        barChartData: {
            labels: barLabels,
            datasets: [{
                label: 'Avg Grade (%)',
                data: barData,
                backgroundColor: 'rgba(99, 102, 241, 0.6)', // Indigo-500
                borderColor: 'rgba(99, 102, 241, 1)',
                borderWidth: 1,
            }],
        },
        lineChartData: {
            labels: lineLabels,
            datasets: lineChartDatasets,
        },
        pieChartData: {
            labels: pieLabels,
            datasets: [{
                label: 'Submissions',
                data: pieData,
                backgroundColor: pieLabels.map(() => getRandomColor()),
                hoverOffset: 4,
                borderWidth: 0,
            }]
        }
    };
}

const getRandomColor = () => {
    const colors = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#10b981', '#3b82f6'];
    return colors[Math.floor(Math.random() * colors.length)];
};