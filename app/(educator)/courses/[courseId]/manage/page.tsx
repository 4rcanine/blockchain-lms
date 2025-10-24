// app/(educator)/courses/[courseId]/manage/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { doc, getDoc, collection, addDoc, getDocs, query, orderBy, updateDoc } from 'firebase/firestore';
import { db } from '@/firebase/config';
import { useParams } from 'next/navigation';

// --- Type Definitions ---
interface QandA { id: string; questionText: string; answerText?: string; studentEmail?: string; }
interface Lesson { id: string; title: string; content: string; qanda?: QandA[]; }
interface Module { id: string; title: string; lessons: Lesson[]; }

// --- AnswerQuestionForm Component (no changes here) ---
const AnswerQuestionForm = ({ question, courseId, moduleId, lessonId, onAnswered }: { question: QandA, courseId: string, moduleId: string, lessonId: string, onAnswered: () => void }) => {
    const [isEditing, setIsEditing] = useState(!question.answerText);
    const [answer, setAnswer] = useState(question.answerText || '');
    const [isLoading, setIsLoading] = useState(false);

    const handleSaveAnswer = async () => {
        setIsLoading(true);
        const qandaDocRef = doc(db, 'courses', courseId, 'modules', moduleId, 'lessons', lessonId, 'qanda', question.id);
        try {
            await updateDoc(qandaDocRef, { answerText: answer });
            setIsEditing(false);
            onAnswered();
        } catch (error) {
            console.error("Failed to save answer:", error);
        } finally {
            setIsLoading(false);
        }
    };

    if (isEditing) {
        return (
            <div className="mt-2">
                <textarea value={answer} onChange={e => setAnswer(e.target.value)} rows={3} className="w-full p-2 border rounded-md" placeholder="Provide your answer here..."/>
                <div className="flex items-center gap-2 mt-1">
                    <button onClick={handleSaveAnswer} disabled={isLoading} className="px-3 py-1 text-sm font-semibold text-white bg-green-600 rounded-md hover:bg-green-700 disabled:bg-gray-400">{isLoading ? 'Saving...' : 'Save Answer'}</button>
                    {question.answerText && (<button onClick={() => setIsEditing(false)} className="px-3 py-1 text-sm font-semibold text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300">Cancel</button>)}
                </div>
            </div>
        );
    }

    return (
        <div className="mt-2 group">
            <blockquote className="pl-3 border-l-4 border-green-500 text-gray-700 bg-green-50 p-2 rounded-r-md">{answer}</blockquote>
            <button onClick={() => setIsEditing(true)} className="mt-1 px-3 py-1 text-xs font-semibold text-gray-600 bg-gray-200 rounded-md opacity-0 group-hover:opacity-100 transition-opacity">Edit Answer</button>
        </div>
    );
};


// --- Main Page Component ---
export default function ManageCoursePage() {
    const params = useParams();
    const courseId = params.courseId as string;

    const [course, setCourse] = useState<{ title: string } | null>(null);
    const [modules, setModules] = useState<Module[]>([]);
    const [newModuleTitle, setNewModuleTitle] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchData = async () => {
        try {
            setLoading(true);
            const courseDocRef = doc(db, 'courses', courseId);
            const courseDocSnap = await getDoc(courseDocRef);
            if (!courseDocSnap.exists()) throw new Error("Course not found");
            setCourse(courseDocSnap.data() as { title: string });

            const modulesSnapshot = await getDocs(query(collection(db, 'courses', courseId, 'modules'), orderBy('createdAt')));
            const modulesList: Module[] = await Promise.all(
                modulesSnapshot.docs.map(async (moduleDoc) => {
                    const lessonsSnapshot = await getDocs(query(collection(db, 'courses', courseId, 'modules', moduleDoc.id, 'lessons'), orderBy('createdAt')));
                    const lessonsList: Lesson[] = await Promise.all(lessonsSnapshot.docs.map(async (lessonDoc) => {
                        const qandaSnapshot = await getDocs(query(collection(db, 'courses', courseId, 'modules', moduleDoc.id, 'lessons', lessonDoc.id, 'qanda'), orderBy('askedAt')));
                        const qandaList = qandaSnapshot.docs.map(qDoc => ({ id: qDoc.id, ...qDoc.data() })) as QandA[];
                        // --- FIX IS HERE ---
                        return { id: lessonDoc.id, ...lessonDoc.data(), qanda: qandaList } as Lesson;
                    }));
                    // --- AND FIX IS HERE ---
                    return { id: moduleDoc.id, ...moduleDoc.data(), lessons: lessonsList } as Module;
                })
            );
            setModules(modulesList);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, [courseId]);

    const handleAddModule = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newModuleTitle.trim() === '') return;
        try {
            await addDoc(collection(db, 'courses', courseId, 'modules'), { title: newModuleTitle.trim(), createdAt: new Date() });
            setNewModuleTitle('');
            fetchData();
        } catch (err) { console.error(err); }
    };
    
    if (loading) return <p>Loading Course Manager...</p>;
    if (error) return <p className="text-red-500">{error}</p>;

    return (
        <div>
            <h1 className="text-sm text-gray-500">Managing Course</h1>
            <h2 className="text-3xl font-bold mb-8">{course?.title}</h2>
            <div className="mb-10">
                <h3 className="text-2xl font-semibold mb-4">Content & Q&A</h3>
            </div>
            <div className="space-y-6">
                {modules.map(module => (
                    <div key={module.id} className="p-4 bg-white border rounded-lg shadow-sm">
                        <p className="font-bold text-xl mb-4">{module.title}</p>
                        {module.lessons.length > 0 ? module.lessons.map(lesson => (
                            <div key={lesson.id} className="ml-4 pl-4 border-l-2 py-2">
                                <h4 className="font-semibold">{lesson.title}</h4>
                                {(lesson.qanda && lesson.qanda.length > 0) ? (
                                    <div className="mt-2 space-y-3">
                                        <h5 className="text-sm font-bold text-gray-600">Questions</h5>
                                        {lesson.qanda.map(q => (
                                            <div key={q.id} className="p-3 bg-gray-50 rounded-md text-sm">
                                                <p className="text-gray-800 font-medium">Q: {q.questionText}</p>
                                                <p className="text-xs text-gray-500 mb-2">From: {q.studentEmail}</p>
                                                <AnswerQuestionForm question={q} courseId={courseId} moduleId={module.id} lessonId={lesson.id} onAnswered={fetchData} />
                                            </div>
                                        ))}
                                    </div>
                                ) : <p className="text-xs text-gray-500 mt-1">No questions for this lesson yet.</p>}
                            </div>
                        )) : <p className="ml-4 text-sm text-gray-500">No lessons in this module yet.</p>}
                    </div>
                ))}
            </div>
        </div>
    );
}