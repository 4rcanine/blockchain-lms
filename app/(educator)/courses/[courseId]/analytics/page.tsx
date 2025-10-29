// app/(educator)/courses/[courseId]/analytics/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/firebase/config';
import { useParams } from 'next/navigation';
import useAuth from '@/hooks/useAuth';
import Link from 'next/link';

interface Course { title: string; }
interface EnrolledStudent { id: string; email: string; }

export default function AnalyticsPage() {
    const { user } = useAuth();
    const params = useParams();
    const courseId = params.courseId as string;

    const [course, setCourse] = useState<Course | null>(null);
    const [enrolledStudents, setEnrolledStudents] = useState<EnrolledStudent[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!user || !courseId) return;

        const fetchData = async () => {
            try {
                // 1. Fetch course details to verify ownership and get title
                const courseDocRef = doc(db, 'courses', courseId);
                const courseDocSnap = await getDoc(courseDocRef);

                if (
                !courseDocSnap.exists() ||
                !courseDocSnap.data().instructorIds?.includes(user.uid)
                ) {
                throw new Error("Course not found or you do not have permission to view its analytics.");
                }

                setCourse(courseDocSnap.data() as Course);

                // 2. Query the 'users' collection to find all students enrolled in this course
                const usersCollectionRef = collection(db, 'users');
                const q = query(usersCollectionRef, where('enrolledCourses', 'array-contains', courseId));
                
                const querySnapshot = await getDocs(q);
                const studentsList = querySnapshot.docs.map(doc => ({
                    id: doc.id,
                    email: doc.data().email,
                })) as EnrolledStudent[];
                
                setEnrolledStudents(studentsList);

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

    return (
        <div>
            <div className="mb-8">
                <h1 className="text-sm text-gray-500">Analytics Dashboard for</h1>
                <h2 className="text-3xl font-bold">{course?.title}</h2>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white p-6 rounded-lg shadow-md">
                    <h3 className="text-lg font-semibold text-gray-600">Total Enrollments</h3>
                    <p className="text-4xl font-bold mt-2">{enrolledStudents.length}</p>
                </div>
                {/* Add other stat cards here later, e.g., Quiz Completion Rate */}
            </div>

            {/* Enrolled Students Table */}
            <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-xl font-bold mb-4">Enrolled Students</h3>
                <div className="overflow-x-auto">
                    <table className="min-w-full">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student Email</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User ID</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {enrolledStudents.map(student => (
                                <tr key={student.id}>
                                    <td className="px-6 py-4 whitespace-nowrap">{student.email}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{student.id}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {enrolledStudents.length === 0 && <p className="text-center py-4">No students have enrolled in this course yet.</p>}
                </div>
            </div>
        </div>
    );
}