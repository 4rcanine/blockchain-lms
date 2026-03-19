// app/(admin)/admin/courses/page.tsx
'use client';

import { useState, useEffect, useMemo } from 'react';
import { collection, getDocs, updateDoc, doc, query, where } from 'firebase/firestore';
import { db } from '@/firebase/config';
import { Loader2, Eye, EyeOff, UserPlus, BookOpen, CheckCircle, Search, X } from 'lucide-react';

interface Course {
    id: string;
    title: string;
    instructorIds: string[];
    isHidden: boolean;
    isActivated: boolean;
}

interface User {
    uid: string;
    email: string;
    displayName: string;
    role: string;
}

export default function AdminCourseManagementPage() {
    const [courses, setCourses] = useState<Course[]>([]);
    const [educators, setEducators] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');


    const filteredCourses = useMemo(() => {
        return courses.filter(course => 
            course.title.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [courses, searchTerm]);

    const fetchData = async () => {
        setLoading(true);
        try {
            // 1. Fetch all courses
            const coursesSnap = await getDocs(collection(db, 'courses'));
            const coursesList = coursesSnap.docs.map(d => ({
                id: d.id,
                title: d.data().title,
                instructorIds: d.data().instructorIds || [],
                isHidden: d.data().isHidden || false,
                isActivated: d.data().isActivated ?? true,
            })) as Course[];
            setCourses(coursesList);

            // 2. Fetch all educators/admins
            const usersQ = query(collection(db, 'users'), where('role', 'in', ['educator']));
            const usersSnap = await getDocs(usersQ);
            const educatorsList = usersSnap.docs.map(d => ({
                uid: d.id,
                email: d.data().email,
                displayName: d.data().displayName || d.data().email,
                role: d.data().role,
            })) as User[];
            setEducators(educatorsList);
            
            setError(null);
        } catch (err) {
            console.error(err);
            setError("Failed to fetch course and user data.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);
    
    // --- Handlers ---
    
    const handleActivateCourse = async (courseId: string) => {
        try {
            const courseRef = doc(db, 'courses', courseId);
            await updateDoc(courseRef, {
                isActivated: true,
                isHidden: false // Auto-show when activated
            });
            fetchData(); 
        } catch (err) {
            console.error(err);
        }
    };

    const toggleCourseVisibility = async (course: Course) => {
        try {
            await updateDoc(doc(db, 'courses', course.id), {
                isHidden: !course.isHidden,
            });
            fetchData(); // Refresh list
        } catch (err) {
            setError("Failed to change visibility.");
        }
    };

    const handleAssignInstructor = async (courseId: string, instructorId: string, isAdding: boolean) => {
        const course = courses.find(c => c.id === courseId);
        if (!course) return;

        try {
            const newInstructorIds = isAdding
                ? [...new Set([...course.instructorIds, instructorId])]
                : course.instructorIds.filter(id => id !== instructorId);
            
            await updateDoc(doc(db, 'courses', courseId), {
                instructorIds: newInstructorIds,
            });
            fetchData(); // Refresh list
        } catch (err) {
            setError("Failed to update instructors.");
        }
    };

    if (loading) return <div className="text-center mt-10"><Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-500" /></div>;
    if (error) return <div className="text-red-600">{error}</div>;



    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold flex items-center gap-3">
                <BookOpen className="w-7 h-7 text-indigo-600" /> Course Management
            </h1>
            <p className="text-gray-600">Assign instructors and control course visibility across the platform.</p>

            {/* --- SEARCH BAR SECTION --- */}
            <div className="relative group max-w-md">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
                </div>
                <input
                    type="text"
                    placeholder="Search courses by title..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="block w-full pl-10 pr-10 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm placeholder-gray-400 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all shadow-sm"
                />
                {searchTerm && (
                    <button 
                        onClick={() => setSearchTerm('')}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                    >
                        <X className="h-4 w-4" />
                    </button>
                )}
            </div>

            <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700">
                <h2 className="text-xl font-semibold mb-4">All Courses ({filteredCourses.length})</h2>
                
                <div className="space-y-4">
                    {filteredCourses.length > 0 ? (
                    filteredCourses.map(course => {

                        const isNew = course.isActivated === false;

                        return (
                        <div key={course.id} className="p-4 border rounded-lg flex flex-col md:flex-row justify-between items-start md:items-center bg-gray-50 dark:bg-gray-700/30">
                            
                            {/* Course Info */}
                            <div className="flex-1 min-w-0 mb-3 md:mb-0">
                                <div className="flex gap-2 mb-1">
                                    {isNew ? (
                                        <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded-full">PENDING ACTIVATION</span>
                                    ) : (
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${course.isHidden ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                                            {course.isHidden ? 'HIDDEN' : 'VISIBLE'}
                                        </span>
                                    )}
                                </div>
                                
                                <h3 className="font-semibold text-lg text-gray-900 dark:text-white truncate">{course.title}</h3>
                                <p className="text-sm text-gray-500 mt-1">
                                    Instructors: {course.instructorIds.map(uid => educators.find(e => e.uid === uid)?.displayName || uid).join(', ') || 'None Assigned'}
                                </p>
                            </div>

                            {/* Actions */}
                            <div className="flex flex-wrap gap-2 md:ml-4">
                                
                                {/* Visibility Toggle */}

                                {isNew ? (
                                    /* ACTIVATE BUTTON (Visible only for brand new courses) */
                                    <button
                                        onClick={() => handleActivateCourse(course.id)}
                                        className="flex items-center gap-1 px-4 py-2 bg-green-600 text-white text-xs font-bold rounded-lg hover:bg-green-700"
                                    >
                                        <CheckCircle className="w-4 h-4" /> Activate Course
                                    </button>
                                ) : (
                                <button
                                    onClick={() => toggleCourseVisibility(course)}
                                    className={`flex items-center gap-1 px-3 py-1.5 text-sm rounded-md transition-colors ${course.isHidden ? 'bg-gray-300 text-gray-800 hover:bg-gray-400' : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'}`}
                                    title={course.isHidden ? 'Make Course Visible' : 'Hide Course from Catalog'}
                                >
                                    {course.isHidden ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                                    {course.isHidden ? 'Show' : 'Hide'}
                                </button>
                                )}
                                {/* Instructor Assignment Dropdown */}
                                <select 
                                    onChange={(e) => handleAssignInstructor(course.id, e.target.value, true)}
                                    defaultValue=""
                                    className="px-3 py-1.5 text-sm border rounded-md bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                                >
                                    <option value="" disabled>Assign Instructor...</option>
                                    {educators.map(edu => (
                                        !course.instructorIds.includes(edu.uid) && (
                                            <option key={edu.uid} value={edu.uid}>{edu.displayName}</option>
                                        )
                                    ))}
                                </select>
                                
                                {/* Remove Instructor Dropdown */}
                                {course.instructorIds.length > 0 && (
                                    <select 
                                        onChange={(e) => handleAssignInstructor(course.id, e.target.value, false)}
                                        defaultValue=""
                                        className="px-3 py-1.5 text-sm border rounded-md bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                                    >
                                        <option value="" disabled>Remove Instructor...</option>
                                        {course.instructorIds.map(uid => {
                                            const edu = educators.find(e => e.uid === uid);
                                            return edu ? (
                                                <option key={uid} value={uid}>{edu.displayName}</option>
                                            ) : null;
                                        })}
                                    </select>
                                )}
                            </div>
                        </div>
                    )})
                ):(
                    <div className="text-center py-10 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-dashed">
                            <p className="text-gray-500 italic">{`No courses found matching "${searchTerm}"`}</p>
                        </div>
                )}
                
                </div>
            </div>
        </div>
    );
}