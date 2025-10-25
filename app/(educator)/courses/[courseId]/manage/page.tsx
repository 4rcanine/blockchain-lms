// app/(educator)/courses/[courseId]/manage/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { doc, getDoc, collection, addDoc, getDocs, query, orderBy, updateDoc, setDoc } from 'firebase/firestore';
import { db } from '@/firebase/config';
import { useParams } from 'next/navigation';
import AddContentModal from '@/components/AddContentModal';

// --- Type Definitions (with Quiz added) ---
interface QandA { id: string; questionText: string; answerText?: string; studentEmail?: string; }
interface Question { questionText: string; options: string[]; correctAnswerIndex: number; }
interface Quiz { id: string; title: string; questions: Question[]; }
interface Lesson { id: string; title: string; content: string; qanda?: QandA[]; quiz?: Quiz; } // Lesson now includes an optional quiz
interface Module { id: string; title: string; lessons: Lesson[]; }

// --- AddLessonForm Component (No changes from your code) ---
const AddLessonForm = ({ moduleId, courseId, onLessonAdded }: { moduleId: string, courseId: string, onLessonAdded: () => void }) => {
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [error, setError] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const handleSubmit = async (e: React.FormEvent) => { e.preventDefault(); if (!title.trim() || !content.trim()) { setError('Title and content are required.'); return; } try { const lessonsRef = collection(db, 'courses', courseId, 'modules', moduleId, 'lessons'); await addDoc(lessonsRef, { title, content, createdAt: new Date() }); onLessonAdded(); } catch (err) { console.error(err); setError('Failed to add lesson.'); } };
    return ( <> {isModalOpen && ( <AddContentModal onClose={() => setIsModalOpen(false)} onContentAdded={(markdown) => { setContent(prev => `${prev}\n${markdown}`); }} /> )} <form onSubmit={handleSubmit} className="my-4 p-4 bg-gray-50 border-2 border-dashed rounded-md"> <h4 className="font-semibold mb-2 text-gray-700">Add a New Lesson to this Module</h4> <input type="text" placeholder="Lesson Title" value={title} onChange={e => setTitle(e.target.value)} className="w-full p-2 mb-2 border rounded-md" /> <textarea placeholder="Lesson Content (supports Markdown)..." value={content} onChange={e => setContent(e.target.value)} rows={8} className="w-full p-2 border rounded-md" /> {error && <p className="text-red-500 text-sm mt-1">{error}</p>} <div className="flex justify-between items-center mt-2"> <button type="button" onClick={() => setIsModalOpen(true)} className="px-4 py-2 text-sm font-semibold text-indigo-600 bg-indigo-100 rounded-md hover:bg-indigo-200"> Upload Image/File </button> <button type="submit" className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700"> Save Lesson </button> </div> </form> </> );
};

// --- AnswerQuestionForm Component (No changes from your code) ---
const AnswerQuestionForm = ({ question, courseId, moduleId, lessonId, onAnswered }: { question: QandA, courseId: string, moduleId: string, lessonId: string, onAnswered: () => void }) => {
    const [isEditing, setIsEditing] = useState(!question.answerText);
    const [answer, setAnswer] = useState(question.answerText || '');
    const [isLoading, setIsLoading] = useState(false);
    const handleSaveAnswer = async () => { setIsLoading(true); const qandaDocRef = doc(db, 'courses', courseId, 'modules', moduleId, 'lessons', lessonId, 'qanda', question.id); try { await updateDoc(qandaDocRef, { answerText: answer }); setIsEditing(false); onAnswered(); } catch (error) { console.error("Failed to save answer:", error); } finally { setIsLoading(false); } };
    if (isEditing) { return ( <div className="mt-2"> <textarea value={answer} onChange={e => setAnswer(e.target.value)} rows={3} className="w-full p-2 border rounded-md" placeholder="Provide your answer here..."/> <div className="flex items-center gap-2 mt-1"> <button onClick={handleSaveAnswer} disabled={isLoading} className="px-3 py-1 text-sm font-semibold text-white bg-green-600 rounded-md hover:bg-green-700 disabled:bg-gray-400">{isLoading ? 'Saving...' : 'Save Answer'}</button> {question.answerText && (<button onClick={() => setIsEditing(false)} className="px-3 py-1 text-sm font-semibold text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300">Cancel</button>)} </div> </div> ); }
    return ( <div className="mt-2 group"> <blockquote className="pl-3 border-l-4 border-green-500 text-gray-700 bg-green-50 p-2 rounded-r-md">{answer}</blockquote> <button onClick={() => setIsEditing(true)} className="mt-1 px-3 py-1 text-xs font-semibold text-gray-600 bg-gray-200 rounded-md opacity-0 group-hover:opacity-100 transition-opacity">Edit Answer</button> </div> );
};

// --- NEW AddQuizForm Component ---
const AddQuizForm = ({ lesson, courseId, moduleId, onQuizAdded, onCancel }: { lesson: Lesson; courseId: string; moduleId: string; onQuizAdded: () => void; onCancel: () => void; }) => {
    const [title, setTitle] = useState('');
    const [questions, setQuestions] = useState<Question[]>([{ questionText: '', options: ['', '', '', ''], correctAnswerIndex: 0 }]);
    const [error, setError] = useState('');
    const handleQuestionChange = (index: number, field: string, value: string | number) => { const newQuestions = [...questions]; if (field === 'questionText' || field === 'correctAnswerIndex') { (newQuestions[index] as any)[field] = value; } else { const optionIndex = parseInt(field.split('-')[1]); newQuestions[index].options[optionIndex] = value as string; } setQuestions(newQuestions); };
    const addQuestion = () => setQuestions([...questions, { questionText: '', options: ['', '', '', ''], correctAnswerIndex: 0 }]);
    const handleSubmit = async (e: React.FormEvent) => { e.preventDefault(); if (!title.trim() || questions.some(q => !q.questionText.trim() || q.options.some(opt => !opt.trim()))) { setError('Please fill out the quiz title and all question/option fields.'); return; } setError(''); try { const quizDocRef = doc(db, 'courses', courseId, 'modules', moduleId, 'lessons', lesson.id, 'quizzes', 'quiz-data'); await setDoc(quizDocRef, { title, questions }); onQuizAdded(); } catch (err) { console.error(err); setError('Failed to save quiz.'); } };
    return ( <div className="my-4 p-4 bg-blue-50 border-2 border-dashed border-blue-300 rounded-md"> <h4 className="font-semibold mb-4 text-blue-800">Add a Quiz to this Lesson</h4> <form onSubmit={handleSubmit}> <input type="text" placeholder="Quiz Title" value={title} onChange={e => setTitle(e.target.value)} className="w-full p-2 mb-4 border rounded-md font-bold" /> {questions.map((q, index) => ( <div key={index} className="mb-4 p-3 border rounded-md bg-white"> <p className="text-sm font-bold mb-2">Question {index + 1}</p> <textarea placeholder={`Question text...`} value={q.questionText} onChange={e => handleQuestionChange(index, 'questionText', e.target.value)} className="w-full p-2 border rounded-md" /> <div className="grid grid-cols-2 gap-2 mt-2"> {q.options.map((opt, optIndex) => ( <input key={optIndex} type="text" placeholder={`Option ${optIndex + 1}`} value={opt} onChange={e => handleQuestionChange(index, `option-${optIndex}`, e.target.value)} className="w-full p-2 border rounded-md" /> ))} </div> <label className="text-xs mt-2 block">Correct Answer:</label> <select value={q.correctAnswerIndex} onChange={e => handleQuestionChange(index, 'correctAnswerIndex', parseInt(e.target.value))} className="p-2 border rounded-md text-sm"> <option value={0}>Option 1</option> <option value={1}>Option 2</option> <option value={2}>Option 3</option> <option value={3}>Option 4</option> </select> </div> ))} <div className="flex justify-between items-center"> <button type="button" onClick={addQuestion} className="text-sm font-medium text-indigo-600 hover:underline">+ Add Another Question</button> {error && <p className="text-red-500 text-sm">{error}</p>} <div className="flex gap-2"> <button type="button" onClick={onCancel} className="px-5 py-2 font-semibold text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300">Cancel</button> <button type="submit" className="px-5 py-2 font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700">Save Quiz</button> </div> </div> </form> </div> );
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
    const [addingLessonToModuleId, setAddingLessonToModuleId] = useState<string | null>(null);
    // --- NEW STATE FOR QUIZZES ---
    const [addingQuizToLessonId, setAddingQuizToLessonId] = useState<string | null>(null);

    // --- UPDATED FETCHDATA FUNCTION ---
    const fetchData = async () => {
        if (!courseId) return;
        try {
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
                        
                        // Fetch quiz data for the lesson
                        const quizDocRef = doc(db, 'courses', courseId, 'modules', moduleDoc.id, 'lessons', lessonDoc.id, 'quizzes', 'quiz-data');
                        const quizDocSnap = await getDoc(quizDocRef);
                        const quizData = quizDocSnap.exists() ? { id: quizDocSnap.id, ...quizDocSnap.data() } as Quiz : undefined;
                        
                        // THIS IS THE CORRECTED RETURN STATEMENT
                        return { id: lessonDoc.id, ...lessonDoc.data(), qanda: qandaList, quiz: quizData } as Lesson;
                    }));
                    
                    // THIS IS THE CORRECTED RETURN STATEMENT
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

    useEffect(() => {
        setLoading(true);
        fetchData();
    }, [courseId]);

    const handleAddModule = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newModuleTitle.trim() === '') return;
        try {
            await addDoc(collection(db, 'courses', courseId, 'modules'), { title: newModuleTitle.trim(), createdAt: new Date() });
            setNewModuleTitle('');
            fetchData();
        } catch (err) {
            console.error(err);
        }
    };
    
    if (loading) return <p>Loading Course Manager...</p>;
    if (error) return <p className="text-red-500">{error}</p>;

    // --- UPDATED RENDER LOGIC ---
    return (
        <div>
            <h1 className="text-sm text-gray-500">Managing Course</h1>
            <h2 className="text-3xl font-bold mb-8">{course?.title}</h2>
            <div className="mb-10 p-4 bg-white shadow-md rounded-lg">
                <h3 className="text-xl font-semibold mb-2">Create New Module</h3>
                <form onSubmit={handleAddModule} className="flex items-center gap-4">
                    <input type="text" value={newModuleTitle} onChange={e => setNewModuleTitle(e.target.value)} placeholder="e.g., Week 1: Introduction" className="w-full p-2 border rounded-md" />
                    <button type="submit" className="px-6 py-2 font-semibold text-white bg-indigo-600 rounded-md hover:bg-indigo-700 whitespace-nowrap">Add Module</button>
                </form>
            </div>
            
            <h3 className="text-2xl font-semibold mb-4">Course Content & Q&A</h3>
            <div className="space-y-6">
                {modules.map(module => (
                    <div key={module.id} className="p-4 bg-white border rounded-lg shadow-sm">
                        <div className="flex justify-between items-center">
                            <p className="font-bold text-xl">{module.title}</p>
                            <button onClick={() => setAddingLessonToModuleId(addingLessonToModuleId === module.id ? null : module.id)} className="text-sm font-medium text-indigo-600 hover:underline">
                                {addingLessonToModuleId === module.id ? 'Cancel' : '+ Add Lesson'}
                            </button>
                        </div>
                        {addingLessonToModuleId === module.id && <AddLessonForm moduleId={module.id} courseId={courseId} onLessonAdded={() => { setAddingLessonToModuleId(null); fetchData(); }} />}
                        <div className="mt-4">
                            {module.lessons.length > 0 ? module.lessons.map(lesson => (
                                <div key={lesson.id} className="ml-4 pl-4 border-l-2 py-2">
                                    <div className="flex justify-between items-center">
                                        <h4 className="font-semibold">{lesson.title}</h4>
                                        {!lesson.quiz && (
                                            <button onClick={() => setAddingQuizToLessonId(addingQuizToLessonId === lesson.id ? null : lesson.id)} className="text-xs font-bold text-blue-600 hover:underline">
                                                {addingQuizToLessonId === lesson.id ? 'Cancel Quiz' : '+ Add Quiz'}
                                            </button>
                                        )}
                                    </div>
                                    {lesson.quiz && <p className="text-sm text-green-600 font-bold mt-2">✓ Quiz Added: {lesson.quiz.title}</p>}
                                    {addingQuizToLessonId === lesson.id && <AddQuizForm lesson={lesson} courseId={courseId} moduleId={module.id} onQuizAdded={() => { setAddingQuizToLessonId(null); fetchData(); }} onCancel={() => setAddingQuizToLessonId(null)} />}
                                    {(lesson.qanda && lesson.qanda.length > 0) ? (
                                        <div className="mt-2 space-y-3">
                                            <h5 className="text-sm font-bold text-gray-600 mt-4">Questions</h5>
                                            {lesson.qanda.map(q => ( <div key={q.id} className="p-3 bg-gray-50 rounded-md text-sm"> <p className="text-gray-800 font-medium">Q: {q.questionText}</p> <p className="text-xs text-gray-500 mb-2">From: {q.studentEmail}</p> <AnswerQuestionForm question={q} courseId={courseId} moduleId={module.id} lessonId={lesson.id} onAnswered={fetchData} /> </div> ))}
                                        </div>
                                    ) : null}
                                </div>
                            )) : <p className="ml-4 text-sm text-gray-500 italic">No lessons in this module yet.</p>}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}