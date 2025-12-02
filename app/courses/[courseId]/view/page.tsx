// app/courses/[courseId]/view/page.tsx
'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import {
    doc,
    getDoc,
    collection,
    getDocs,
    query,
    where,
    orderBy,
    addDoc,
    serverTimestamp,
    updateDoc,
    arrayUnion,
    writeBatch,
    Timestamp,
} from 'firebase/firestore';
import { db } from '@/firebase/config';
import useAuth from '@/hooks/useAuth';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
    MessageCircle, 
    CheckCircle, 
    AlertCircle, 
    BookOpen, 
    Video, 
    Code, 
    HelpCircle,
    Play,
    RotateCcw,
    Lock,
    Trophy,
    History
} from 'lucide-react';

// --- Type Definitions ---

interface QandA {
    id: string;
    questionText: string;
    answerText?: string;
    studentId: string;
    studentEmail: string;
    askedAt: Timestamp | Date;
}

// -- QUIZ TYPE DEFINITIONS --
type QuestionType = 'multiple-choice' | 'identification' | 'true-or-false';

interface BaseQuestion {
    id: string;
    questionText: string;
    type: QuestionType;
    imageUrl?: string; 
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
    maxAttempts?: number;
}

interface Quiz {
    id: string;
    title: string;
    questions: Question[];
    dueDate?: any;
    settings: QuizSettings;
    createdAt?: any;
}

interface QuizAttempt {
    id: string;
    studentId: string;
    score: number;
    totalQuestions: number;
    answers: { [key: string]: number | string | boolean };
    submittedAt: any;
    attemptCount?: number; 
}

interface ReattemptGrant {
    count: number;
}

// -- LESSON & MODULE DEFINITIONS --
interface Lesson {
    id: string;
    title: string;
    content: string;
    qanda?: QandA[];
    quiz?: Quiz;
    sandboxUrl?: string;
    videoUrl?: string; 
}

interface Module {
    id: string;
    title: string;
    lessons: Lesson[];
}

interface EnrollmentData {
    status: 'enrolled';
    completedItems?: string[];
}

// --- Helper Functions ---
const getQuestionKey = (q: Question, index: number) => {
    return q.id || `index-${index}`;
};

// --- Progress Bar Component ---
const ProgressBar = ({ progress }: { progress: number }) => (
    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
        <div className="bg-indigo-600 h-2.5 rounded-full transition-all duration-500" style={{ width: `${progress}%` }}></div>
    </div>
);

// --- Q&A Section ---
const QandASection = ({
    lesson,
    courseId,
    moduleId,
}: {
    lesson: Lesson;
    courseId: string;
    moduleId: string;
}) => {
    const { user } = useAuth();
    const [question, setQuestion] = useState('');
    const [qandaList, setQandaList] = useState<QandA[]>(lesson.qanda || []);

    useEffect(() => {
        setQandaList(lesson.qanda || []);
    }, [lesson.qanda]);

    const handleAskQuestion = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!question.trim() || !user || !user.email || !user.uid) return;

        const qandaRef = collection(
            db,
            'courses',
            courseId,
            'modules',
            moduleId,
            'lessons',
            lesson.id,
            'qanda'
        );

        const newQuestionData = {
            questionText: question,
            answerText: '',
            studentId: user.uid,
            studentEmail: user.email,
            askedAt: serverTimestamp(),
        };

        try {
            const docRef = await addDoc(qandaRef, newQuestionData);
            const tempQandA: QandA = {
                id: docRef.id,
                ...newQuestionData,
                askedAt: new Date(),
                studentId: user.uid,
            };
            setQandaList((prev) => [...prev, tempQandA]);
            setQuestion('');
        } catch (error) {
            console.error('Error asking question:', error);
        }
    };

    return (
        <div className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 mb-6">
                <HelpCircle className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Questions & Answers</h2>
            </div>
            
            <form onSubmit={handleAskQuestion} className="mb-8">
                <textarea
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    placeholder="Ask a question about this lesson..."
                    rows={4}
                    className="w-full p-4 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all resize-none"
                    disabled={!user}
                />
                <div className="flex justify-end mt-2">
                    <button
                        type="submit"
                        disabled={!user || !question.trim()}
                        className="px-6 py-2.5 font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow-md"
                    >
                        Submit Question
                    </button>
                </div>
            </form>

            <div className="space-y-6">
                {qandaList.length === 0 ? (
                    <div className="text-center py-10 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
                        <MessageCircle className="w-10 h-10 text-gray-400 mx-auto mb-2" />
                        <p className="text-gray-500 dark:text-gray-400">No questions asked yet. Be the first!</p>
                    </div>
                ) : (
                    qandaList.map((item) => (
                        <div key={item.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm p-5">
                            <div className="flex items-start gap-3 mb-2">
                                <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-sm">
                                    Q
                                </div>
                                <div>
                                    <p className="font-semibold text-gray-900 dark:text-white">{item.questionText}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Asked by {item.studentEmail}</p>
                                </div>
                            </div>
                            
                            {item.answerText ? (
                                <div className="ml-11 mt-3 p-4 bg-green-50 dark:bg-green-900/10 border border-green-100 dark:border-green-900/30 rounded-lg">
                                    <div className="flex items-start gap-2">
                                        <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5" />
                                        <div>
                                            <span className="font-bold text-green-800 dark:text-green-300 block mb-1">Answer:</span>
                                            <p className="text-gray-700 dark:text-gray-300 text-sm">{item.answerText}</p>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="ml-11 mt-2 flex items-center gap-2 text-sm text-gray-400 dark:text-gray-500 italic">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                                        <circle cx="12" cy="12" r="10" />
                                        <polyline points="12 6 12 12 16 14" />
                                    </svg>
                                    Awaiting an answer...
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

// --- QuizStartScreen Component ---
const QuizStartScreen = ({ 
    quiz, 
    onStart, 
    attemptsMade, 
    retakesGranted,
    isLocked 
}: { 
    quiz: Quiz; 
    onStart: () => void; 
    attemptsMade: number;
    retakesGranted: number;
    isLocked: boolean;
}) => {
    const baseAttempts = quiz.settings?.maxAttempts || 1;
    const totalAllowedAttempts = baseAttempts + retakesGranted;
    const canTakeQuiz = attemptsMade < totalAllowedAttempts && !isLocked;

    return (
        <div className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-700 text-center">
            <div className="w-20 h-20 bg-indigo-50 dark:bg-indigo-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                <HelpCircle className="w-10 h-10 text-indigo-600 dark:text-indigo-400" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">{quiz.title}</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-lg mx-auto">
                This quiz contains {quiz.questions.length} questions.
            </p>
            
            <div className="flex flex-col items-center justify-center gap-2 mb-8">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-300">
                    <History className="w-4 h-4" />
                    <span>Attempts: {attemptsMade} / {totalAllowedAttempts}</span>
                </div>
            </div>

            {isLocked ? (
                 <div className="inline-flex items-center gap-2 px-6 py-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 font-bold rounded-xl border border-red-100 dark:border-red-900">
                    <Lock className="w-5 h-5" />
                    <span>Quiz is Locked by Instructor</span>
                </div>
            ) : canTakeQuiz ? (
                <button 
                    onClick={onStart} 
                    className="inline-flex items-center gap-2 px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg hover:shadow-indigo-500/25 transition-all transform hover:-translate-y-0.5 active:translate-y-0"
                >
                    <Play className="w-5 h-5" />
                    {attemptsMade > 0 ? 'Retake Quiz' : 'Start Quiz'}
                </button>
            ) : (
                <div className="inline-flex items-center gap-2 px-6 py-3 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 font-bold rounded-xl border border-amber-100 dark:border-amber-900">
                    <Lock className="w-5 h-5" />
                    <span>Max Attempts Reached</span>
                </div>
            )}
        </div>
    );
};

// --- QuizTaker Component ---
const QuizTaker = ({
    quiz,
    courseId,
    moduleId,
    lessonId,
    currentAttemptCount, 
    onQuizCompleted,
}: {
    quiz: Quiz;
    courseId: string;
    moduleId: string;
    lessonId: string;
    currentAttemptCount: number;
    onQuizCompleted: () => void;
}) => {
    const { user } = useAuth();
    const [selectedAnswers, setSelectedAnswers] = useState<{ [key: string]: number | string | boolean }>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    const handleAnswerSelect = (key: string, value: number | string | boolean) => {
        setSelectedAnswers((prev) => ({ ...prev, [key]: value }));
    };

    const handleSubmit = async () => {
        if (Object.keys(selectedAnswers).length !== quiz.questions.length) {
            setError('Please answer all questions before submitting.');
            return;
        }
        if (!user) {
            setError('You must be logged in to submit a quiz.');
            return;
        }
        setIsSubmitting(true);
        setError('');

        let score = 0;
        quiz.questions.forEach((q, index) => {
            const key = getQuestionKey(q, index);
            const studentAnswer = selectedAnswers[key];
            
            if (q.type === 'multiple-choice') {
                if (studentAnswer === q.correctAnswerIndex) score++;
            } else if (q.type === 'identification') {
                if (
                    typeof studentAnswer === 'string' &&
                    studentAnswer.trim().toLowerCase() === q.correctAnswer.trim().toLowerCase()
                ) {
                    score++;
                }
            } else if (q.type === 'true-or-false') {
                if (studentAnswer === q.correctAnswer) score++;
            }
        });

        const attemptData = {
            id: user.uid,
            studentId: user.uid,
            studentEmail: user.email || 'Unknown',
            score: score,
            totalQuestions: quiz.questions.length,
            answers: selectedAnswers,
            submittedAt: serverTimestamp(),
            attemptCount: currentAttemptCount + 1 
        };

        try {
            const batch = writeBatch(db);
            const attemptDocRef = doc(
                db, 
                'courses', courseId, 
                'modules', moduleId, 
                'lessons', lessonId, 
                'quizzes', quiz.id, 
                'quizAttempts', 
                user.uid
            );
            
            batch.set(attemptDocRef, attemptData);

            const enrollmentDocRef = doc(db, 'courses', courseId, 'enrollmentRequests', user.uid);
            batch.update(enrollmentDocRef, { completedItems: arrayUnion(lessonId) });
            
            await batch.commit();
            onQuizCompleted();
        } catch (err: any) {
            console.error('Failed to submit quiz:', err);
            setError(`Failed to submit: ${err.message}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                    <AlertCircle className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{quiz.title}</h2>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">Attempt {currentAttemptCount + 1}</p>
                </div>
            </div>

            <div className="space-y-6">
                {quiz.questions.map((q, qIndex) => {
                    const qKey = getQuestionKey(q, qIndex);

                    return (
                        <div key={qKey} className="p-6 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 shadow-sm">
                            <div className="flex gap-3 mb-4">
                                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 flex items-center justify-center text-sm font-bold">
                                    {qIndex + 1}
                                </span>
                                <p className="font-medium text-lg text-gray-900 dark:text-white">{q.questionText}</p>
                            </div>

                            {q.imageUrl && (
                                <div className="ml-9 mb-6">
                                    <img 
                                        src={q.imageUrl} 
                                        alt={`Visual for question ${qIndex + 1}`} 
                                        className="max-h-64 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm" 
                                    />
                                </div>
                            )}
                            
                            <div className="ml-9">
                                {q.type === 'multiple-choice' && (
                                    <div className="space-y-3">
                                        {q.options.map((option, oIndex) => (
                                            <label
                                                key={oIndex}
                                                className={`flex items-center p-4 border rounded-xl cursor-pointer transition-all ${
                                                    selectedAnswers[qKey] === oIndex
                                                        ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-500 dark:border-indigo-400 ring-1 ring-indigo-500 dark:ring-indigo-400'
                                                        : 'bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700'
                                                }`}
                                            >
                                                <input
                                                    type="radio"
                                                    name={`question-${qKey}`}
                                                    value={oIndex}
                                                    onChange={() => handleAnswerSelect(qKey, oIndex)}
                                                    checked={selectedAnswers[qKey] === oIndex}
                                                    className="w-4 h-4 text-indigo-600 border-gray-300 focus:ring-indigo-500"
                                                />
                                                <span className="ml-3 text-gray-700 dark:text-gray-200">{option}</span>
                                            </label>
                                        ))}
                                    </div>
                                )}

                                {q.type === 'identification' && (
                                    <input
                                        type="text"
                                        placeholder="Type your answer here..."
                                        value={(selectedAnswers[qKey] as string) || ''}
                                        onChange={(e) => handleAnswerSelect(qKey, e.target.value)}
                                        className="w-full p-4 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700/50 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                                    />
                                )}

                                {q.type === 'true-or-false' && (
                                    <div className="flex gap-4">
                                        {['True', 'False'].map((val) => {
                                            const boolVal = val === 'True';
                                            return (
                                                <label
                                                    key={val}
                                                    className={`flex-1 p-4 border rounded-xl cursor-pointer text-center font-medium transition-all ${
                                                        selectedAnswers[qKey] === boolVal
                                                            ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-500 dark:border-indigo-400 text-indigo-700 dark:text-indigo-300'
                                                            : 'bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                                                    }`}
                                                >
                                                    <input
                                                        type="radio"
                                                        name={`question-${qKey}`}
                                                        onChange={() => handleAnswerSelect(qKey, boolVal)}
                                                        checked={selectedAnswers[qKey] === boolVal}
                                                        className="sr-only"
                                                    />
                                                    {val}
                                                </label>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
            {error && (
                <div className="mt-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 rounded-lg flex items-center gap-2">
                    <AlertCircle className="w-5 h-5" />
                    {error}
                </div>
            )}
            <button
                onClick={handleSubmit}
                disabled={isSubmitting || !user}
                className="mt-8 w-full px-6 py-4 font-bold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-indigo-500/25 active:scale-[0.99]"
            >
                {isSubmitting ? 'Submitting...' : 'Submit Quiz'}
            </button>
        </div>
    );
};

// --- QuizResult Component ---
const QuizResult = ({ 
    attempts, 
    quiz, 
    canRetake, 
    onRetake,
    attemptsMade
}: { 
    attempts: QuizAttempt[]; 
    quiz: Quiz; 
    canRetake: boolean;
    onRetake: () => void;
    attemptsMade: number;
}) => {
    // Latest attempt
    const latestAttempt = attempts[0];
    const highestScore = Math.max(...attempts.map(a => a.score));
    const percentage = Math.round((latestAttempt.score / latestAttempt.totalQuestions) * 100);
    const showAnswers = quiz.settings?.showAnswers ?? true;
    
    return (
        <div className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-700">
            {/* Header Card */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 bg-gray-50 dark:bg-gray-800/50 p-6 rounded-2xl border border-gray-200 dark:border-gray-700">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">Quiz Results</h2>
                    <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">{quiz.title}</p>
                    
                    <div className="flex items-center gap-4">
                        <div className="px-3 py-1.5 bg-white dark:bg-gray-700 rounded-md border border-gray-200 dark:border-gray-600 text-sm text-gray-600 dark:text-gray-300 flex items-center gap-2">
                            <History className="w-4 h-4 text-indigo-500" />
                            <span>Attempt #{attemptsMade}</span>
                        </div>
                    </div>

                    {canRetake ? (
                         <button 
                            onClick={onRetake}
                            className="mt-6 flex items-center gap-2 px-4 py-2 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-lg font-bold hover:bg-indigo-200 dark:hover:bg-indigo-900/50 transition-colors"
                        >
                            <RotateCcw className="w-4 h-4" /> Retake Quiz
                        </button>
                    ) : (
                        <p className="mt-6 text-sm text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1">
                            <Lock className="w-3 h-3" /> Max attempts reached
                        </p>
                    )}
                </div>
                <div className="flex items-center gap-4">
                    <div className="text-right">
                        <p className="text-sm text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wide">Latest Score</p>
                        <p className={`text-3xl font-extrabold ${percentage >= 70 ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'}`}>
                            {latestAttempt.score} / {latestAttempt.totalQuestions}
                        </p>
                    </div>
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-lg ${percentage >= 70 ? 'bg-green-500' : 'bg-amber-500'}`}>
                        {percentage}%
                    </div>
                </div>
            </div>

            {showAnswers ? (
                <div className="space-y-6">
                    {quiz.questions.map((q, qIndex) => {
                        const qKey = getQuestionKey(q, qIndex);
                        const studentAnswer = latestAttempt.answers[qKey];
                        let isCorrect = false;
                        
                        if (q.type === 'multiple-choice') isCorrect = studentAnswer === q.correctAnswerIndex;
                        else if (q.type === 'identification') isCorrect = typeof studentAnswer === 'string' && studentAnswer.trim().toLowerCase() === q.correctAnswer.trim().toLowerCase();
                        else if (q.type === 'true-or-false') isCorrect = studentAnswer === q.correctAnswer;

                        return (
                            <div key={qKey} className={`p-6 border rounded-xl bg-white dark:bg-gray-800 shadow-sm ${isCorrect ? 'border-green-200 dark:border-green-900/50' : 'border-red-200 dark:border-red-900/50'}`}>
                                <div className="flex gap-3 mb-3">
                                    <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold ${isCorrect ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                                        {isCorrect ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                                    </div>
                                    <p className="font-medium text-lg text-gray-900 dark:text-white">{qIndex + 1}. {q.questionText}</p>
                                </div>

                                {q.type === 'multiple-choice' && (
                                    <div className="ml-9 space-y-2">
                                        {q.options.map((option, oIndex) => {
                                            const isSelected = studentAnswer === oIndex;
                                            const isThisCorrect = q.correctAnswerIndex === oIndex;
                                            let styleClass = 'bg-gray-50 dark:bg-gray-700/30 border-gray-100 dark:border-gray-700 text-gray-600 dark:text-gray-400';
                                            
                                            if (isThisCorrect) styleClass = 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-800 dark:text-green-300 font-medium ring-1 ring-green-200 dark:ring-green-800';
                                            else if (isSelected && !isThisCorrect) styleClass = 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-300 font-medium';

                                            return (
                                                <div key={oIndex} className={`p-3 border rounded-lg text-sm flex justify-between items-center ${styleClass}`}>
                                                    <span>{option}</span>
                                                    {isThisCorrect && <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Correct</span>}
                                                    {isSelected && !isThisCorrect && <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Your Answer</span>}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}

                                {(q.type === 'identification' || q.type === 'true-or-false') && (
                                    <div className="ml-9 mt-3 grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className={`p-3 rounded-lg border ${isCorrect ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'}`}>
                                            <span className="text-xs font-bold uppercase tracking-wider opacity-70 block mb-1">Your Answer</span>
                                            <p className="font-medium">{String(studentAnswer)}</p>
                                        </div>
                                        {!isCorrect && (
                                            <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-700/30 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300">
                                                <span className="text-xs font-bold uppercase tracking-wider opacity-70 block mb-1">Correct Answer</span>
                                                <p className="font-medium">{String(q.correctAnswer)}</p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="bg-gray-50 dark:bg-gray-800/50 p-6 rounded-xl border border-dashed border-gray-300 dark:border-gray-600 text-center">
                    <p className="text-gray-500 dark:text-gray-400">
                        The instructor has chosen to hide the correct answers for this quiz.
                    </p>
                </div>
            )}
        </div>
    );
};

// --- Helper for Images (Markdown) ---
const convertMarkdownImagesToHtml = (htmlContent: string) => {
    if (!htmlContent) return '';
    const markdownImageRegex = /!\[([^\]]*)\]\(([^)]*)\)/g;
    return htmlContent.replace(markdownImageRegex, (match, alt, url) => {
        return `<img src="${url}" alt="${alt}" class="rounded-lg shadow-md my-4 max-w-full h-auto border border-gray-200 dark:border-gray-700" />`;
    });
};

// --- Main Page Component ---
export default function CourseViewerPage() {
    const { user, loading: authLoading } = useAuth();
    const params = useParams();
    const router = useRouter();
    const courseId = params.courseId as string;

    const [modules, setModules] = useState<Module[]>([]);
    const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
    const [currentModuleId, setCurrentModuleId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [enrollmentData, setEnrollmentData] = useState<EnrollmentData | null>(null);
    const [isInstructor, setIsInstructor] = useState(false);

    // -- Quiz Flow States --
    const [quizState, setQuizState] = useState<'start' | 'taking' | 'result'>('start');
    const [quizAttempts, setQuizAttempts] = useState<QuizAttempt[]>([]);
    const [retakesGranted, setRetakesGranted] = useState(0);

    // FIX: State to store calculated attemptsMade
    const [attemptsMade, setAttemptsMade] = useState(0);

    const checkQuizStatus = useCallback(async (moduleId: string, lessonId: string, quizId: string) => {
        if (!user) return;
        
        try {
            // Fetch attempt using specific ID (user.uid)
            const attemptDocRef = doc(
                db, 
                'courses', courseId, 
                'modules', moduleId, 
                'lessons', lessonId, 
                'quizzes', quizId, 
                'quizAttempts', 
                user.uid
            );
            
            const attemptSnap = await getDoc(attemptDocRef);
            
            if (attemptSnap.exists()) {
                const data = attemptSnap.data() as QuizAttempt;
                // FIX: Spread order fixed to avoid TS overwrite error
                setQuizAttempts([ { ...data, id: attemptSnap.id } ]);
                
                // FIX: Set attemptsMade from the doc property, fallback to 1 if legacy doc exists but no count
                setAttemptsMade(data.attemptCount || 1);
                setQuizState('result');
            } else {
                setQuizAttempts([]);
                setAttemptsMade(0);
                setQuizState('start');
            }

            // Fetch reattempt grant count
            const reattemptDocRef = doc(
                db, 
                'courses', courseId, 
                'modules', moduleId, 
                'lessons', lessonId, 
                'quizzes', quizId, 
                'reattempts', 
                user.uid
            );
            const reattemptDocSnap = await getDoc(reattemptDocRef);
            if (reattemptDocSnap.exists()) {
                setRetakesGranted((reattemptDocSnap.data() as any).count || 0);
            } else {
                setRetakesGranted(0);
            }
        } catch (e) {
            console.error("Error checking quiz status:", e);
            setQuizState('start');
        }
    }, [courseId, user]);

    const fetchData = useCallback(async () => {
        if (!user || !courseId) return;

        try {
            const enrollmentRef = doc(db, 'courses', courseId, 'enrollmentRequests', user.uid);
            const enrollmentSnap = await getDoc(enrollmentRef);
            if (!enrollmentSnap.exists()) throw new Error('You are not enrolled in this course.');
            setEnrollmentData(enrollmentSnap.data() as EnrollmentData);

            const courseDocRef = doc(db, 'courses', courseId);
            const courseDocSnap = await getDoc(courseDocRef);
            const courseDocData = courseDocSnap.exists() ? courseDocSnap.data() : null;
            const instructorIds = (courseDocData?.instructorIds as string[] | undefined) || [];
            setIsInstructor(instructorIds.includes(user.uid));

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
                                        settings: qData.settings || { showAnswers: true, isLocked: false, maxAttempts: 1 },
                                        createdAt: qData.createdAt,
                                    } as Quiz);
                                }
                            }

                            if (quizCandidates.length > 0) {
                                quizCandidates.sort((a, b) => {
                                    const ta = (a as any).createdAt ? ((a as any).createdAt.seconds ?? 0) : 0;
                                    const tb = (b as any).createdAt ? ((b as any).createdAt.seconds ?? 0) : 0;
                                    return tb - ta;
                                });
                                selectedQuiz = quizCandidates[0];
                            }

                            return {
                                id: lessonDoc.id,
                                title: lessonData.title,
                                content: lessonData.content,
                                sandboxUrl: lessonData.sandboxUrl,
                                videoUrl: lessonData.videoUrl,
                                qanda: qandaList,
                                quiz: selectedQuiz,
                            } as Lesson;
                        })
                    );

                    return { id: moduleDoc.id, ...moduleData, lessons: lessonsList } as Module;
                })
            );

            setModules(modulesList);

            if (modulesList.length > 0 && modulesList[0].lessons.length > 0 && !selectedLesson) {
                const firstLesson = modulesList[0].lessons[0];
                setSelectedLesson(firstLesson);
                setCurrentModuleId(modulesList[0].id);
                if (firstLesson.quiz) {
                     await checkQuizStatus(modulesList[0].id, firstLesson.id, firstLesson.quiz.id);
                }
            }
        } catch (err: any) {
            console.error('Error fetching data:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [courseId, user, selectedLesson, checkQuizStatus]);

    const handleLessonSelect = async (lesson: Lesson, moduleId: string) => {
        const module = modules.find(m => m.id === moduleId);
        const fullLesson = module?.lessons.find(l => l.id === lesson.id) || lesson;
        setSelectedLesson(fullLesson);
        setCurrentModuleId(moduleId);
        setQuizState('start');
        
        if (fullLesson.quiz) {
             await checkQuizStatus(moduleId, fullLesson.id, fullLesson.quiz.id);
        }
    };

    const handleQuizCompleted = async () => {
        if (selectedLesson?.quiz && currentModuleId) {
            await checkQuizStatus(currentModuleId, selectedLesson.id, selectedLesson.quiz.id);
            // Refresh enrollment data to show checkmark
             if (user) {
                const enrollmentRef = doc(db, 'courses', courseId, 'enrollmentRequests', user.uid);
                const snap = await getDoc(enrollmentRef);
                if(snap.exists()) setEnrollmentData(snap.data() as EnrollmentData);
             }
        }
    };

    const handleRetakeQuiz = async () => {
        if (!user || !selectedLesson?.quiz || !currentModuleId) return;
        
        if (confirm("Are you sure you want to use your retake?")) {
            setQuizState('taking');
        }
    };

    const handleMarkComplete = async () => {
        if (!user || !selectedLesson) return;
        // Logic: If there is a quiz, and user hasn't passed/attempted it (no attempts), warn them.
        const isQuizPresentAndIncomplete = selectedLesson.quiz && quizAttempts.length === 0;
        
        if (isQuizPresentAndIncomplete) { alert("Please complete the quiz before marking this lesson as complete."); return; }
        try {
            await updateDoc(doc(db, 'courses', courseId, 'enrollmentRequests', user.uid), { completedItems: arrayUnion(selectedLesson.id) });
            setEnrollmentData((prev) => ({ ...prev!, completedItems: [...(prev?.completedItems || []).filter(id => id !== selectedLesson.id), selectedLesson.id] }));
        } catch (error) { console.error(error); setError('Failed to mark complete.'); }
    };

    const courseProgress = useMemo(() => {
        if (!modules.length || !enrollmentData) return 0;
        const totalItems = modules.reduce((acc, module) => acc + module.lessons.length, 0);
        if (totalItems === 0) return 0;
        return Math.round(((enrollmentData.completedItems?.length || 0) / totalItems) * 100);
    }, [modules, enrollmentData]);

    const isCurrentLessonComplete = enrollmentData?.completedItems?.includes(selectedLesson?.id || '') ?? false;
    // Ready to complete if: No quiz OR quiz exists and has been attempted
    const isReadyToComplete = selectedLesson && (!selectedLesson.quiz || quizAttempts.length > 0) && !isCurrentLessonComplete;
    // Calculation: 1 base attempt + granted retakes > current attempts
    const canRetakeQuiz = selectedLesson?.quiz?.settings?.maxAttempts 
        ? attemptsMade < (selectedLesson.quiz.settings.maxAttempts + retakesGranted)
        : attemptsMade < (1 + retakesGranted);

    useEffect(() => {
        if (authLoading) return;
        if (!user) { router.push(`/login?redirect=/courses/${courseId}/view`); return; }
        setLoading(true); fetchData();
    }, [courseId, user, authLoading, router, fetchData]);

    // --- Track Last Access ---
    useEffect(() => {
        if (user && courseId) {
            const updateLastAccess = async () => {
                try {
                    const enrollmentRef = doc(db, 'courses', courseId, 'enrollmentRequests', user.uid);
                    await updateDoc(enrollmentRef, {
                        lastAccessedAt: serverTimestamp()
                    });
                } catch (err) {
                    console.error("Error updating last access:", err);
                }
            };
            updateLastAccess();
        }
    }, [user, courseId]);

    // --- MODERNIZED SKELETON LOADER ---
    if (loading) {
        return (
            <div className="flex flex-col md:flex-row h-screen bg-slate-50 dark:bg-gray-900 overflow-hidden">
                {/* Sidebar Skeleton */}
                <aside className="w-full md:w-80 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 hidden md:flex flex-col z-20">
                    <div className="p-6 border-b border-gray-100 dark:border-gray-700 space-y-4">
                        <div className="h-6 w-1/2 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                        <div className="h-2.5 w-full bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
                    </div>
                    <div className="p-4 space-y-4">
                        {[1, 2, 3, 4, 5].map((i) => (
                            <div key={i} className="space-y-2">
                                <div className="h-4 w-1/3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                                <div className="h-10 w-full bg-gray-100 dark:bg-gray-700/50 rounded-xl animate-pulse" />
                                <div className="h-10 w-full bg-gray-100 dark:bg-gray-700/50 rounded-xl animate-pulse" />
                            </div>
                        ))}
                    </div>
                </aside>

                {/* Main Content Skeleton */}
                <main className="flex-1 p-6 md:p-12 overflow-y-hidden">
                    <div className="max-w-4xl mx-auto space-y-8">
                        {/* Breadcrumb & Title */}
                        <div className="space-y-4">
                            <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                            <div className="h-10 w-3/4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                        </div>

                        {/* Video Placeholder */}
                        <div className="w-full aspect-video bg-gray-200 dark:bg-gray-700 rounded-2xl animate-pulse" />

                        {/* Text Content */}
                        <div className="space-y-3">
                            <div className="h-4 w-full bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                            <div className="h-4 w-full bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                            <div className="h-4 w-5/6 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                            <div className="h-4 w-4/6 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                        </div>
                    </div>
                </main>
            </div>
        );
    }

    if (error) return (
        <div className="flex h-screen items-center justify-center p-6">
            <div className="text-center max-w-md bg-red-50 dark:bg-red-900/20 p-8 rounded-2xl border border-red-100 dark:border-red-900">
                <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                <h1 className="text-2xl font-bold text-red-700 dark:text-red-400 mb-2">Access Denied</h1>
                <p className="text-red-600 dark:text-red-300 mb-6">{error}</p>
                <Link href="/courses" className="px-6 py-2 bg-white dark:bg-red-900 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-200 rounded-lg font-semibold hover:bg-red-50 dark:hover:bg-red-800/50 transition">Return to Catalog</Link>
            </div>
        </div>
    );

    return (
        <div className="flex flex-col md:flex-row h-screen bg-slate-50 dark:bg-gray-900 overflow-hidden transition-colors duration-300">
            {/* --- SIDEBAR --- */}
            <aside className="w-full md:w-80 bg-white dark:bg-gray-800 border-b md:border-b-0 md:border-r border-gray-200 dark:border-gray-700 flex flex-col h-auto md:h-full z-20 shadow-sm md:shadow-none">
                <div className="p-6 border-b border-gray-100 dark:border-gray-700">
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                        <BookOpen className="w-5 h-5 text-indigo-600 dark:text-indigo-400" /> Course Outline
                    </h2>
                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Your Progress</span>
                            <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">{courseProgress}%</span>
                        </div>
                        <ProgressBar progress={courseProgress} />
                    </div>
                </div>

                <nav className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                    {modules.map(module => (
                        <div key={module.id}>
                            <div className="flex justify-between items-center mb-2 px-2">
                                <h3 className="font-semibold text-gray-700 dark:text-gray-300 text-sm uppercase tracking-wide truncate flex-1 pr-2" title={module.title}>{module.title}</h3>
                                <Link href={`/courses/${courseId}/modules/${module.id}/discussion`} className="p-1.5 text-gray-400 hover:text-indigo-600 dark:text-gray-500 dark:hover:text-indigo-400 transition-colors" title="Discussion">
                                    <MessageCircle className="w-4 h-4" />
                                </Link>
                            </div>
                            <ul className="space-y-1">
                                {module.lessons.map(lesson => {
                                    const isSelected = selectedLesson?.id === lesson.id;
                                    const isCompleted = enrollmentData?.completedItems?.includes(lesson.id);
                                    
                                    return (
                                        <li key={lesson.id}>
                                            <button 
                                                onClick={() => handleLessonSelect(lesson, module.id)} 
                                                className={`w-full text-left p-3 rounded-xl flex items-center justify-between text-sm transition-all duration-200 group ${
                                                    isSelected 
                                                        ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 font-medium shadow-sm ring-1 ring-indigo-200 dark:ring-indigo-800' 
                                                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                                                }`}
                                            >
                                                <div className="flex items-center gap-3 overflow-hidden">
                                                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${isCompleted ? 'bg-green-500' : isSelected ? 'bg-indigo-500' : 'bg-gray-300 dark:bg-gray-600'}`} />
                                                    <span className="truncate">{lesson.title}</span>
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    {lesson.videoUrl && <Video className="w-3.5 h-3.5 text-gray-400" />}
                                                    {lesson.sandboxUrl && <Code className="w-3.5 h-3.5 text-gray-400" />}
                                                    {lesson.quiz && <HelpCircle className="w-3.5 h-3.5 text-gray-400" />}
                                                    {isCompleted && <CheckCircle className="w-4 h-4 text-green-500" />}
                                                </div>
                                            </button>
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>
                    ))}
                </nav>
            </aside>
            
            {/* --- MAIN CONTENT --- */}
            <main className="flex-1 overflow-y-auto p-6 md:p-12 bg-slate-50 dark:bg-gray-900 custom-scrollbar scroll-smooth">
                <div className="max-w-4xl mx-auto pb-20">
                    {selectedLesson ? (
                        <article className="animate-in fade-in duration-500 slide-in-from-bottom-4">
                            <div className="mb-8">
                                <div className="flex items-center gap-2 text-sm text-indigo-600 dark:text-indigo-400 mb-2 font-medium">
                                    <span>Module</span>
                                    <span>/</span>
                                    <span>{modules.find(m => m.id === currentModuleId)?.title}</span>
                                </div>
                                <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white leading-tight">{selectedLesson.title}</h1>
                            </div>

                            {selectedLesson.videoUrl && (
                                <div className="mb-10 rounded-2xl overflow-hidden shadow-xl ring-1 ring-black/5 dark:ring-white/10 bg-black aspect-video">
                                    <video
                                        key={selectedLesson.id}
                                        controls
                                        src={selectedLesson.videoUrl}
                                        className="w-full h-full"
                                        poster="/video-placeholder.png" 
                                    >
                                        Your browser does not support the video tag.
                                    </video>
                                </div>
                            )}

                            <div 
                            className="prose prose-lg max-w-none mb-12 leading-relaxed
                                    prose-headings:text-gray-900 prose-p:text-gray-700 prose-strong:text-gray-900 prose-li:text-gray-700
                                    dark:prose-invert dark:prose-headings:text-white dark:prose-p:text-gray-300 dark:prose-strong:text-white dark:prose-li:text-gray-300
                                    [&_p:empty]:min-h-[1.5em]"  
                            dangerouslySetInnerHTML={{ __html: convertMarkdownImagesToHtml(selectedLesson.content) }} 
                            />
                            
                            {selectedLesson.sandboxUrl && (
                                <div className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-700">
                                    <div className="flex items-center gap-2 mb-4">
                                        <Code className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Interactive Lab</h2>
                                    </div>
                                    <div className="rounded-xl overflow-hidden shadow-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                                        <div className="bg-gray-100 dark:bg-gray-900 px-4 py-2 text-xs font-mono text-gray-500 border-b border-gray-200 dark:border-gray-700 flex gap-2">
                                            <div className="w-3 h-3 rounded-full bg-red-400" />
                                            <div className="w-3 h-3 rounded-full bg-yellow-400" />
                                            <div className="w-3 h-3 rounded-full bg-green-400" />
                                        </div>
                                        <iframe 
                                            src={selectedLesson.sandboxUrl}
                                            title={`${selectedLesson.title} Sandbox`}
                                            className="w-full h-[600px]"
                                            sandbox="allow-scripts allow-same-origin allow-modals"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* --- QUIZ SECTION --- */}
                            {selectedLesson.quiz && currentModuleId && (
                                <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 delay-150">
                                    {quizState === 'start' && (
                                        <QuizStartScreen 
                                            quiz={selectedLesson.quiz} 
                                            onStart={() => setQuizState('taking')} 
                                            // attempts={quizAttempts} <-- REMOVED to fix error
                                            retakesGranted={retakesGranted}
                                            isLocked={selectedLesson.quiz.settings.isLocked}
                                            attemptsMade={attemptsMade} // Using explicit count
                                        />
                                    )}

                                    {quizState === 'taking' && (
                                        <QuizTaker 
                                            quiz={selectedLesson.quiz}
                                            courseId={courseId}
                                            moduleId={currentModuleId}
                                            lessonId={selectedLesson.id}
                                            currentAttemptCount={attemptsMade} // Pass current count
                                            onQuizCompleted={handleQuizCompleted}
                                        />
                                    )}

                                    {quizState === 'result' && quizAttempts.length > 0 && (
                                        <QuizResult 
                                            attempts={quizAttempts} 
                                            quiz={selectedLesson.quiz} 
                                            canRetake={canRetakeQuiz}
                                            onRetake={handleRetakeQuiz}
                                            attemptsMade={attemptsMade} // Pass for display
                                        />
                                    )}
                                </div>
                            )}

                            {/* --- MARK COMPLETE BAR --- */}
                            <div className="sticky bottom-6 mt-16 z-30">
                                <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md border border-gray-200 dark:border-gray-700 p-4 rounded-2xl shadow-xl flex justify-between items-center">
                                    <div>
                                        {isCurrentLessonComplete ? (
                                            <p className="flex items-center gap-2 font-bold text-green-600 dark:text-green-400">
                                                <CheckCircle className="w-5 h-5" /> Lesson Completed
                                            </p>
                                        ) : (
                                            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                                                {selectedLesson.quiz && quizAttempts.length === 0 ? 'Complete the quiz to finish.' : 'Ready to move on?'}
                                            </p>
                                        )}
                                    </div>
                                    {!isCurrentLessonComplete && (
                                        <button
                                            onClick={handleMarkComplete}
                                            disabled={!isReadyToComplete}
                                            className="px-6 py-3 font-bold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-indigo-500/25 active:scale-95"
                                        >
                                            Mark as Complete
                                        </button>
                                    )}
                                </div>
                            </div>

                            {currentModuleId && (
                                <QandASection 
                                    lesson={selectedLesson}
                                    courseId={courseId}
                                    moduleId={currentModuleId}
                                />
                            )}

                        </article>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-[60vh] text-center">
                            <div className="w-24 h-24 bg-indigo-50 dark:bg-indigo-900/20 rounded-full flex items-center justify-center mb-6">
                                <BookOpen className="w-10 h-10 text-indigo-500 dark:text-indigo-400" />
                            </div>
                            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Welcome to the Course!</h1>
                            <p className="text-lg text-gray-500 dark:text-gray-400 max-w-md">Select a lesson from the sidebar on the left to begin your learning journey.</p>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}