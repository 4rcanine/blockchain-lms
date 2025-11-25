'use client';

import { useEffect, useState, useRef } from 'react';
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
import React from 'react';
import Link from 'next/link';
import RichTextEditor, { RichTextEditorRef } from '@/components/RichTextEditor';

/* ------------------------------- Utility: Strip HTML -------------------------------- */
const stripHtml = (html: string) => {
    if (!html) return '';
    const tmp = document.createElement('DIV');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
};

/* ------------------------------- Types -------------------------------- */

// --- UPDATED QUESTION TYPES ---
type QuestionType = 'multiple-choice' | 'identification' | 'true-or-false';

interface BaseQuestion {
    id: string; // Unique ID for React keys and updating
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

// Union type for any possible question
type Question = MultipleChoiceQuestion | IdentificationQuestion | TrueOrFalseQuestion;

interface Quiz {
    id: string;
    title: string;
    questions: Question[];
    dueDate?: any;
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

/* ---------------------------- Utility: Course Coloring ----------------------------- */
const COLOR_MAP = [
    { hex: '#6366F1', classes: 'text-indigo-700 bg-indigo-100 border-indigo-300' },
    { hex: '#10B981', classes: 'text-emerald-700 bg-emerald-100 border-emerald-300' },
    { hex: '#8B5CF6', classes: 'text-purple-700 bg-purple-100 border-purple-300' },
    { hex: '#F59E0B', classes: 'text-amber-700 bg-amber-100 border-amber-300' },
    { hex: '#EC4899', classes: 'text-pink-700 bg-pink-100 border-pink-300' },
    { hex: '#06B6D4', classes: 'text-cyan-700 bg-cyan-100 border-cyan-300' },
    { hex: '#EF4444', classes: 'text-red-700 bg-red-100 border-red-300' },
];

const getColorForId = (id: string): (typeof COLOR_MAP)[number] => {
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
        hash = id.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % COLOR_MAP.length;
    return COLOR_MAP[index];
};

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
    
    // 1. Use a Ref to track content instead of State for the editor
    // This completely disconnects the Editor's internal updates from React's re-render cycle
    const contentRef = useRef(existingLesson?.content || '');
    const editorRef = useRef<RichTextEditorRef>(null);

    // 2. This ref is for the *initial* value only
    const initialContent = useRef(existingLesson?.content || '').current;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (!title.trim()) { setError('A lesson title is required.'); return; }
        if (isVideoUploading) { setError('Please wait for the video to finish uploading.'); return; }
        
        const lessonData = {
            title: title.trim(),
            content: contentRef.current, // Read from Ref
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

    // 3. Memoize the Editor Component
    // This tells React: "Never re-render this specific chunk of JSX unless initialContent changes"
    // This prevents the Title input from causing the Editor to reload.
    const MemoizedEditor = React.useMemo(() => {
        return (
            <RichTextEditor
                ref={editorRef}
                content={initialContent} 
                onUpdate={(newVal) => {
                    // Update the ref silently without triggering a re-render
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

            <form onSubmit={handleSubmit} className="my-4 p-4 bg-gray-50 border-2 border-dashed rounded-md space-y-4">
                <h4 className="font-semibold mb-2 text-gray-700">
                    {existingLesson ? 'Edit Lesson' : 'Add a New Lesson'}
                </h4>
                
                <input
                    type="text"
                    placeholder="Lesson Title*"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full p-2 border rounded-md"
                    required
                />

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Lesson Content
                    </label>
                    {/* Render the Memoized Component */}
                    {MemoizedEditor}
                </div>
                
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
                    <label className="block text-sm font-medium text-gray-700">
                        Interactive Sandbox URL (Optional)
                    </label>
                    <input
                        type="url"
                        placeholder="https://stackblitz.com/..."
                        value={sandboxUrl}
                        onChange={(e) => setSandboxUrl(e.target.value)}
                        className="w-full p-2 mt-1 border rounded-md"
                    />
                </div>

                {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
                
                <div className="flex justify-between items-center mt-4">
                    <button
                        type="button"
                        onClick={() => setIsModalOpen(true)}
                        className="px-4 py-2 text-sm font-semibold text-indigo-600 bg-indigo-100 rounded-md hover:bg-indigo-200"
                    >
                        Upload Image/File
                    </button>
                    <div className="flex justify-end items-center gap-2">
                        <button
                            type="button"
                            onClick={onCancel}
                            className="px-4 py-2 text-sm font-semibold bg-gray-200 rounded-md hover:bg-gray-300"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isVideoUploading}
                            className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-gray-400"
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
        <form onSubmit={handleSubmit} className="mt-2">
            <textarea
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="Type your answer..."
                className="w-full p-2 border rounded-md mb-2"
                rows={3}
            />
            <div className="flex gap-2">
                <button
                    type="submit"
                    disabled={saving}
                    className="px-3 py-1 text-xs bg-green-600 text-white rounded"
                >
                    {saving ? 'Saving...' : 'Submit Answer'}
                </button>
            </div>
        </form>
    );
};

/* ---------------------------- AddQuizForm (Advanced) ------------------------------ */
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
    // --- State Initialization ---
    const [title, setTitle] = useState(lesson.quiz?.title || '');
    
    // Handle date conversion safely
    const existingDueDate = lesson.quiz?.dueDate ? (
        (lesson.quiz.dueDate as any).seconds
            ? new Date(lesson.quiz.dueDate.seconds * 1000).toISOString().split('T')[0]
            : new Date(lesson.quiz.dueDate).toISOString().split('T')[0]
    ) : '';
    const [dueDate, setDueDate] = useState(existingDueDate);

    // Initialize questions safely with IDs
    const initialQuestions: Question[] = lesson.quiz?.questions 
        ? lesson.quiz.questions.map(q => ({
            ...q,
            // Ensure ID exists for editing (legacy data migration)
            id: q.id || `q_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
          })) 
        : [];
    const [questions, setQuestions] = useState<Question[]>(initialQuestions);
    const [error, setError] = useState('');

    // --- Actions ---

    const addQuestion = (type: QuestionType) => {
        const newId = `q_${Date.now()}`;
        let newQuestion: Question;

        if (type === 'multiple-choice') {
            newQuestion = { 
                id: newId, 
                type: 'multiple-choice', 
                questionText: '', 
                options: ['', '', '', ''], 
                correctAnswerIndex: 0 
            };
        } else if (type === 'identification') {
            newQuestion = { 
                id: newId, 
                type: 'identification', 
                questionText: '', 
                correctAnswer: '' 
            };
        } else { // true-or-false
            newQuestion = { 
                id: newId, 
                type: 'true-or-false', 
                questionText: '', 
                correctAnswer: true 
            };
        }
        setQuestions([...questions, newQuestion]);
    };

    const handleQuestionChange = (id: string, field: string, value: any) => {
        setQuestions(questions.map(q => {
            if (q.id === id) {
                // If we are updating options (specifically for MC questions)
                if (field === 'options' && q.type === 'multiple-choice') {
                    const { index, text } = value;
                    const newOptions = [...q.options];
                    newOptions[index] = text;
                    return { ...q, options: newOptions };
                }
                
                // Generic update for other fields
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

        // Basic Validation per question type
        for (let i = 0; i < questions.length; i++) {
            const q = questions[i];
            if (!q.questionText.trim()) {
                setError(`Question ${i + 1} is missing the question text.`);
                return;
            }
            if (q.type === 'multiple-choice') {
                if (q.options.some(opt => !opt.trim())) {
                    setError(`Question ${i + 1} has empty options.`);
                    return;
                }
            }
            if (q.type === 'identification') {
                if (!q.correctAnswer.trim()) {
                    setError(`Question ${i + 1} is missing a correct answer.`);
                    return;
                }
            }
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
                courseId,
                createdAt: lesson.quiz?.createdAt || serverTimestamp(),
                updatedAt: serverTimestamp(),
            }, { merge: true });

            onQuizAdded();
        } catch (err) {
            console.error('❌ Failed to save quiz:', err);
            setError('Failed to save quiz. See console for details.');
        }
    };

    return (
        <div className="my-4 p-4 bg-blue-50 border-2 border-dashed border-blue-300 rounded-md">
            <h4 className="font-semibold mb-4 text-blue-800">
                {lesson.quiz ? 'Edit Quiz' : 'Create New Quiz'}
            </h4>
            
            <form onSubmit={handleSubmit} className="space-y-6">
                
                {/* Global Quiz Settings */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Quiz Title</label>
                        <input
                            type="text"
                            placeholder="Final Exam, Mini Quiz 1..."
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full p-2 mt-1 border rounded-md font-bold text-gray-800"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Due Date</label>
                        <input
                            type="date"
                            value={dueDate}
                            onChange={(e) => setDueDate(e.target.value)}
                            className="w-full p-2 mt-1 border rounded-md"
                        />
                    </div>
                </div>

                {/* Questions List */}
                <div className="space-y-4">
                    {questions.map((q, index) => (
                        <div key={q.id} className="p-4 border border-gray-200 shadow-sm rounded-lg bg-white relative transition-all hover:shadow-md">
                            
                            {/* Remove Button */}
                            <button 
                                type="button" 
                                onClick={() => removeQuestion(q.id)} 
                                className="absolute top-2 right-2 text-red-400 hover:text-red-600 hover:bg-red-50 p-1 rounded-full transition-colors"
                                title="Remove Question"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>

                            {/* Question Header */}
                            <div className="flex items-center gap-2 mb-3">
                                <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2 py-0.5 rounded uppercase">
                                    {q.type.replace('-', ' ')}
                                </span>
                                <span className="text-gray-500 text-sm font-medium">Question {index + 1}</span>
                            </div>

                            {/* Question Text */}
                            <div className="mb-4">
                                <textarea 
                                    placeholder="Enter the question here..." 
                                    value={q.questionText} 
                                    onChange={e => handleQuestionChange(q.id, 'questionText', e.target.value)} 
                                    className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                    rows={2}
                                />
                            </div>
                            
                            {/* --- Type Specific Inputs --- */}
                            
                            {/* 1. Multiple Choice */}
                            {q.type === 'multiple-choice' && (
                                <div className="space-y-3 pl-4 border-l-4 border-indigo-100">
                                    <p className="text-xs text-gray-500 font-medium">Options (Select the radio button for the correct answer)</p>
                                    {q.options.map((opt, i) => (
                                        <div key={i} className="flex items-center gap-3">
                                            <input 
                                                type="radio" 
                                                name={`correct-${q.id}`}
                                                checked={q.correctAnswerIndex === i} 
                                                onChange={() => handleQuestionChange(q.id, 'correctAnswerIndex', i)}
                                                className="w-4 h-4 text-blue-600 cursor-pointer"
                                            />
                                            <input 
                                                type="text" 
                                                value={opt} 
                                                placeholder={`Option ${i + 1}`}
                                                onChange={e => handleQuestionChange(q.id, 'options', { index: i, text: e.target.value })} 
                                                className="flex-1 p-2 border rounded-md text-sm"
                                            />
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* 2. Identification */}
                            {q.type === 'identification' && (
                                <div className="pl-4 border-l-4 border-yellow-100">
                                    <label className="block text-xs text-gray-500 font-medium mb-1">Correct Answer (Exact Match)</label>
                                    <input 
                                        type="text" 
                                        value={q.correctAnswer} 
                                        onChange={e => handleQuestionChange(q.id, 'correctAnswer', e.target.value)} 
                                        placeholder="Type the correct answer..." 
                                        className="w-full p-2 border rounded-md"
                                    />
                                </div>
                            )}

                            {/* 3. True or False */}
                            {q.type === 'true-or-false' && (
                                <div className="pl-4 border-l-4 border-green-100">
                                    <label className="block text-xs text-gray-500 font-medium mb-1">Correct Answer</label>
                                    <select 
                                        value={String(q.correctAnswer)} 
                                        onChange={e => handleQuestionChange(q.id, 'correctAnswer', e.target.value === 'true')}
                                        className="p-2 border rounded-md bg-white w-48"
                                    >
                                        <option value="true">True</option>
                                        <option value="false">False</option>
                                    </select>
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                {/* Add Question Controls */}
                <div className="flex flex-col sm:flex-row items-center gap-3 p-4 bg-gray-100 rounded-md border border-gray-200">
                    <span className="text-sm font-bold text-gray-600">Add New Question:</span>
                    <div className="flex gap-2 w-full sm:w-auto">
                        <button 
                            type="button" 
                            onClick={() => addQuestion('multiple-choice')} 
                            className="flex-1 sm:flex-none px-3 py-1.5 text-xs font-medium bg-white border border-gray-300 rounded shadow-sm hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-300 transition-colors"
                        >
                            + Multiple Choice
                        </button>
                        <button 
                            type="button" 
                            onClick={() => addQuestion('identification')} 
                            className="flex-1 sm:flex-none px-3 py-1.5 text-xs font-medium bg-white border border-gray-300 rounded shadow-sm hover:bg-yellow-50 hover:text-yellow-700 hover:border-yellow-300 transition-colors"
                        >
                            + Identification
                        </button>
                        <button 
                            type="button" 
                            onClick={() => addQuestion('true-or-false')} 
                            className="flex-1 sm:flex-none px-3 py-1.5 text-xs font-medium bg-white border border-gray-300 rounded shadow-sm hover:bg-green-50 hover:text-green-700 hover:border-green-300 transition-colors"
                        >
                            + True/False
                        </button>
                    </div>
                </div>

                {/* Form Footer */}
                {error && <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded">{error}</div>}
                
                <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                    <button 
                        type="button" 
                        onClick={onCancel} 
                        className="px-4 py-2 text-sm font-semibold bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                    >
                        Cancel
                    </button>
                    <button 
                        type="submit" 
                        className="px-6 py-2 text-sm font-semibold bg-blue-600 text-white rounded-md hover:bg-blue-700 shadow-md"
                    >
                        {lesson.quiz ? 'Update Quiz' : 'Save Quiz'}
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

    // State for UI toggles
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

                            // Fetch Q&A
                            const qandaSnapshot = await getDocs(query(collection(db, 'courses', courseId, 'modules', moduleDoc.id, 'lessons', lessonDoc.id, 'qanda'), orderBy('askedAt')));
                            const qandaList = qandaSnapshot.docs.map((qDoc) => ({ id: qDoc.id, ...qDoc.data() })) as QandA[];

                            // Fetch quizzes
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
                                        // Ensure questions are cast correctly
                                        questions: qData.questions || [],
                                        dueDate: qData.dueDate,
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

                            return {
                                id: lessonDoc.id,
                                ...lessonData,
                                qanda: qandaList,
                                quiz: selectedQuiz,
                            } as Lesson;
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

    useEffect(() => {
        fetchData();
    }, [courseId]);

    // --- DELETION LOGIC ---

    const handleDeleteModule = async (moduleId: string) => {
        if (!window.confirm('Are you sure you want to delete this module? All lessons inside will be lost.')) return;
        
        try {
            const batch = writeBatch(db);
            const moduleRef = doc(db, 'courses', courseId, 'modules', moduleId);
            
            // Note: In client-side delete, we must manually delete subcollections (lessons)
            // or rely on a Cloud Function trigger. Here we do a shallow delete for UI speed.
            batch.delete(moduleRef);
            await batch.commit();
            
            fetchData();
        } catch (err) {
            console.error("Error deleting module:", err);
            alert("Failed to delete module.");
        }
    };

    const handleDeleteLesson = async (moduleId: string, lessonId: string) => {
        if (!window.confirm('Are you sure? This action cannot be undone.')) return;
        try {
            const lessonRef = doc(db, 'courses', courseId, 'modules', moduleId, 'lessons', lessonId);
            await deleteDoc(lessonRef);
            fetchData();
        } catch (err) {
            console.error("Error deleting lesson:", err);
            alert("Failed to delete lesson.");
        }
    };

    const handleDeleteQuiz = async (moduleId: string, lessonId: string, quizId: string) => {
        if (!window.confirm("Delete this quiz?")) return;
        try {
            const quizRef = doc(db, 'courses', courseId, 'modules', moduleId, 'lessons', lessonId, 'quizzes', quizId);
            await deleteDoc(quizRef);
            fetchData();
        } catch (err) {
            console.error("Error deleting quiz", err);
        }
    };

    const deleteCourseAndCollections = async () => {
        if (!courseId) return;
        if (!window.confirm('ARE YOU ABSOLUTELY SURE? Deleting this course will permanently remove all content.')) return;
        setLoading(true);
        try {
            const batch = writeBatch(db);
            const courseRef = doc(db, 'courses', courseId);
            
            // Fetch Modules to delete
            const modulesSnapshot = await getDocs(collection(courseRef, 'modules'));
            for (const moduleDoc of modulesSnapshot.docs) {
                const moduleRef = doc(courseRef, 'modules', moduleDoc.id);
                const lessonsSnapshot = await getDocs(collection(moduleRef, 'lessons'));
                
                for (const lessonDoc of lessonsSnapshot.docs) {
                    const lessonRef = doc(moduleRef, 'lessons', lessonDoc.id);
                    batch.delete(lessonRef); // Add subcollection cleanup here if needed
                }
                batch.delete(moduleRef);
            }
            
            batch.delete(courseRef);
            await batch.commit();
            window.location.href = '/educator/courses/my-courses';
        } catch (err) {
            console.error('Critical Deletion Error:', err);
            setError('Failed to delete the course.');
        } finally {
            setLoading(false);
        }
    };

    // --- HANDLERS ---

    const handleAddModule = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newModuleTitle.trim() || !courseId) return;
        try {
            await addDoc(collection(db, 'courses', courseId, 'modules'), {
                title: newModuleTitle.trim(),
                createdAt: serverTimestamp(),
                lessons: [],
            });
            setNewModuleTitle('');
            fetchData();
        } catch (err) {
            console.error(err);
        }
    };

    const handleSaveModuleTitle = async (moduleId: string) => {
        if (!editingModuleTitle.trim()) return; 
        try {
            const moduleRef = doc(db, 'courses', courseId, 'modules', moduleId);
            await updateDoc(moduleRef, { title: editingModuleTitle.trim() });
            setEditingModuleId(null);
            fetchData();
        } catch (err) {
            console.error('Failed to update module title:', err);
        }
    };

    const handleStartEditModule = (module: Module) => {
        setEditingModuleId(module.id);
        setEditingModuleTitle(module.title);
    };

    const handleSaveLesson = () => {
        setAddingLessonToModuleId(null);
        setEditingLesson(null);
        fetchData();
    };

    const handleCancelLesson = () => {
        setAddingLessonToModuleId(null);
        setEditingLesson(null);
    };

    const handleSaveQuiz = () => {
        setAddingQuizToLessonId(null);
        fetchData();
    };
    
    const handleCancelQuiz = () => {
        setAddingQuizToLessonId(null);
    };

    if (loading) return <div className="p-8 text-center text-gray-500">Loading Course Manager...</div>;
    if (error) return <div className="p-8 text-center text-red-600">Error: {error}</div>;

    return (
        <div className="space-y-8 max-w-6xl mx-auto pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div>
                    <h1 className="text-sm text-gray-500 font-medium">Managing Course</h1>
                    <h2 className="text-3xl font-bold text-gray-900">{course?.title || 'Untitled Course'}</h2>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Link
                        href={`/courses/${courseId}/enrollments`}
                        className="px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 shadow-sm hover:bg-gray-50 rounded-md relative"
                    >
                        Enrollments
                        {pendingEnrollmentCount > 0 && (
                            <span className="absolute -top-1 -right-1 inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-600 rounded-full ring-2 ring-white">
                                {pendingEnrollmentCount}
                            </span>
                        )}
                    </Link>
                    <Link
                        href={`/courses/${courseId}/analytics`}
                        className="px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 shadow-sm hover:bg-gray-50 rounded-md"
                    >
                        Analytics
                    </Link>
                    <button
                        onClick={deleteCourseAndCollections}
                        className="px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-md shadow-sm"
                    >
                        Delete Course
                    </button>
                </div>
            </div>

            {/* ADD MODULE FORM */}
            <form onSubmit={handleAddModule} className="flex gap-3 mb-8 bg-gray-50 p-4 rounded-lg border border-gray-200">
                <input
                    type="text"
                    placeholder="Enter new module title..."
                    value={newModuleTitle}
                    onChange={(e) => setNewModuleTitle(e.target.value)}
                    className="flex-grow p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
                <button
                    type="submit"
                    className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 transition-colors"
                >
                    Add Module
                </button>
            </form>

            {/* MODULES LIST */}
            <div className="space-y-8">
                {modules.length === 0 && (
                    <div className="text-center py-12 bg-white border-2 border-dashed border-gray-300 rounded-lg">
                        <p className="text-gray-500">No modules yet. Add your first module above.</p>
                    </div>
                )}
                
                {modules.map((module) => (
                    <div key={module.id} className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                        {/* Module Header */}
                        <div className="bg-gray-50 p-4 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-center gap-4">
                            {editingModuleId === module.id ? (
                                <div className="flex-grow flex gap-2 w-full">
                                    <input
                                        type="text"
                                        value={editingModuleTitle}
                                        onChange={(e) => setEditingModuleTitle(e.target.value)}
                                        className="flex-grow p-2 border rounded-md"
                                        autoFocus
                                    />
                                    <button onClick={() => handleSaveModuleTitle(module.id)} className="px-3 py-1 bg-green-600 text-white rounded">Save</button>
                                    <button onClick={() => setEditingModuleId(null)} className="px-3 py-1 bg-gray-300 rounded">Cancel</button>
                                </div>
                            ) : (
                                <div className="flex items-center gap-3 w-full sm:w-auto">
                                    <h3 className="text-xl font-bold text-gray-800">{module.title}</h3>
                                    <button onClick={() => handleStartEditModule(module)} className="text-gray-400 hover:text-blue-600">
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125" />
                                        </svg>
                                    </button>
                                </div>
                            )}

                            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                                <Link
                                    href={`/courses/${courseId}/modules/${module.id}/discussion`}
                                    className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-300 rounded hover:bg-gray-50"
                                >
                                    Discussion
                                </Link>
                                <button
                                    onClick={() => handleDeleteModule(module.id)}
                                    className="p-1.5 text-gray-400 hover:text-red-600 rounded hover:bg-red-50"
                                    title="Delete Module"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                                    </svg>
                                </button>
                                <button
                                    onClick={() => setAddingLessonToModuleId(addingLessonToModuleId === module.id ? null : module.id)}
                                    className={`px-3 py-1.5 text-sm font-semibold rounded transition-colors ${addingLessonToModuleId === module.id ? 'bg-gray-200 text-gray-700' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}
                                >
                                    {addingLessonToModuleId === module.id ? 'Close Form' : '+ Add Lesson'}
                                </button>
                            </div>
                        </div>

                        {/* Add Lesson Form */}
                        {addingLessonToModuleId === module.id && (
                            <div className="p-4 border-b border-gray-100 bg-indigo-50/50">
                                <LessonForm
                                    moduleId={module.id}
                                    courseId={courseId}
                                    onSave={handleSaveLesson}
                                    onCancel={handleCancelLesson}
                                />
                            </div>
                        )}

                        {/* Lessons List */}
                        <div className="p-4 space-y-4 bg-gray-50/30">
                            {module.lessons.length === 0 ? (
                                <p className="text-sm text-gray-500 italic ml-2">No lessons in this module.</p>
                            ) : (
                                module.lessons.map((lesson) => (
                                    <div key={lesson.id} className="bg-white border border-gray-200 rounded-lg shadow-sm">
                                        
                                        {editingLesson?.id === lesson.id ? (
                                            <div className="p-4">
                                                <LessonForm
                                                    moduleId={module.id}
                                                    courseId={courseId}
                                                    existingLesson={lesson}
                                                    onSave={handleSaveLesson}
                                                    onCancel={handleCancelLesson}
                                                />
                                            </div>
                                        ) : (
                                            <div className="p-5">
                                                {/* Lesson Header */}
                                                <div className="flex justify-between items-start mb-3">
                                                    <h4 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                                                        <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                                                        {lesson.title}
                                                    </h4>
                                                    <div className="flex items-center gap-3">
                                                        <button 
                                                            onClick={() => setEditingLesson(lesson)} 
                                                            className="text-sm font-medium text-blue-600 hover:text-blue-800"
                                                        >
                                                            Edit
                                                        </button>
                                                        <button 
                                                            onClick={() => handleDeleteLesson(module.id, lesson.id)} 
                                                            className="text-sm font-medium text-red-500 hover:text-red-700"
                                                        >
                                                            Delete
                                                        </button>
                                                    </div>
                                                </div>
                                                
                                                {/* Preview */}
                                                <div className="text-gray-600 text-sm line-clamp-2 mb-4">
                                                    {stripHtml(lesson.content)}
                                                </div>

                                                {/* Sandbox */}
                                                {lesson.sandboxUrl && (
                                                    <div className="mb-4">
                                                        <a href={lesson.sandboxUrl} target="_blank" rel="noreferrer" className="text-xs bg-gray-100 border border-gray-300 px-2 py-1 rounded hover:bg-gray-200 flex items-center gap-1 w-fit">
                                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3 h-3">
                                                                <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75 22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3-4.5 18" />
                                                            </svg>
                                                            Has Code Sandbox
                                                        </a>
                                                    </div>
                                                )}

                                                {/* Action Bar (Quiz/QnA) */}
                                                <div className="flex flex-wrap gap-4 pt-3 border-t border-gray-100">
                                                    {/* Quiz Section */}
                                                    <div className="flex-1">
                                                        {addingQuizToLessonId === lesson.id ? (
                                                            <AddQuizForm
                                                                lesson={lesson}
                                                                courseId={courseId}
                                                                moduleId={module.id}
                                                                onQuizAdded={handleSaveQuiz}
                                                                onCancel={handleCancelQuiz}
                                                            />
                                                        ) : (
                                                            <div>
                                                                {lesson.quiz ? (
                                                                    <div className="flex items-center gap-3 bg-blue-50 p-2 rounded border border-blue-100">
                                                                        <div className="flex-grow">
                                                                            <span className="text-xs font-bold text-blue-700 uppercase tracking-wide">Quiz Active</span>
                                                                            <p className="text-sm font-medium text-gray-800">{lesson.quiz.title}</p>
                                                                            <p className="text-xs text-gray-500">{lesson.quiz.questions.length} Questions</p>
                                                                        </div>
                                                                        <div className="flex flex-col gap-1">
                                                                            <button 
                                                                                onClick={() => setAddingQuizToLessonId(lesson.id)}
                                                                                className="text-xs px-2 py-1 bg-white border border-blue-200 text-blue-600 rounded hover:bg-blue-50"
                                                                            >
                                                                                Edit
                                                                            </button>
                                                                            <button 
                                                                                 onClick={() => handleDeleteQuiz(module.id, lesson.id, lesson.quiz!.id)}
                                                                                 className="text-xs px-2 py-1 bg-white border border-red-200 text-red-600 rounded hover:bg-red-50"
                                                                            >
                                                                                Remove
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                ) : (
                                                                    <button
                                                                        onClick={() => setAddingQuizToLessonId(lesson.id)}
                                                                        className="text-sm text-gray-500 hover:text-indigo-600 flex items-center gap-1"
                                                                    >
                                                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                                                                        </svg>
                                                                        Add Quiz
                                                                    </button>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Q&A Summary */}
                                                    {lesson.qanda && lesson.qanda.length > 0 && (
                                                        <div className="w-full mt-2 pt-2 border-t border-dashed border-gray-200">
                                                            <div className="text-xs font-semibold text-gray-500 mb-2 uppercase">Student Questions ({lesson.qanda.length})</div>
                                                            {lesson.qanda.filter(q => !q.answerText).length > 0 ? (
                                                                <div className="space-y-2">
                                                                     {lesson.qanda.filter(q => !q.answerText).map(q => (
                                                                         <div key={q.id} className="bg-yellow-50 p-2 rounded border border-yellow-200">
                                                                             <p className="text-sm text-gray-800 font-medium mb-1">"{q.questionText}"</p>
                                                                             <AnswerQuestionForm 
                                                                                question={q}
                                                                                courseId={courseId}
                                                                                moduleId={module.id}
                                                                                lessonId={lesson.id}
                                                                                onAnswered={fetchData}
                                                                             />
                                                                         </div>
                                                                     ))}
                                                                </div>
                                                            ) : (
                                                                <p className="text-xs text-green-600 flex items-center gap-1">
                                                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                                                                        <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z" clipRule="evenodd" />
                                                                    </svg>
                                                                    All questions answered
                                                                </p>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}