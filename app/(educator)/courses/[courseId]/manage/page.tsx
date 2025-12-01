// app/(educator)/courses/[courseId]/manage/page.tsx
'use client';

import React, { useEffect, useState, useRef, useMemo } from 'react';
import {
    doc,
    getDoc,
    collection,
    addDoc,
    getDocs,
    query,
    orderBy,
    updateDoc,
    setDoc,
    serverTimestamp,
    arrayUnion,
    writeBatch,
    where,
    deleteDoc,
} from 'firebase/firestore';
import { db } from '@/firebase/config';
import { useParams } from 'next/navigation';
import AddContentModal from '@/components/AddContentModal';
import VideoUploader from '@/components/VideoUploader';
import Link from 'next/link';
import RichTextEditor, { RichTextEditorRef } from '@/components/RichTextEditor';
import { 
    Plus, 
    Trash2, 
    Edit2, 
    Save, 
    X, 
    GripVertical, 
    FileText, 
    Code, 
    Video, 
    HelpCircle, 
    MessageCircle, 
    Users,
    BarChart,
    CheckCircle,
    Lock,
    Unlock,
    Eye,
    EyeOff,
    RefreshCw,
    Settings,
    ChevronDown,
    ChevronUp
} from 'lucide-react';

/* ------------------------------- Utility -------------------------------- */
const stripHtml = (html: string) => {
    if (!html) return '';
    const tmp = document.createElement('DIV');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
};

/* ------------------------------- Types -------------------------------- */
type QuestionType = 'multiple-choice' | 'identification' | 'true-or-false';

interface BaseQuestion {
    id: string;
    questionText: string;
    type: QuestionType;
}

interface MultipleChoiceQuestion extends BaseQuestion {
    type: 'multiple-choice';
    options: string[];
    correctAnswerIndex: number;
}

interface IdentificationQuestion extends BaseQuestion {
    type: 'identification';
    correctAnswer: string;
}

interface TrueOrFalseQuestion extends BaseQuestion {
    type: 'true-or-false';
    correctAnswer: boolean;
}

type Question = MultipleChoiceQuestion | IdentificationQuestion | TrueOrFalseQuestion;

interface QuizSettings {
    showAnswers: boolean;
    isLocked: boolean;
}

interface Quiz {
    id: string;
    title: string;
    questions: Question[];
    dueDate?: any;
    settings: QuizSettings;
    createdAt?: any;
}

interface QandA {
    id: string;
    questionText: string;
    answerText?: string;
    studentEmail?: string;
    askedAt?: any;
}

interface Lesson {
    id: string;
    title: string;
    content: string; 
    qanda?: QandA[];
    quiz?: Quiz | null;
    sandboxUrl?: string;
    videoUrl?: string;
    createdAt?: any;
    updatedAt?: any; 
}

interface Module {
    id: string;
    title: string;
    lessons: Lesson[];
}

// --- NEW TYPES FROM MERGE ---
interface QuizAttempt { 
    id: string; 
    studentId: string; 
    studentEmail: string; 
    score: number; 
    totalQuestions: number; 
    submittedAt: any; 
}
interface ReattemptGrant { count: number; }

/* ---------------------------- LessonForm ----------------------------- */
const LessonForm = ({
    moduleId,
    courseId,
    onSave,
    onCancel,
    existingLesson,
}: {
    moduleId: string;
    courseId: string;
    onSave: () => void;
    onCancel: () => void;
    existingLesson?: Lesson;
}) => {
    const [title, setTitle] = useState(existingLesson?.title || '');
    const [sandboxUrl, setSandboxUrl] = useState(existingLesson?.sandboxUrl || '');
    const [videoUrl, setVideoUrl] = useState(existingLesson?.videoUrl || '');
    const [isVideoUploading, setIsVideoUploading] = useState(false);
    const [error, setError] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    
    // FIX: Ref pattern to prevent infinite re-renders
    const contentRef = useRef(existingLesson?.content || '');
    const editorRef = useRef<RichTextEditorRef>(null);
    const initialContent = useRef(existingLesson?.content || '').current;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (!title.trim()) { setError('A lesson title is required.'); return; }
        if (isVideoUploading) { setError('Please wait for the video to finish uploading.'); return; }
        
        const lessonData = {
            title: title.trim(),
            content: contentRef.current,
            sandboxUrl: sandboxUrl.trim() || null,
            videoUrl: videoUrl || null,
            createdAt: existingLesson?.createdAt || serverTimestamp(),
            updatedAt: serverTimestamp(),
        };

        try {
            if (existingLesson) {
                const lessonRef = doc(db, 'courses', courseId, 'modules', moduleId, 'lessons', existingLesson.id);
                await updateDoc(lessonRef, lessonData);
            } else {
                const lessonsRef = collection(db, 'courses', courseId, 'modules', moduleId, 'lessons');
                const newLessonRef = await addDoc(lessonsRef, lessonData);
                const moduleRef = doc(db, 'courses', courseId, 'modules', moduleId);
                await updateDoc(moduleRef, { lessons: arrayUnion(newLessonRef.id) });
            }
            onSave();
        } catch (err) {
            console.error(err);
            setError(existingLesson ? 'Failed to update lesson.' : 'Failed to add lesson.');
        }
    };

    const MemoizedEditor = useMemo(() => {
        return (
            <RichTextEditor
                ref={editorRef}
                content={initialContent} 
                onUpdate={(newVal) => {
                    contentRef.current = newVal;
                }}
            />
        );
    }, [initialContent]);

    return (
        <>
            {isModalOpen && (
                <AddContentModal
                    onClose={() => setIsModalOpen(false)}
                    onContentAdded={(newContent) => {
                        const isImageUrl = /\.(jpg|jpeg|png|webp|avif|gif|svg)$/i.test(newContent) || newContent.includes('cloudinary');
                        let contentToInsert = newContent;
                        if (isImageUrl && !newContent.startsWith('![')) {
                            contentToInsert = `![Lesson Image](${newContent})`;
                        }
                        if (editorRef.current) {
                            editorRef.current.insertContent(contentToInsert);
                        } else {
                            contentRef.current += '\n' + contentToInsert;
                        }
                    }}
                />
            )}

            <form onSubmit={handleSubmit} className="my-4 p-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm space-y-5 animate-in fade-in slide-in-from-top-2">
                <h4 className="font-bold text-lg text-gray-800 dark:text-white flex items-center gap-2">
                    {existingLesson ? <Edit2 className="w-5 h-5 text-indigo-500" /> : <Plus className="w-5 h-5 text-indigo-500" />}
                    {existingLesson ? 'Edit Lesson' : 'Add a New Lesson'}
                </h4>
                
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Lesson Title</label>
                    <input
                        type="text"
                        placeholder="e.g. Introduction to Smart Contracts"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="w-full p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none"
                        required
                    />
                </div>

                <div className="prose-container dark:prose-invert">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Lesson Content</label>
                    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                        {MemoizedEditor}
                    </div>
                </div>
                
                <div className="space-y-4">
                    <VideoUploader
                        onUploadStart={() => setIsVideoUploading(true)}
                        onUploadComplete={(url) => {
                            setVideoUrl(url);
                            setIsVideoUploading(false);
                        }}
                        onUploadError={() => {
                            setError('Video upload failed. Please try again.');
                            setIsVideoUploading(false);
                        }}
                    />
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Interactive Sandbox URL (Optional)</label>
                        <div className="flex items-center">
                            <div className="px-3 py-3 bg-gray-100 dark:bg-gray-700 border border-r-0 border-gray-300 dark:border-gray-600 rounded-l-lg text-gray-500 dark:text-gray-400">
                                <Code className="w-4 h-4" />
                            </div>
                            <input
                                type="url"
                                placeholder="https://stackblitz.com/..."
                                value={sandboxUrl}
                                onChange={(e) => setSandboxUrl(e.target.value)}
                                className="flex-1 p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-r-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none"
                            />
                        </div>
                    </div>
                </div>

                {error && <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-sm">{error}</div>}
                
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                    <button
                        type="button"
                        onClick={() => setIsModalOpen(true)}
                        className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 transition-colors"
                    >
                        + Add Image/File
                    </button>
                    <div className="flex gap-3 w-full sm:w-auto">
                        <button
                            type="button"
                            onClick={onCancel}
                            className="flex-1 sm:flex-none px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isVideoUploading}
                            className="flex-1 sm:flex-none px-6 py-2 text-sm font-bold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:bg-indigo-400 transition-all shadow-md hover:shadow-lg"
                        >
                            {isVideoUploading ? 'Uploading...' : 'Save Lesson'}
                        </button>
                    </div>
                </div>
            </form>
        </>
    );
};

/* ------------------------- AnswerQuestionForm -------------------------- */
const AnswerQuestionForm = ({
    question,
    courseId,
    moduleId,
    lessonId,
    onAnswered,
}: {
    question: QandA;
    courseId: string;
    moduleId: string;
    lessonId: string;
    onAnswered: () => void;
}) => {
    const [answer, setAnswer] = useState(question.answerText || '');
    const [saving, setSaving] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!answer.trim()) return;
        setSaving(true);
        try {
            const qRef = doc(db, 'courses', courseId, 'modules', moduleId, 'lessons', lessonId, 'qanda', question.id);
            await updateDoc(qRef, {
                answerText: answer.trim(),
                answeredAt: serverTimestamp(),
            });
            onAnswered();
        } catch (err) {
            console.error(err);
        } finally {
            setSaving(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="mt-3">
            <textarea
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="Write your answer here..."
                className="w-full p-3 text-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none text-gray-900 dark:text-white resize-none"
                rows={3}
            />
            <div className="flex justify-end mt-2">
                <button
                    type="submit"
                    disabled={saving}
                    className="px-4 py-1.5 text-xs font-semibold bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                >
                    {saving ? 'Saving...' : 'Submit Answer'}
                </button>
            </div>
        </form>
    );
};

/* ------------------------- StudentAttemptRow Component -------------------------- */
const StudentAttemptRow = ({ 
    student, 
    quiz, 
    courseId, 
    moduleId, 
    lessonId, 
    onUpdate 
}: { 
    student: any;
    quiz: Quiz;
    courseId: string;
    moduleId: string;
    lessonId: string;
    onUpdate: () => void;
}) => {
    const [retakeCount, setRetakeCount] = useState(1);
    const [isSaving, setIsSaving] = useState(false);

    const grantRetake = async () => {
        setIsSaving(true);
        const reattemptRef = doc(db, 'courses', courseId, 'modules', moduleId, 'lessons', lessonId, 'quizzes', quiz.id, 'reattempts', student.studentId);
        try {
            // Grant additional retakes on top of what they might already have
            await setDoc(reattemptRef, { count: (student.retakesGranted || 0) + retakeCount });
            onUpdate(); // Refresh parent to show new count
            setRetakeCount(1);
        } catch (error) { 
            console.error("Failed to grant retake:", error); 
        } finally { 
            setIsSaving(false); 
        }
    };
    
    return (
        <tr className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
            <td className="p-3 text-sm text-gray-700 dark:text-gray-300 font-medium">
                {student.studentEmail || <span className="text-gray-400 italic">No Email ({student.studentId.substring(0,6)}...)</span>}
            </td>
            <td className="p-3 text-sm text-center text-gray-600 dark:text-gray-400">
                {student.attempts.length}
            </td>
            <td className="p-3 text-sm text-center font-semibold text-indigo-600 dark:text-indigo-400">
                {student.highestScore} / {quiz.questions.length}
            </td>
            <td className="p-3 text-sm text-center text-gray-600 dark:text-gray-400">
                {student.retakesGranted || 0}
            </td>
            <td className="p-3 flex items-center justify-end gap-2">
                <input 
                    type="number" 
                    value={retakeCount} 
                    min={1}
                    onChange={e => setRetakeCount(Math.max(1, parseInt(e.target.value)))} 
                    className="w-16 p-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-1 focus:ring-indigo-500 outline-none" 
                />
                <button 
                    onClick={grantRetake} 
                    disabled={isSaving}
                    className="px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 rounded-md transition-colors whitespace-nowrap"
                >
                    {isSaving ? 'Saving...' : '+ Grant'}
                </button>
            </td>
        </tr>
    );
};

/* ------------------------- QuizManager Component -------------------------- */
const QuizManager = ({ 
    quiz, 
    courseId, 
    moduleId, 
    lessonId, 
    onUpdate,
    onEdit,
    onDelete 
}: { 
    quiz: Quiz; 
    courseId: string; 
    moduleId: string; 
    lessonId: string; 
    onUpdate: () => void;
    onEdit: () => void;
    onDelete: () => void;
}) => {
    const [loading, setLoading] = useState(false);
    const [studentData, setStudentData] = useState<any[]>([]);
    const [isTableExpanded, setIsTableExpanded] = useState(false);

    useEffect(() => {
        // Fetch all attempts and re-attempt grants for this quiz
        const fetchAttempts = async () => {
            try {
                const attemptsRef = collection(db, 'courses', courseId, 'modules', moduleId, 'lessons', lessonId, 'quizzes', quiz.id, 'quizAttempts');
                const attemptsSnap = await getDocs(attemptsRef);
                const attempts = attemptsSnap.docs.map(d => ({...d.data()})) as QuizAttempt[];

                const reattemptsRef = collection(db, 'courses', courseId, 'modules', moduleId, 'lessons', lessonId, 'quizzes', quiz.id, 'reattempts');
                const reattemptsSnap = await getDocs(reattemptsRef);
                const reattempts = new Map(reattemptsSnap.docs.map(d => [d.id, (d.data() as ReattemptGrant).count]));

                // Group attempts by student
                const groupedByStudent = attempts.reduce((acc, attempt) => {
                    if (!acc[attempt.studentId]) {
                        acc[attempt.studentId] = { studentId: attempt.studentId, studentEmail: attempt.studentEmail, attempts: [], highestScore: 0 };
                    }
                    acc[attempt.studentId].attempts.push(attempt);
                    if (attempt.score > acc[attempt.studentId].highestScore) {
                        acc[attempt.studentId].highestScore = attempt.score;
                    }
                    return acc;
                }, {} as any);

                // Add re-take info and turn into array
                const studentArray = Object.values(groupedByStudent).map((student: any) => {
                    student.retakesGranted = reattempts.get(student.studentId) || 0;
                    return student;
                });

                setStudentData(studentArray);
            } catch (err) {
                console.error("Error fetching quiz data:", err);
            }
        };

        if (isTableExpanded) {
            fetchAttempts();
        }
    }, [quiz, isTableExpanded, courseId, moduleId, lessonId]);

    const toggleLock = async () => {
        setLoading(true);
        try {
            const quizDataRef = doc(db, 'courses', courseId, 'modules', moduleId, 'lessons', lessonId, 'quizzes', quiz.id, 'quiz-data', 'main');
            await updateDoc(quizDataRef, {
                'settings.isLocked': !quiz.settings.isLocked
            });
            onUpdate();
        } catch (error) {
            console.error("Failed to toggle lock:", error);
        } finally {
            setLoading(false);
        }
    };

    const toggleShowAnswers = async () => {
        setLoading(true);
        try {
            const quizDataRef = doc(db, 'courses', courseId, 'modules', moduleId, 'lessons', lessonId, 'quizzes', quiz.id, 'quiz-data', 'main');
            await updateDoc(quizDataRef, {
                'settings.showAnswers': !quiz.settings.showAnswers
            });
            onUpdate();
        } catch (error) {
            console.error("Failed to toggle show answers:", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 mt-2 shadow-sm">
            {/* Top Bar: Info & Controls */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-lg">
                        <CheckCircle className="w-5 h-5" />
                    </div>
                    <div>
                        <h5 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            {quiz.title}
                            {quiz.settings.isLocked && <Lock className="w-3 h-3 text-red-500" />}
                        </h5>
                        <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                            <span>{quiz.questions.length} Questions</span>
                            <span>•</span>
                            <span>Due: {quiz.dueDate ? new Date(quiz.dueDate.seconds * 1000 || quiz.dueDate).toLocaleDateString() : 'No Date'}</span>
                        </div>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    {/* Controls */}
                    <button 
                        onClick={toggleLock} 
                        disabled={loading}
                        className={`p-2 rounded-md transition-colors ${quiz.settings.isLocked ? 'bg-red-100 text-red-600 dark:bg-red-900/20' : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'}`}
                        title={quiz.settings.isLocked ? "Unlock Quiz" : "Lock Quiz"}
                    >
                        {quiz.settings.isLocked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                    </button>

                    <button 
                        onClick={toggleShowAnswers} 
                        disabled={loading}
                        className={`p-2 rounded-md transition-colors ${quiz.settings.showAnswers ? 'bg-green-100 text-green-600 dark:bg-green-900/20' : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'}`}
                        title={quiz.settings.showAnswers ? "Answers Visible" : "Answers Hidden"}
                    >
                        {quiz.settings.showAnswers ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    </button>

                    <div className="h-6 w-px bg-gray-300 dark:bg-gray-600 mx-1"></div>

                    <button onClick={onEdit} className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline">
                        Edit
                    </button>
                    <button onClick={onDelete} className="text-xs font-medium text-red-600 hover:underline">
                        Delete
                    </button>
                </div>
            </div>
            
            {/* Status Footer */}
            <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700 flex flex-wrap justify-between items-center gap-4 text-xs">
                <div className="flex gap-4">
                    <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400">
                        <Settings className="w-3.5 h-3.5" />
                        <span>Status: {quiz.settings.isLocked ? 'Locked' : 'Active'}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400">
                        {quiz.settings.showAnswers ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                        <span>Results: {quiz.settings.showAnswers ? 'Answers Shown' : 'Answers Hidden'}</span>
                    </div>
                </div>

                {/* Toggle Student Progress Table */}
                <button 
                    onClick={() => setIsTableExpanded(!isTableExpanded)}
                    className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400 font-medium hover:underline"
                >
                    {isTableExpanded ? 'Hide Student Progress' : 'View Student Progress'}
                    {isTableExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
            </div>

            {/* Student Progress Table */}
            {isTableExpanded && (
                <div className="mt-4 border-t border-gray-100 dark:border-gray-700 pt-4 animate-in fade-in slide-in-from-top-1">
                    <h4 className="font-semibold text-sm text-gray-800 dark:text-gray-200 mb-3">Student Attempts</h4>
                    {studentData.length === 0 ? (
                        <div className="text-center py-4 text-sm text-gray-500 italic bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                            No students have attempted this quiz yet.
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                                        <th className="p-3 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Student</th>
                                        <th className="p-3 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-center">Attempts</th>
                                        <th className="p-3 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-center">Highest Score</th>
                                        <th className="p-3 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-center">Retakes Granted</th>
                                        <th className="p-3 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {studentData.map(s => (
                                        <StudentAttemptRow 
                                            key={s.studentId} 
                                            student={s} 
                                            quiz={quiz} 
                                            courseId={courseId}
                                            moduleId={moduleId}
                                            lessonId={lessonId}
                                            onUpdate={() => {
                                                // Re-trigger fetch by toggling state or calling a refresher function
                                                // For simplicity, we just trigger a re-render which calls useEffect
                                                setIsTableExpanded(false);
                                                setTimeout(() => setIsTableExpanded(true), 50);
                                            }}
                                        />
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

/* ---------------------------- AddQuizForm ------------------------------ */
const AddQuizForm = ({
    lesson,
    courseId,
    moduleId,
    onQuizAdded,
    onCancel,
}: {
    lesson: Lesson;
    courseId: string;
    moduleId: string;
    onQuizAdded: () => void;
    onCancel: () => void;
}) => {
    const [title, setTitle] = useState(lesson.quiz?.title || '');
    const existingDueDate = lesson.quiz?.dueDate ? (
        (lesson.quiz.dueDate as any).seconds
            ? new Date(lesson.quiz.dueDate.seconds * 1000).toISOString().split('T')[0]
            : new Date(lesson.quiz.dueDate).toISOString().split('T')[0]
    ) : '';
    const [dueDate, setDueDate] = useState(existingDueDate);
    
    // Default settings
    const [showAnswers, setShowAnswers] = useState(lesson.quiz?.settings?.showAnswers ?? true);
    const [isLocked, setIsLocked] = useState(lesson.quiz?.settings?.isLocked ?? false);

    const initialQuestions: Question[] = lesson.quiz?.questions 
        ? lesson.quiz.questions.map(q => ({ ...q, id: q.id || `q_${Date.now()}_${Math.random().toString(36).substr(2, 9)}` })) 
        : [];
    const [questions, setQuestions] = useState<Question[]>(initialQuestions);
    const [error, setError] = useState('');

    const addQuestion = (type: QuestionType) => {
        const newId = `q_${Date.now()}`;
        let newQuestion: Question;
        if (type === 'multiple-choice') {
            newQuestion = { id: newId, type: 'multiple-choice', questionText: '', options: ['', '', '', ''], correctAnswerIndex: 0 };
        } else if (type === 'identification') {
            newQuestion = { id: newId, type: 'identification', questionText: '', correctAnswer: '' };
        } else {
            newQuestion = { id: newId, type: 'true-or-false', questionText: '', correctAnswer: true };
        }
        setQuestions([...questions, newQuestion]);
    };

    const handleQuestionChange = (id: string, field: string, value: any) => {
        setQuestions(questions.map(q => {
            if (q.id === id) {
                if (field === 'options' && q.type === 'multiple-choice') {
                    const { index, text } = value;
                    const newOptions = [...q.options];
                    newOptions[index] = text;
                    return { ...q, options: newOptions };
                }
                return { ...q, [field]: value } as Question;
            }
            return q;
        }));
    };

    const removeQuestion = (id: string) => {
        if(window.confirm('Remove this question?')) {
            setQuestions(questions.filter(q => q.id !== id));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (!title.trim()) { setError('Quiz title is required.'); return; }
        if (!dueDate) { setError('Due date is required.'); return; }
        if (questions.length === 0) { setError('Please add at least one question.'); return; }

        // Basic Validation
        for (let i = 0; i < questions.length; i++) {
            const q = questions[i];
            if (!q.questionText.trim()) { setError(`Question ${i + 1} is missing text.`); return; }
            if (q.type === 'multiple-choice' && q.options.some(opt => !opt.trim())) { setError(`Question ${i + 1} has empty options.`); return; }
            if (q.type === 'identification' && !q.correctAnswer.trim()) { setError(`Question ${i + 1} needs a correct answer.`); return; }
        }

        try {
            const isEditing = !!lesson.quiz;
            let quizDocRef;
            if (isEditing && lesson.quiz) {
                quizDocRef = doc(db, 'courses', courseId, 'modules', moduleId, 'lessons', lesson.id, 'quizzes', lesson.quiz.id);
            } else {
                const quizzesCollectionRef = collection(db, 'courses', courseId, 'modules', moduleId, 'lessons', lesson.id, 'quizzes');
                quizDocRef = await addDoc(quizzesCollectionRef, { createdAt: serverTimestamp() });
            }
            const mainQuizDataRef = doc(quizDocRef, 'quiz-data', 'main');
            await setDoc(mainQuizDataRef, {
                title,
                questions,
                dueDate: new Date(dueDate),
                settings: {
                    showAnswers,
                    isLocked
                },
                courseId,
                createdAt: lesson.quiz?.createdAt || serverTimestamp(),
                updatedAt: serverTimestamp(),
            }, { merge: true });
            onQuizAdded();
        } catch (err) {
            console.error(err);
            setError('Failed to save quiz.');
        }
    };

    return (
        <div className="my-4 p-6 bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-xl animate-in fade-in">
            <div className="flex justify-between items-center mb-6">
                <h4 className="font-bold text-lg text-blue-900 dark:text-blue-100 flex items-center gap-2">
                    <HelpCircle className="w-5 h-5" />
                    {lesson.quiz ? 'Edit Quiz' : 'Create New Quiz'}
                </h4>
                <button onClick={onCancel} className="p-1 hover:bg-blue-100 dark:hover:bg-blue-900 rounded-full text-blue-500">
                    <X className="w-5 h-5" />
                </button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-semibold text-blue-700 dark:text-blue-300 uppercase tracking-wide mb-1">Quiz Title</label>
                        <input
                            type="text"
                            placeholder="e.g. Final Exam"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full p-2 bg-white dark:bg-gray-900 border border-blue-200 dark:border-blue-700 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-blue-700 dark:text-blue-300 uppercase tracking-wide mb-1">Due Date</label>
                        <input
                            type="date"
                            value={dueDate}
                            onChange={(e) => setDueDate(e.target.value)}
                            className="w-full p-2 bg-white dark:bg-gray-900 border border-blue-200 dark:border-blue-700 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                    </div>
                </div>

                {/* Settings Section */}
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-blue-100 dark:border-blue-800">
                    <h5 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                        <Settings className="w-4 h-4" /> Quiz Settings
                    </h5>
                    <div className="flex flex-col sm:flex-row gap-6">
                        <label className="flex items-center gap-2 cursor-pointer group">
                            <input 
                                type="checkbox" 
                                checked={showAnswers} 
                                onChange={e => setShowAnswers(e.target.checked)} 
                                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 border-gray-300 dark:border-gray-600 dark:bg-gray-700"
                            />
                            <span className="text-sm text-gray-600 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
                                Show answers after submission
                            </span>
                        </label>

                        <label className="flex items-center gap-2 cursor-pointer group">
                            <input 
                                type="checkbox" 
                                checked={isLocked} 
                                onChange={e => setIsLocked(e.target.checked)} 
                                className="w-4 h-4 text-red-600 rounded focus:ring-red-500 border-gray-300 dark:border-gray-600 dark:bg-gray-700"
                            />
                            <span className="text-sm text-gray-600 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors flex items-center gap-1">
                                <Lock className="w-3 h-3" /> Lock Quiz initially
                            </span>
                        </label>
                    </div>
                </div>

                <div className="space-y-4">
                    {questions.map((q, index) => (
                        <div key={q.id} className="p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm relative group">
                            <button 
                                type="button" 
                                onClick={() => removeQuestion(q.id)} 
                                className="absolute top-3 right-3 text-gray-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>

                            <div className="flex items-center gap-2 mb-3">
                                <span className="bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200 text-xs font-bold px-2 py-0.5 rounded uppercase">
                                    {q.type.replace('-', ' ')}
                                </span>
                                <span className="text-gray-500 dark:text-gray-400 text-xs font-mono">Q{index + 1}</span>
                            </div>

                            <textarea 
                                placeholder="Enter question..." 
                                value={q.questionText} 
                                onChange={e => handleQuestionChange(q.id, 'questionText', e.target.value)} 
                                className="w-full p-3 mb-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-md focus:border-blue-500 outline-none text-sm text-gray-900 dark:text-white resize-none"
                                rows={2}
                            />
                            
                            {q.type === 'multiple-choice' && (
                                <div className="space-y-2 pl-2 border-l-2 border-blue-100 dark:border-blue-900">
                                    {q.options.map((opt, i) => (
                                        <div key={i} className="flex items-center gap-2">
                                            <input 
                                                type="radio" 
                                                name={`correct-${q.id}`}
                                                checked={q.correctAnswerIndex === i} 
                                                onChange={() => handleQuestionChange(q.id, 'correctAnswerIndex', i)}
                                                className="w-4 h-4 text-blue-600"
                                            />
                                            <input 
                                                type="text" 
                                                value={opt} 
                                                placeholder={`Option ${i + 1}`}
                                                onChange={e => handleQuestionChange(q.id, 'options', { index: i, text: e.target.value })} 
                                                className="flex-1 p-1.5 text-sm bg-transparent border-b border-gray-200 dark:border-gray-700 focus:border-blue-500 outline-none text-gray-700 dark:text-gray-300"
                                            />
                                        </div>
                                    ))}
                                </div>
                            )}

                            {q.type === 'identification' && (
                                <div className="pl-2 border-l-2 border-yellow-200 dark:border-yellow-800">
                                    <input 
                                        type="text" 
                                        value={q.correctAnswer} 
                                        onChange={e => handleQuestionChange(q.id, 'correctAnswer', e.target.value)} 
                                        placeholder="Correct Answer" 
                                        className="w-full p-2 text-sm bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-100 dark:border-yellow-800/30 rounded text-gray-800 dark:text-gray-200"
                                    />
                                </div>
                            )}

                            {q.type === 'true-or-false' && (
                                <div className="pl-2 border-l-2 border-green-200 dark:border-green-800">
                                    <select 
                                        value={String(q.correctAnswer)} 
                                        onChange={e => handleQuestionChange(q.id, 'correctAnswer', e.target.value === 'true')}
                                        className="p-2 text-sm bg-green-50 dark:bg-green-900/10 border border-green-100 dark:border-green-800/30 rounded text-gray-800 dark:text-gray-200"
                                    >
                                        <option value="true">True</option>
                                        <option value="false">False</option>
                                    </select>
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                <div className="flex gap-2 justify-center pt-2">
                    <button type="button" onClick={() => addQuestion('multiple-choice')} className="px-3 py-1.5 text-xs bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300">+ Multi Choice</button>
                    <button type="button" onClick={() => addQuestion('identification')} className="px-3 py-1.5 text-xs bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300">+ Identification</button>
                    <button type="button" onClick={() => addQuestion('true-or-false')} className="px-3 py-1.5 text-xs bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300">+ True/False</button>
                </div>

                {error && <div className="text-red-600 text-sm text-center">{error}</div>}
                
                <div className="flex justify-end gap-3 pt-4">
                    <button type="submit" className="px-6 py-2 text-sm font-bold bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-md">
                        Save Quiz
                    </button>
                </div>
            </form>
        </div>
    );
};

/* ---------------------------- Main Component --------------------------- */
export default function ManageCoursePage() {
    const params = useParams();
    const courseId = params.courseId as string;
    const [course, setCourse] = useState<{ title: string } | null>(null);
    const [modules, setModules] = useState<Module[]>([]);
    const [newModuleTitle, setNewModuleTitle] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [pendingEnrollmentCount, setPendingEnrollmentCount] = useState(0);

    const [addingLessonToModuleId, setAddingLessonToModuleId] = useState<string | null>(null);
    const [addingQuizToLessonId, setAddingQuizToLessonId] = useState<string | null>(null);
    const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
    const [editingModuleId, setEditingModuleId] = useState<string | null>(null);
    const [editingModuleTitle, setEditingModuleTitle] = useState('');

    const fetchData = async () => {
        if (!courseId) return;
        setLoading(true);
        try {
            const courseDocRef = doc(db, 'courses', courseId);
            const courseSnap = await getDoc(courseDocRef);
            if (courseSnap.exists()) setCourse(courseSnap.data() as { title: string });

            const modulesSnapshot = await getDocs(query(collection(db, 'courses', courseId, 'modules'), orderBy('createdAt')));

            const modulesList: Module[] = await Promise.all(
                modulesSnapshot.docs.map(async (moduleDoc) => {
                    const moduleData = moduleDoc.data() as Omit<Module, 'id' | 'lessons'>;
                    const lessonsSnapshot = await getDocs(query(collection(db, 'courses', courseId, 'modules', moduleDoc.id, 'lessons'), orderBy('createdAt')));

                    const lessonsList: Lesson[] = await Promise.all(
                        lessonsSnapshot.docs.map(async (lessonDoc) => {
                            const lessonData = lessonDoc.data() as Omit<Lesson, 'id' | 'qanda' | 'quiz'>;
                            const qandaSnapshot = await getDocs(query(collection(db, 'courses', courseId, 'modules', moduleDoc.id, 'lessons', lessonDoc.id, 'qanda'), orderBy('askedAt')));
                            const qandaList = qandaSnapshot.docs.map((qDoc) => ({ id: qDoc.id, ...qDoc.data() })) as QandA[];

                            const quizzesCollectionRef = collection(db, 'courses', courseId, 'modules', moduleDoc.id, 'lessons', lessonDoc.id, 'quizzes');
                            const quizzesSnapshot = await getDocs(quizzesCollectionRef);
                            let selectedQuiz: Quiz | undefined = undefined;
                            const quizCandidates: Quiz[] = [];

                            for (const quizDoc of quizzesSnapshot.docs) {
                                const quizDataDocRef = doc(quizDoc.ref, 'quiz-data', 'main');
                                const quizDataSnap = await getDoc(quizDataDocRef);
                                if (quizDataSnap.exists()) {
                                    const qData = quizDataSnap.data() as any;
                                    quizCandidates.push({
                                        id: quizDoc.id,
                                        title: qData.title,
                                        questions: qData.questions || [],
                                        dueDate: qData.dueDate,
                                        settings: qData.settings || { showAnswers: true, isLocked: false }, // Default settings
                                        createdAt: qData.createdAt,
                                    } as Quiz);
                                }
                            }

                            if (quizCandidates.length > 0) {
                                quizCandidates.sort((a, b) => {
                                    const ta = a.createdAt ? (a.createdAt.seconds ?? 0) : 0;
                                    const tb = b.createdAt ? (b.createdAt.seconds ?? 0) : 0;
                                    return tb - ta;
                                });
                                selectedQuiz = quizCandidates[0];
                            }

                            return { id: lessonDoc.id, ...lessonData, qanda: qandaList, quiz: selectedQuiz } as Lesson;
                        })
                    );
                    return { id: moduleDoc.id, ...moduleData, lessons: lessonsList } as Module;
                })
            );

            setModules(modulesList);
            setError(null);

            const enrollmentRequestsQuery = query(collection(db, 'courses', courseId, 'enrollmentRequests'), where('status', '==', 'pending'));
            const enrollmentRequestsSnap = await getDocs(enrollmentRequestsQuery);
            setPendingEnrollmentCount(enrollmentRequestsSnap.size);
        } catch (err: any) {
            console.error(err);
            setError(err?.message || 'Failed to load course data.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, [courseId]);

    const handleDeleteModule = async (moduleId: string) => {
        if (!window.confirm('Delete module?')) return;
        try {
            const batch = writeBatch(db);
            batch.delete(doc(db, 'courses', courseId, 'modules', moduleId));
            await batch.commit();
            fetchData();
        } catch (err) { console.error(err); }
    };

    const handleDeleteLesson = async (moduleId: string, lessonId: string) => {
        if (!window.confirm('Delete lesson?')) return;
        try {
            await deleteDoc(doc(db, 'courses', courseId, 'modules', moduleId, 'lessons', lessonId));
            fetchData();
        } catch (err) { console.error(err); }
    };

    const handleDeleteQuiz = async (moduleId: string, lessonId: string, quizId: string) => {
        if (!window.confirm("Delete quiz?")) return;
        try {
            await deleteDoc(doc(db, 'courses', courseId, 'modules', moduleId, 'lessons', lessonId, 'quizzes', quizId));
            fetchData();
        } catch (err) { console.error(err); }
    };

    const deleteCourseAndCollections = async () => {
        if (!courseId) return;
        if (!window.confirm('DELETE COURSE? This cannot be undone.')) return;
        setLoading(true);
        try {
            const batch = writeBatch(db);
            const courseRef = doc(db, 'courses', courseId);
            const modulesSnapshot = await getDocs(collection(courseRef, 'modules'));
            for (const moduleDoc of modulesSnapshot.docs) {
                const moduleRef = doc(courseRef, 'modules', moduleDoc.id);
                const lessonsSnapshot = await getDocs(collection(moduleRef, 'lessons'));
                for (const lessonDoc of lessonsSnapshot.docs) {
                    batch.delete(doc(moduleRef, 'lessons', lessonDoc.id));
                }
                batch.delete(moduleRef);
            }
            batch.delete(courseRef);
            await batch.commit();
            window.location.href = '/educator/courses/my-courses';
        } catch (err) { console.error(err); } finally { setLoading(false); }
    };

    const handleAddModule = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newModuleTitle.trim() || !courseId) return;
        try {
            await addDoc(collection(db, 'courses', courseId, 'modules'), { title: newModuleTitle.trim(), createdAt: serverTimestamp(), lessons: [] });
            setNewModuleTitle('');
            fetchData();
        } catch (err) { console.error(err); }
    };

    const handleSaveModuleTitle = async (moduleId: string) => {
        if (!editingModuleTitle.trim()) return; 
        try {
            await updateDoc(doc(db, 'courses', courseId, 'modules', moduleId), { title: editingModuleTitle.trim() });
            setEditingModuleId(null);
            fetchData();
        } catch (err) { console.error(err); }
    };

    const handleStartEditModule = (module: Module) => { setEditingModuleId(module.id); setEditingModuleTitle(module.title); };
    const handleSaveLesson = () => { setAddingLessonToModuleId(null); setEditingLesson(null); fetchData(); };
    const handleCancelLesson = () => { setAddingLessonToModuleId(null); setEditingLesson(null); };
    const handleSaveQuiz = () => { setAddingQuizToLessonId(null); fetchData(); };
    const handleCancelQuiz = () => { setAddingQuizToLessonId(null); };

    if (loading) return <div className="flex h-screen items-center justify-center text-gray-500 dark:text-gray-400">Loading Manager...</div>;
    if (error) return <div className="text-center mt-20 text-red-500">{error}</div>;

    return (
        <div className="max-w-5xl mx-auto space-y-8 pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
                <div>
                    <h1 className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-1">Course Management</h1>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{course?.title || 'Untitled Course'}</h2>
                </div>
                <div className="flex flex-wrap gap-3">
                    <Link href={`/courses/${courseId}/enrollments`} className="relative flex items-center gap-2 px-4 py-2 text-sm font-semibold text-gray-700 dark:text-gray-200 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
                        <Users className="w-4 h-4" /> Enrollments
                        {pendingEnrollmentCount > 0 && <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white dark:border-gray-800 animate-pulse"></span>}
                    </Link>
                    <Link href={`/courses/${courseId}/analytics`} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-gray-700 dark:text-gray-200 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
                        <BarChart className="w-4 h-4" /> Analytics
                    </Link>
                    <button onClick={deleteCourseAndCollections} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-red-600 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors">
                        <Trash2 className="w-4 h-4" /> Delete
                    </button>
                </div>
            </div>

            {/* Add Module Input */}
            <form onSubmit={handleAddModule} className="flex gap-3">
                <input
                    type="text"
                    placeholder="New module title..."
                    value={newModuleTitle}
                    onChange={(e) => setNewModuleTitle(e.target.value)}
                    className="flex-grow px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm"
                />
                <button type="submit" className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md transition-transform active:scale-95 flex items-center gap-2">
                    <Plus className="w-5 h-5" /> Add Module
                </button>
            </form>

            {/* Modules List */}
            <div className="space-y-6">
                {modules.map((module) => (
                    <div key={module.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm overflow-hidden transition-all">
                        {/* Module Header */}
                        <div className="p-4 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                            {editingModuleId === module.id ? (
                                <div className="flex items-center gap-2 w-full">
                                    <input type="text" value={editingModuleTitle} onChange={(e) => setEditingModuleTitle(e.target.value)} className="flex-grow p-2 rounded border dark:bg-gray-700 dark:text-white dark:border-gray-600" autoFocus />
                                    <button onClick={() => handleSaveModuleTitle(module.id)} className="p-2 text-green-600 hover:bg-green-100 rounded"><Save className="w-4 h-4" /></button>
                                    <button onClick={() => setEditingModuleId(null)} className="p-2 text-gray-500 hover:bg-gray-200 rounded"><X className="w-4 h-4" /></button>
                                </div>
                            ) : (
                                <div className="flex items-center gap-3">
                                    <GripVertical className="w-5 h-5 text-gray-400 cursor-grab" />
                                    <h3 className="font-bold text-lg text-gray-800 dark:text-gray-100">{module.title}</h3>
                                    <button onClick={() => handleStartEditModule(module)} className="text-gray-400 hover:text-indigo-500"><Edit2 className="w-3.5 h-3.5" /></button>
                                </div>
                            )}
                            
                            <div className="flex items-center gap-2">
                                <Link href={`/courses/${courseId}/modules/${module.id}/discussion`} className="p-2 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg" title="Discussion"><MessageCircle className="w-4 h-4" /></Link>
                                <button onClick={() => handleDeleteModule(module.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg" title="Delete Module"><Trash2 className="w-4 h-4" /></button>
                                <button onClick={() => setAddingLessonToModuleId(addingLessonToModuleId === module.id ? null : module.id)} className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-colors ${addingLessonToModuleId === module.id ? 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20'}`}>
                                    {addingLessonToModuleId === module.id ? 'Cancel' : '+ Lesson'}
                                </button>
                            </div>
                        </div>

                        {/* Add Lesson Form */}
                        {addingLessonToModuleId === module.id && (
                            <div className="p-6 bg-indigo-50/30 dark:bg-indigo-900/10 border-b dark:border-gray-700">
                                <LessonForm moduleId={module.id} courseId={courseId} onSave={handleSaveLesson} onCancel={handleCancelLesson} />
                            </div>
                        )}

                        {/* Lessons */}
                        <div className="divide-y divide-gray-100 dark:divide-gray-700">
                            {module.lessons.length === 0 && <div className="p-4 text-center text-sm text-gray-400 italic">No lessons yet.</div>}
                            {module.lessons.map((lesson) => (
                                <div key={lesson.id} className="group">
                                    {editingLesson?.id === lesson.id ? (
                                        <div className="p-6 bg-indigo-50/30 dark:bg-indigo-900/10">
                                            <LessonForm moduleId={module.id} courseId={courseId} existingLesson={lesson} onSave={handleSaveLesson} onCancel={handleCancelLesson} />
                                        </div>
                                    ) : (
                                        <div className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800/80 transition-colors">
                                            <div className="flex justify-between items-start mb-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 bg-indigo-100 dark:bg-indigo-900/50 rounded-lg flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                                                        <FileText className="w-4 h-4" />
                                                    </div>
                                                    <div>
                                                        <h4 className="font-semibold text-gray-800 dark:text-gray-200 text-sm">{lesson.title}</h4>
                                                        <div className="flex gap-2 mt-1">
                                                            {lesson.videoUrl && <span className="flex items-center gap-1 text-[10px] font-medium text-pink-600 bg-pink-50 dark:bg-pink-900/20 px-1.5 py-0.5 rounded"><Video className="w-3 h-3" /> Video</span>}
                                                            {lesson.sandboxUrl && <span className="flex items-center gap-1 text-[10px] font-medium text-blue-600 bg-blue-50 dark:bg-blue-900/20 px-1.5 py-0.5 rounded"><Code className="w-3 h-3" /> Lab</span>}
                                                            {lesson.quiz && <span className="flex items-center gap-1 text-[10px] font-medium text-amber-600 bg-amber-50 dark:bg-amber-900/20 px-1.5 py-0.5 rounded"><HelpCircle className="w-3 h-3" /> Quiz</span>}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button onClick={() => setEditingLesson(lesson)} className="p-1.5 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400"><Edit2 className="w-4 h-4" /></button>
                                                    <button onClick={() => handleDeleteLesson(module.id, lesson.id)} className="p-1.5 text-gray-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                                                </div>
                                            </div>

                                            <div className="pl-11 pr-4">
                                                {addingQuizToLessonId === lesson.id ? (
                                                    <AddQuizForm lesson={lesson} courseId={courseId} moduleId={module.id} onQuizAdded={handleSaveQuiz} onCancel={handleCancelQuiz} />
                                                ) : lesson.quiz ? (
                                                    /* --- UPDATED: RENDER QUIZ MANAGER --- */
                                                    <QuizManager 
                                                        quiz={lesson.quiz}
                                                        courseId={courseId}
                                                        moduleId={module.id}
                                                        lessonId={lesson.id}
                                                        onUpdate={fetchData}
                                                        onEdit={() => setAddingQuizToLessonId(lesson.id)}
                                                        onDelete={() => handleDeleteQuiz(module.id, lesson.id, lesson.quiz!.id)}
                                                    />
                                                ) : (
                                                    <button onClick={() => setAddingQuizToLessonId(lesson.id)} className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 pt-2">
                                                        + Add Quiz
                                                    </button>
                                                )}
                                                
                                                {/* Q&A Section */}
                                                {lesson.qanda && lesson.qanda.length > 0 && (
                                                    <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                                                        <div className="text-xs text-gray-400 mb-2">
                                                            {lesson.qanda.length} Questions
                                                        </div>
                                                        {lesson.qanda.filter(q => !q.answerText).length > 0 && (
                                                            <div className="flex flex-col gap-2">
                                                                {lesson.qanda.filter(q => !q.answerText).map(q => (
                                                                    <div key={q.id} className="bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800/30 p-2 rounded-lg">
                                                                        <p className="text-xs text-gray-800 dark:text-gray-200 font-medium mb-1">"{q.questionText}"</p>
                                                                        <AnswerQuestionForm question={q} courseId={courseId} moduleId={module.id} lessonId={lesson.id} onAnswered={fetchData} />
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}