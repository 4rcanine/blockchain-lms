// app/(educator)/courses/[courseId]/analytics/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/firebase/config';
import { useParams } from 'next/navigation';
import useAuth from '@/hooks/useAuth';
import Link from 'next/link';
//new shit
import { Bar, Line, Pie } from 'react-chartjs-2'; // <-- NEW CHART IMPORTS
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
    ArcElement // For Pie Chart
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
    // end new shit

interface Course { title: string; }
interface EnrolledStudent { id: string; email: string; }
// new shit
interface StudentProgress {
    id: string; // Student UID
    email: string;
    progress: number; // e.g., 45
    status: string; // e.g., 'enrolled'
    latestGrade?: number;
}

interface AnalyticsSummary {
    totalStudents: number;
    completedCount: number;
    averageProgress: number;
    // We'll calculate total possible lessons/modules here if possible
}

interface EnrollmentData {
    status: 'enrolled' | 'pending' | 'completed'; // Example values
    progress: number; // The field we need
    studentEmail?: string; 
    // Add any other fields you store in enrollment requests
}

interface RawGrade {
    studentId: string;
    activityName: string; // e.g., 'Act 1', 'Act 2'
    grade: number; // Score out of 100
    attemptedAt: number; // Timestamp for Line Chart sorting
}

// Data structures for the graphs
interface ChartData {
    barChartData: ChartDataObject; 
    lineChartData: ChartDataObject; 
    pieChartData: ChartDataObject; 
}

interface ChartDataset {
    label: string;
    data: (number | null)[]; // Use (number | null) for safety
    backgroundColor?: string | string[];
    borderColor?: string | string[]; // <-- FIX: Add this
    tension?: number; // Required for smooth lines
    hoverOffset?: number;
    
}

interface ChartDataObject {
    labels: string[];
    datasets: ChartDataset[];
}
// end of new shit

export default function AnalyticsPage() {
    const { user } = useAuth();
    const params = useParams();
    const courseId = params.courseId as string;

    const [course, setCourse] = useState<Course | null>(null);
    const [studentData, setStudentData] = useState<StudentProgress[]>([]); // Store detailed student progress new shit
    const [summary, setSummary] = useState<AnalyticsSummary | null>(null); // Store calculated stats new shit
    const [chartData, setChartData] = useState<ChartData | null>(null); // NEW STATE new shit
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!user || !courseId) return;

        const fetchData = async () => {
            // 1 line newshit
            setLoading(true);
            try {
                // 1. INITIAL FETCHES (Order doesn't matter yet)
                // Fetch Course (for Auth)
                const courseDocRef = doc(db, 'courses', courseId);
                const courseDocSnap = await getDoc(courseDocRef);
                const latestGradesMap = new Map<string, number>();
                // Fetch Raw Grades new shit
                
                
                //end new shit
                // --- Authorization Check ---
                if (
                !courseDocSnap.exists() ||
                !courseDocSnap.data().instructorIds?.includes(user.uid)
                ) {
                throw new Error("Course not found or you do not have permission to view its analytics.");
                }

                setCourse(courseDocSnap.data() as Course);

                let totalTrackableItems = 0;

                // --- NEW: FETCH RAW GRADES FROM QUIZ ATTEMPTS ---
            
            const modulesRef = collection(db, 'courses', courseId, 'modules');
            const modulesSnapshot = await getDocs(modulesRef);
            
            const rawGradesPromises: Promise<RawGrade | null>[] = [];
            
            for (const moduleDoc of modulesSnapshot.docs) {
                const lessonsRef = collection(moduleDoc.ref, 'lessons');
                const lessonsSnapshot = await getDocs(lessonsRef);
                
                for (const lessonDoc of lessonsSnapshot.docs) {
                    // Check for the 'quizzes' subcollection
                    totalTrackableItems++;

                    const quizzesRef = collection(lessonDoc.ref, 'quizzes');
                    const quizzesSnapshot = await getDocs(quizzesRef);
                    
                    for (const quizDoc of quizzesSnapshot.docs) {
                        // Check for the 'quizAttempts' subcollection

                        

                        const attemptsRef = collection(quizDoc.ref, 'quizAttempts');
                        const attemptsSnapshot = await getDocs(attemptsRef);
                        
                        attemptsSnapshot.docs.forEach(attemptDoc => {
                            const attemptData = attemptDoc.data();
                            
                            // Map the attempt data to the RawGrade structure
                            rawGradesPromises.push(Promise.resolve({
                                studentId: attemptData.studentId, // Assumes studentId is stored here
                                activityName: `${lessonDoc.data().title} Quiz`, // Use lesson title as activity name
                                grade: attemptData.score || 0, // Assumes score/grade is stored here
                                attemptedAt: attemptData.submittedAt?.toMillis() || Date.now(),
                            } as RawGrade));
                        });
                    }
                }
            }
            
            const rawGrades = (await Promise.all(rawGradesPromises)).filter((g): g is RawGrade => g !== null);
            
                rawGrades.forEach(grade => {
                    // We assume the highest grade is the best indicator, but you could use the latest attemptedAt timestamp
                    const currentHighest = latestGradesMap.get(grade.studentId) || 0;
                    if (grade.grade > currentHighest) {
                        latestGradesMap.set(grade.studentId, grade.grade);
                    }
                });

                // Fetch Enrollments- new shit
                const enrollmentsRef = collection(db, 'courses', courseId, 'enrollmentRequests');
                const enrolledQuery = query(enrollmentsRef, where('status', '==', 'enrolled'));
                const enrolledSnapshot = await getDocs(enrolledQuery);
                const enrollments = enrolledSnapshot.docs.map(doc => ({ 
                    id: doc.id, 
                    ...(doc.data() as EnrollmentData) 
                }));
                
                

                // Fetch User Emails (Requires student UIDs from enrollments)
                const studentUids = enrollments.map(e => e.id);
                const usersCollectionRef = collection(db, 'users');
                
                // Firestore 'in' queries are limited to 10. If you have >10 students, you need pagination/batching.
                const userPromises = studentUids.map(uid => getDoc(doc(usersCollectionRef, uid)));
                const userSnaps = await Promise.all(userPromises);

                // 2. COMBINE DATA (DEFINE detailedStudentData)
                let totalProgressSum = 0;
                let completedCount = 0;
                
                const detailedStudentData: StudentProgress[] = enrollments.map(enrollment => {
                    const userData = userSnaps.find(snap => snap.id === enrollment.id)?.data();

                    const enrollmentData = enrollment as unknown as { completedItems: string[] }; 
                    const completedItems = enrollmentData.completedItems || [];

                    let progress = 0;
                    if (totalTrackableItems > 0) {
                        // Calculate percentage based on completed items vs total items
                        progress = parseFloat(((completedItems.length / totalTrackableItems) * 100).toFixed(2));
                    }

                    totalProgressSum += progress;
                    if (progress >= 100) {
                        completedCount++;
                    }

                    return {
                        id: enrollment.id,
                        email: userData?.email || 'N/A',
                        progress: progress,
                        status: enrollment.status,
                        latestGrade: latestGradesMap.get(enrollment.id),
                    };
                });
                
                const totalStudents = detailedStudentData.length;


                // 3. SET STATE & AGGREGATE CHARTS (Must use the newly defined detailedStudentData)

                setStudentData(detailedStudentData);
                setSummary({
                    totalStudents: totalStudents,
                    completedCount: completedCount,
                    averageProgress: totalStudents > 0 ? parseFloat((totalProgressSum / totalStudents).toFixed(2)) : 0,
                });// new shit
                
                console.log("PRE-AGGREGATION CHECK: detailedStudentData length:", detailedStudentData.length); 
                console.log("PRE-AGGREGATION CHECK: rawGrades length:", rawGrades.length);


                const aggregatedData = aggregateChartData(detailedStudentData, rawGrades); 


                console.log("POST-AGGREGATION CHECK: Aggregation succeeded."); 
                console.log("POST-AGGREGATION CHECK: Bar Data Length:", aggregatedData.barChartData.datasets[0].data.length);

                setChartData(aggregatedData); 

            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [user, courseId]);

    if (loading) return <p>Loading course analytics...</p>;
    if (error) return <p className="text-red-500">{error}</p>;
    if (!summary) return <p className="p-8">Course loaded, but summary data is missing.</p>;
    if (!chartData) return <p className="p-8">Calculating visualizations...</p>;

    return (
        <div>
            <div className="mb-8">
                <h1 className="text-sm text-gray-500">Analytics Dashboard for</h1>
                <h2 className="text-3xl font-bold">{course?.title}</h2>
                {/*}new shit*/}
                <div className="mt-4 flex gap-4">
                    <Link href={`/educator/courses/${courseId}/manage`} className="text-sm text-indigo-600 hover:underline">← Back to Management</Link>
                </div>
                {/*} end of new shit*/}
            </div>

            {/* Stat Cards */}{/*} new shit*/}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <StatCard title="Total Enrolled Students" value={summary.totalStudents} />
                <StatCard title="Completed Courses" value={summary.completedCount} />
                <StatCard title="Average Progress" value={`${summary.averageProgress}%`} />
            </div>

            {/* -------------------- VISUALIZATIONS -------------------- */}
            <div className="space-y-12">
                
                {/* BAR CHART: Average Grade Per Activity */}
                <div className="bg-white p-6 rounded-lg shadow-md">
                    <h3 className="text-xl font-bold mb-6">Average Grade per Activity</h3>
                    <div style={{ height: '400px' }}>
                        <Bar data={chartData.barChartData} options={{ maintainAspectRatio: false }} />
                    </div>
                </div>

                {/* LINE CHART: Grade Trends Over Time (Individual Students) */}
                <div className="bg-white p-6 rounded-lg shadow-md">
                    <h3 className="text-xl font-bold mb-6">Individual Grade Trends</h3>
                    <div style={{ height: '400px' }}>
                        <Line data={chartData.lineChartData} options={{ maintainAspectRatio: false }} />
                    </div>
                </div>

                {/* PIE CHART: Participation/Engagement */}
                <div className="bg-white p-6 rounded-lg shadow-md">
                    <h3 className="text-xl font-bold mb-6">Student Participation Share (Total Submissions)</h3>
                    <div style={{ maxWidth: '500px', margin: '0 auto' }}>
                        <Pie data={chartData.pieChartData} />
                    </div>
                </div>
            </div>

            {/* Enrolled Students Table */}
            <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-xl font-bold mb-4">Student Progress Details</h3>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student Email</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Progress</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Latest Grade</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {studentData.map(student => (
                                <tr key={student.id}>
                                    <td className="px-6 py-4 whitespace-nowrap">{student.email}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="w-24 bg-gray-200 rounded-full h-2.5">
                                            <div 
                                                className={`h-2.5 rounded-full ${student.progress >= 100 ? 'bg-green-500' : 'bg-blue-500'}`} 
                                                style={{ width: `${student.progress}%` }}
                                            ></div>
                                        </div>
                                        <span className="ml-2 text-sm">{student.progress}%</span>
                                    </td>

                                    <td className="px-6 py-4 whitespace-nowrap font-medium">
                                        {student.latestGrade !== undefined ? `${student.latestGrade}%` : 'N/A'}
                                    </td>

                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{student.progress >= 100 ? 'Completed' : 'In Progress'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {studentData.length === 0 && <p className="text-center py-4">No students are currently enrolled.</p>}
                </div>
            </div>
            {/*} end of new shit*/}
        </div>
    );
}

// Reusable stat component new shit pababa
const StatCard = ({ title, value }: { title: string, value: string | number }) => (
    <div className="p-6 border rounded-xl shadow-md bg-white">
        <p className="text-sm text-gray-500 font-medium">{title}</p>
        <p className="text-3xl font-extrabold mt-1">{value}</p>
    </div>
);

function aggregateChartData(students: StudentProgress[], grades: RawGrade[]): ChartData {
    // 1. BAR CHART: Average Grade per Activity
    const activityTotals = new Map<string, { sum: number, count: number }>();
    const studentGrades = new Map<string, RawGrade[]>(); // For line chart

    grades.forEach(grade => {
        // Bar Chart aggregation
        const activity = activityTotals.get(grade.activityName) || { sum: 0, count: 0 };
        activity.sum += grade.grade;
        activity.count += 1;
        activityTotals.set(grade.activityName, activity);

        // Line Chart prep
        const studentList = studentGrades.get(grade.studentId) || [];
        studentList.push(grade);
        studentGrades.set(grade.studentId, studentList);
    });

    const barLabels = Array.from(activityTotals.keys()).sort();
    const barData = barLabels.map(activity => {
        const data = activityTotals.get(activity)!;
        return data.sum / data.count;
    });

    const barChartData = {
        labels: barLabels,
        datasets: [{
            label: 'Average Grade (%)',
            data: barData,
            backgroundColor: 'rgba(53, 162, 235, 0.5)',
        }],
    };


    // 2. LINE CHART: Grade Trends over Time (for top 5 activities)
    const uniqueActivities = Array.from(new Set(grades.map(g => g.activityName))).sort();
    const lineChartDatasets: ChartDataset[] = [];
    
    // Use the first few students for trend analysis display
    const studentsToTrack = students.slice(0, 3); 

    studentsToTrack.forEach(student => {
        const studentGradesMap = studentGrades.get(student.id) || [];
        // Sort grades by timestamp to show trend over time
        const sortedGrades = studentGradesMap.sort((a, b) => a.attemptedAt - b.attemptedAt); 
        
        lineChartDatasets.push({
            label: student.email,
            data: sortedGrades.map(g => g.grade),
            borderColor: getRandomColor(), 
            tension: 0.1,
});
    });

    const maxAttempts = lineChartDatasets.reduce((max, dataset) => Math.max(max, dataset.data.length), 0);
    const lineLabels = Array.from({ length: maxAttempts }, (_, i) => `Attempt ${i + 1}`);
    const lineChartData = {
        labels: lineLabels,
        datasets: lineChartDatasets,
    };


    // 3. PIE CHART: Participation/Engagement per Student
    const studentEngagement = new Map<string, number>();
    grades.forEach(grade => {
        studentEngagement.set(grade.studentId, (studentEngagement.get(grade.studentId) || 0) + 1);
    });

    const pieLabels = students.map(s => s.email);
    const pieData = pieLabels.map(email => {
        const student = students.find(s => s.email === email)!;
        return studentEngagement.get(student.id) || 0;
    });
    
    const totalDataPoints = pieData.reduce((sum, count) => sum + count, 0);

    const pieChartData = {
        labels: pieLabels,
        datasets: [{
            label: 'Total Activity Submissions',
            data: pieData,
            backgroundColor: pieLabels.map(() => getRandomColor()),
            hoverOffset: 4
        }]
    };

    return { barChartData, lineChartData, pieChartData };
}

// Simple utility function for dynamic colors
const getRandomColor = () => {
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
};