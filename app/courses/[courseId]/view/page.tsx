// app/courses/[courseId]/view/page.tsx
'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import {
    doc,
    getDoc,
    collection,
    getDocs,
    query,
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
// NOTE: ReactMarkdown is imported but not used in the final rendering 
// due to content being stored as mixed HTML/Markdown.
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// --- Type Definitions ---

interface QandA {
    id: string;
    questionText: string;
    answerText?: string;
    studentId: string;
    studentEmail: string;
    askedAt: Timestamp | Date;
}

// -- NEW QUIZ TYPE DEFINITIONS --
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

interface Quiz {
    id: string;
    title: string;
    questions: Question[];
    dueDate?: any;
    createdAt?: any;
}

interface QuizAttempt {
    studentId: string;
    score: number;
    totalQuestions: number;
    // Keys are Question IDs, Values can be index (number), text (string), or boolean
    answers: { [key: string]: number | string | boolean };
    submittedAt: any;
}

// -- LESSON & MODULE DEFINITIONS --
interface Lesson {
    id: string;
    title: string;
    content: string;
    qanda?: QandA[];
    quiz?: Quiz;
    quizAttempt?: QuizAttempt | null;
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

// --- Progress Bar Component ---
const ProgressBar = ({ progress }: { progress: number }) => (
    <div className="w-full bg-gray-200 rounded-full h-2.5">
        <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${progress}%` }}></div>
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
        <div className="mt-12 pt-8 border-t">
            <h2 className="text-2xl font-bold mb-6">Questions & Answers</h2>
            <form onSubmit={handleAskQuestion} className="mb-8">
                <textarea
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    placeholder="Ask a question about this lesson..."
                    rows={4}
                    className="w-full p-3 border rounded-md"
                    disabled={!user}
                />
                <button
                    type="submit"
                    disabled={!user || !question.trim()}
                    className="mt-2 px-5 py-2 font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-gray-400"
                >
                    Submit Question
                </button>
            </form>
            <div className="space-y-6">
                {qandaList.map((item) => (
                    <div key={item.id}>
                        <p className="font-bold text-gray-800">Q: {item.questionText}</p>
                        <p className="text-sm text-gray-500">Asked by {item.studentEmail}</p>
                        {item.answerText ? (
                            <p className="mt-2 pl-4 border-l-4 border-green-400 text-gray-700 bg-green-50 p-2">
                                <span className="font-bold">A:</span> {item.answerText}
                            </p>
                        ) : (
                            <p className="mt-2 pl-4 text-sm text-gray-500">Awaiting an answer...</p>
                        )}
                    </div>
                ))}
                {qandaList.length === 0 && (
                    <p className="text-gray-500">No questions have been asked yet.</p>
                )}
            </div>
        </div>
    );
};

// --- UPDATED QuizTaker Component ---
const QuizTaker = ({
    quiz,
    courseId,
    moduleId,
    lessonId,
    onQuizCompleted,
}: {
    quiz: Quiz;
    courseId: string;
    moduleId: string;
    lessonId: string;
    onQuizCompleted: (attempt: QuizAttempt) => void;
}) => {
    const { user } = useAuth();
    // Stores answers by Question ID
    const [selectedAnswers, setSelectedAnswers] = useState<{ [key: string]: number | string | boolean }>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    const handleAnswerSelect = (questionId: string, value: number | string | boolean) => {
        setSelectedAnswers((prev) => ({ ...prev, [questionId]: value }));
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
        quiz.questions.forEach((q) => {
            const studentAnswer = selectedAnswers[q.id];
            
            if (q.type === 'multiple-choice') {
                // Expect number index
                if (studentAnswer === q.correctAnswerIndex) {
                    score++;
                }
            } else if (q.type === 'identification') {
                // Expect string, case-insensitive comparison
                if (
                    typeof studentAnswer === 'string' &&
                    studentAnswer.trim().toLowerCase() === q.correctAnswer.trim().toLowerCase()
                ) {
                    score++;
                }
            } else if (q.type === 'true-or-false') {
                // Expect boolean
                if (studentAnswer === q.correctAnswer) {
                    score++;
                }
            }
        });

        const attemptData: QuizAttempt = {
            studentId: user.uid,
            score: score,
            totalQuestions: quiz.questions.length,
            answers: selectedAnswers,
            submittedAt: serverTimestamp(),
        };

        try {
            const batch = writeBatch(db);

            // Write attempt to quizzes/{quizId}/quizAttempts/{uid}
            const attemptDocRef = doc(
                db,
                'courses',
                courseId,
                'modules',
                moduleId,
                'lessons',
                lessonId,
                'quizzes',
                quiz.id,
                'quizAttempts',
                user.uid
            );
            batch.set(attemptDocRef, attemptData);

            // Mark lesson as complete in enrollmentRequests
            const enrollmentDocRef = doc(db, 'courses', courseId, 'enrollmentRequests', user.uid);
            batch.update(enrollmentDocRef, { completedItems: arrayUnion(lessonId) });

            await batch.commit();

            // Return attempt (with local timestamp) to parent
            onQuizCompleted({ ...attemptData, submittedAt: new Date() });
        } catch (err) {
            console.error('Failed to submit quiz:', err);
            setError('Failed to submit your quiz. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="mt-12 pt-8 border-t">
            <h2 className="text-2xl font-bold mb-2">{quiz.title}</h2>
            <p className="text-gray-600 mb-6">Complete the quiz to test your knowledge.</p>
            <div className="space-y-8">
                {quiz.questions.map((q, qIndex) => (
                    // Merged: Uses q.id if available for better React reconciliation, falls back to index
                    <div key={q.id || qIndex} className="p-4 border rounded-lg bg-gray-50">
                        <p className="font-semibold text-lg mb-3">
                            {qIndex + 1}. {q.questionText}
                        </p>
                        
                        <div className="mt-2">
                            {/* --- MULTIPLE CHOICE --- */}
                            {q.type === 'multiple-choice' && (
                                <div className="space-y-2">
                                    {q.options.map((option, oIndex) => (
                                        <label
                                            key={oIndex}
                                            className={`block p-3 border rounded-lg cursor-pointer transition-colors ${
                                                selectedAnswers[q.id] === oIndex
                                                    ? 'bg-indigo-100 border-indigo-400'
                                                    : 'bg-white hover:bg-gray-100'
                                            }`}
                                        >
                                            <input
                                                type="radio"
                                                name={`question-${q.id}`}
                                                value={oIndex}
                                                onChange={() => handleAnswerSelect(q.id, oIndex)}
                                                checked={selectedAnswers[q.id] === oIndex}
                                                className="mr-2"
                                            />
                                            {option}
                                        </label>
                                    ))}
                                </div>
                            )}

                            {/* --- IDENTIFICATION --- */}
                            {q.type === 'identification' && (
                                <input
                                    type="text"
                                    placeholder="Type your answer here..."
                                    value={(selectedAnswers[q.id] as string) || ''}
                                    onChange={(e) => handleAnswerSelect(q.id, e.target.value)}
                                    className="w-full p-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                            )}

                            {/* --- TRUE OR FALSE --- */}
                            {q.type === 'true-or-false' && (
                                <div className="flex space-x-4">
                                    <label
                                        className={`flex-1 p-3 border rounded-lg cursor-pointer text-center ${
                                            selectedAnswers[q.id] === true
                                                ? 'bg-indigo-100 border-indigo-400'
                                                : 'bg-white hover:bg-gray-100'
                                        }`}
                                    >
                                        <input
                                            type="radio"
                                            name={`question-${q.id}`}
                                            onChange={() => handleAnswerSelect(q.id, true)}
                                            checked={selectedAnswers[q.id] === true}
                                            className="mr-2"
                                        />
                                        True
                                    </label>
                                    <label
                                        className={`flex-1 p-3 border rounded-lg cursor-pointer text-center ${
                                            selectedAnswers[q.id] === false
                                                ? 'bg-indigo-100 border-indigo-400'
                                                : 'bg-white hover:bg-gray-100'
                                        }`}
                                    >
                                        <input
                                            type="radio"
                                            name={`question-${q.id}`}
                                            onChange={() => handleAnswerSelect(q.id, false)}
                                            checked={selectedAnswers[q.id] === false}
                                            className="mr-2"
                                        />
                                        False
                                    </label>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
            {error && <p className="text-red-500 mt-4">{error}</p>}
            <button
                onClick={handleSubmit}
                disabled={isSubmitting || !user}
                className="mt-6 w-full px-6 py-3 font-bold text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:bg-gray-400"
            >
                {isSubmitting ? 'Submitting...' : 'Submit Quiz'}
            </button>
        </div>
    );
};

// --- UPDATED QuizResult Component ---
const QuizResult = ({ attempt, quiz }: { attempt: QuizAttempt; quiz: Quiz }) => {
    
    return (
        <div className="mt-12 pt-8 border-t">
            <h2 className="text-2xl font-bold mb-2">Quiz Results</h2>
            <p className="text-3xl font-bold mb-6">
                Your Score: {attempt.score} / {attempt.totalQuestions}
            </p>
            <div className="space-y-6">
                {quiz.questions.map((q, qIndex) => {
                    const studentAnswer = attempt.answers[q.id];
                    let isCorrect = false;
                    let correctAnswerDisplay = '';

                    // Determine correctness and correct answer string based on type
                    if (q.type === 'multiple-choice') {
                        isCorrect = studentAnswer === q.correctAnswerIndex;
                        correctAnswerDisplay = q.options[q.correctAnswerIndex];
                    } else if (q.type === 'identification') {
                        isCorrect =
                            typeof studentAnswer === 'string' &&
                            studentAnswer.trim().toLowerCase() === q.correctAnswer.trim().toLowerCase();
                        correctAnswerDisplay = q.correctAnswer;
                    } else if (q.type === 'true-or-false') {
                        isCorrect = studentAnswer === q.correctAnswer;
                        correctAnswerDisplay = q.correctAnswer ? 'True' : 'False';
                    }

                    return (
                        // Merged: Uses q.id if available, falls back to index
                        <div key={q.id || qIndex} className="p-4 border rounded-lg bg-gray-50">
                            <p className="font-semibold mb-2">
                                {qIndex + 1}. {q.questionText}
                            </p>

                            {/* --- RENDER MULTIPLE CHOICE RESULTS --- */}
                            {q.type === 'multiple-choice' && (
                                <div className="space-y-1">
                                    {q.options.map((option, oIndex) => {
                                        const isSelected = studentAnswer === oIndex;
                                        const isThisCorrect = q.correctAnswerIndex === oIndex;
                                        let styleClass = 'bg-white';
                                        
                                        if (isThisCorrect) styleClass = 'bg-green-100 border-green-400 font-bold';
                                        else if (isSelected && !isThisCorrect) styleClass = 'bg-red-100 border-red-400';

                                        return (
                                            <div
                                                key={oIndex}
                                                className={`p-2 border rounded text-sm ${styleClass}`}
                                            >
                                                {option}
                                                {isThisCorrect && <span className="ml-2 text-green-700">(Correct)</span>}
                                                {isSelected && !isThisCorrect && <span className="ml-2 text-red-700">(Your Answer)</span>}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            {/* --- RENDER IDENTIFICATION RESULTS --- */}
                            {q.type === 'identification' && (
                                <div className="mt-2">
                                    <div className={`p-3 border rounded-md ${isCorrect ? 'bg-green-100 border-green-400' : 'bg-red-100 border-red-400'}`}>
                                        <p>
                                            <span className="font-bold">Your Answer: </span>
                                            {studentAnswer as string || '(No Answer)'}
                                        </p>
                                        {!isCorrect && (
                                            <p className="mt-1 text-sm text-gray-700">
                                                <span className="font-bold">Correct Answer: </span>
                                                {q.correctAnswer}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* --- RENDER TRUE/FALSE RESULTS --- */}
                            {q.type === 'true-or-false' && (
                                <div className="mt-2 flex gap-4">
                                    <div className={`flex-1 p-3 border rounded-md text-center ${
                                        studentAnswer === true 
                                            ? (q.correctAnswer === true ? 'bg-green-100 border-green-400' : 'bg-red-100 border-red-400') 
                                            : (q.correctAnswer === true ? 'bg-green-50 border-green-200' : 'bg-white')
                                    }`}>
                                        True {q.correctAnswer === true && '✅'}
                                    </div>
                                    <div className={`flex-1 p-3 border rounded-md text-center ${
                                        studentAnswer === false
                                            ? (q.correctAnswer === false ? 'bg-green-100 border-green-400' : 'bg-red-100 border-red-400')
                                            : (q.correctAnswer === false ? 'bg-green-50 border-green-200' : 'bg-white')
                                    }`}>
                                        False {q.correctAnswer === false && '✅'}
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

// --- Content Helper Function (FIX for Markdown Images in HTML) ---
const convertMarkdownImagesToHtml = (htmlContent: string) => {
    if (!htmlContent) return '';
    // Regex to find Markdown image links: ![Alt Text](URL)
    const markdownImageRegex = /!\[([^\]]*)\]\(([^)]*)\)/g;
    
    // Replace the Markdown syntax with a standard HTML <img> tag
    return htmlContent.replace(markdownImageRegex, (match, alt, url) => {
        return `<img src="${url}" alt="${alt}" />`;
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
    const [quizAttempt, setQuizAttempt] = useState<QuizAttempt | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [enrollmentData, setEnrollmentData] = useState<EnrollmentData | null>(null);
    const [isInstructor, setIsInstructor] = useState(false);

    // fetchQuizAttempt signature updated to accept quizId
    const fetchQuizAttempt = useCallback(async (moduleId: string, lessonId: string, quizId?: string) => {
        if (!user || !quizId) return;
        const attemptDocRef = doc(
            db,
            'courses',
            courseId,
            'modules',
            moduleId,
            'lessons',
            lessonId,
            'quizzes',
            quizId,
            'quizAttempts',
            user.uid
        );
        const attemptDocSnap = await getDoc(attemptDocRef);
        if (attemptDocSnap.exists()) {
            setQuizAttempt(attemptDocSnap.data() as QuizAttempt);
        } else {
            setQuizAttempt(null);
        }
    }, [courseId, user]);

    const fetchData = useCallback(async () => {
        if (!user || !courseId) return;

        try {
            // 1. Fetch enrollment doc
            const enrollmentRef = doc(db, 'courses', courseId, 'enrollmentRequests', user.uid);
            const enrollmentSnap = await getDoc(enrollmentRef);
            if (!enrollmentSnap.exists()) {
                throw new Error('You are not enrolled in this course.');
            }
            setEnrollmentData(enrollmentSnap.data() as EnrollmentData);

            // 2. Fetch course doc to determine instructor status
            const courseDocRef = doc(db, 'courses', courseId);
            const courseDocSnap = await getDoc(courseDocRef);
            const courseDocData = courseDocSnap.exists() ? courseDocSnap.data() : null;
            const instructorIds = (courseDocData?.instructorIds as string[] | undefined) || [];
            setIsInstructor(instructorIds.includes(user.uid));

            // 3. Fetch modules and lessons (including quizzes and the new videoUrl)
            const modulesSnapshot = await getDocs(
                query(collection(db, 'courses', courseId, 'modules'), orderBy('createdAt'))
            );

            const modulesList: Module[] = await Promise.all(
                modulesSnapshot.docs.map(async (moduleDoc) => {
                    const moduleData = moduleDoc.data() as Omit<Module, 'id' | 'lessons'>;

                    // --- FETCH LESSONS ---
                    const lessonsSnapshot = await getDocs(
                        query(
                            collection(db, 'courses', courseId, 'modules', moduleDoc.id, 'lessons'),
                            orderBy('createdAt')
                        )
                    );

                    const lessonsList: Lesson[] = await Promise.all(
                        lessonsSnapshot.docs.map(async (lessonDoc) => {
                            const lessonData = lessonDoc.data() as Omit<
                                Lesson,
                                'id' | 'qanda' | 'quiz' | 'quizAttempt'
                            >;

                            // Fetch Q&A
                            const qandaSnapshot = await getDocs(
                                query(
                                    collection(
                                        db,
                                        'courses',
                                        courseId,
                                        'modules',
                                        moduleDoc.id,
                                        'lessons',
                                        lessonDoc.id,
                                        'qanda'
                                    ),
                                    orderBy('askedAt')
                                )
                            );
                            const qandaList = qandaSnapshot.docs.map((qDoc) => ({
                                id: qDoc.id,
                                ...qDoc.data(),
                            })) as QandA[];

                            // Fetch quizzes collection and the quiz-data/main doc for each quiz
                            const quizzesCollectionRef = collection(
                                db,
                                'courses',
                                courseId,
                                'modules',
                                moduleDoc.id,
                                'lessons',
                                lessonDoc.id,
                                'quizzes'
                            );
                            const quizzesSnapshot = await getDocs(quizzesCollectionRef);

                            let selectedQuiz: Quiz | undefined = undefined;
                            const quizCandidates: Quiz[] = [];

                            for (const quizDoc of quizzesSnapshot.docs) {
                                // For each quiz document, look for quiz-data/main
                                const quizDataDocRef = doc(quizDoc.ref, 'quiz-data', 'main');
                                const quizDataSnap = await getDoc(quizDataDocRef);
                                if (quizDataSnap.exists()) {
                                    const qData = quizDataSnap.data() as any;
                                    quizCandidates.push({
                                        id: quizDoc.id,
                                        title: qData.title,
                                        questions: qData.questions || [],
                                        dueDate: qData.dueDate,
                                        createdAt: qData.createdAt,
                                    } as Quiz);
                                }
                            }

                            // If multiple quizzes exist, pick the most recent by createdAt if available
                            if (quizCandidates.length > 0) {
                                quizCandidates.sort((a, b) => {
                                    const ta = (a as any).createdAt ? ((a as any).createdAt.seconds ?? 0) : 0;
                                    const tb = (b as any).createdAt ? ((b as any).createdAt.seconds ?? 0) : 0;
                                    return tb - ta;
                                });
                                selectedQuiz = quizCandidates[0];
                            }

                            // Fetch the student's attempt for this lesson's selected quiz (if any)
                            let attempt: QuizAttempt | null = null;
                            if (user && selectedQuiz) {
                                const attemptRef = doc(
                                    db,
                                    'courses',
                                    courseId,
                                    'modules',
                                    moduleDoc.id,
                                    'lessons',
                                    lessonDoc.id,
                                    'quizzes',
                                    selectedQuiz.id,
                                    'quizAttempts',
                                    user.uid
                                );
                                const attemptSnap = await getDoc(attemptRef);
                                if (attemptSnap.exists()) {
                                    attempt = attemptSnap.data() as QuizAttempt;
                                }
                            }

                            return {
                                id: lessonDoc.id,
                                title: lessonData.title,
                                content: lessonData.content,
                                sandboxUrl: lessonData.sandboxUrl,
                                videoUrl: lessonData.videoUrl, // Include the new videoUrl
                                qanda: qandaList,
                                quiz: selectedQuiz,
                                quizAttempt: attempt,
                            } as Lesson;
                        })
                    );

                    // Auto-populate lessons field is an Instructor-only action,
                    // which is now guarded by `isInstructor`.
                    const lessonIds = lessonsList.map((l) => l.id);
                    if (instructorIds.includes(user.uid)) {
                        try {
                            await updateDoc(doc(db, 'courses', courseId, 'modules', moduleDoc.id), {
                                lessons: lessonIds,
                            });
                        } catch (err) {
                            console.warn('Could not auto-populate lessons field (non-fatal):', err);
                        }
                    }

                    return {
                        id: moduleDoc.id,
                        ...moduleData,
                        lessons: lessonsList,
                    } as Module;
                })
            );

            setModules(modulesList);

            // Auto-select first lesson if none is selected
            if (modulesList.length > 0 && modulesList[0].lessons.length > 0 && !selectedLesson) {
                const firstLesson = modulesList[0].lessons[0];
                setSelectedLesson(firstLesson);
                setCurrentModuleId(modulesList[0].id);
                // Also fetch attempt for the first lesson immediately (if quiz exists)
                if (firstLesson.quiz) {
                    await fetchQuizAttempt(modulesList[0].id, firstLesson.id, firstLesson.quiz.id);
                }
            }
        } catch (err: any) {
            console.error('Error fetching data:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [courseId, user, selectedLesson, fetchQuizAttempt]);

    const handleLessonSelect = async (lesson: Lesson, moduleId: string) => {
        // Find the full lesson object from the modules list to ensure we have the most current Q&A/Quiz data
        const module = modules.find(m => m.id === moduleId);
        const fullLesson = module?.lessons.find(l => l.id === lesson.id) || lesson;

        setSelectedLesson(fullLesson);
        setCurrentModuleId(moduleId);
        setQuizAttempt(null); // Reset quiz attempt when changing lessons

        if (fullLesson.quiz && user) {
            await fetchQuizAttempt(moduleId, fullLesson.id, fullLesson.quiz.id);
        }
    };

    // Update state locally after quiz completion
    const handleQuizCompleted = (attempt: QuizAttempt) => {
        setQuizAttempt(attempt);

        // Update enrollment data locally
        if (selectedLesson) {
            setEnrollmentData((prev) => {
                if (!prev) return null;
                const existingItems = prev.completedItems || [];
                const updatedCompletedItems = Array.from(new Set([
                    ...existingItems,
                    selectedLesson.id,
                ]));
                return {
                    ...prev,
                    completedItems: updatedCompletedItems,
                } as EnrollmentData;
            });

            // Also update modules state so UI shows quizAttempt for this lesson
            setModules((prevModules) =>
                prevModules.map((mod) =>
                    mod.id === currentModuleId
                        ? {
                            ...mod,
                            lessons: mod.lessons.map((l) =>
                                l.id === selectedLesson.id ? { ...l, quizAttempt: attempt } : l
                            ),
                        }
                        : mod
                )
            );
        }
    };

    const handleMarkComplete = async () => {
        if (!user || !selectedLesson) return;

        const isQuizPresentAndIncomplete = selectedLesson.quiz && !quizAttempt;

        if (isQuizPresentAndIncomplete) {
            alert("Please complete the quiz before marking this lesson as complete.");
            return;
        }

        try {
            const enrollmentDocRef = doc(db, 'courses', courseId, 'enrollmentRequests', user.uid);
            await updateDoc(enrollmentDocRef, {
                completedItems: arrayUnion(selectedLesson.id),
            });
            setEnrollmentData((prev) => ({
                ...prev!,
                completedItems: [...(prev?.completedItems || []).filter(id => id !== selectedLesson.id), selectedLesson.id],
            }));
        } catch (error) {
            console.error('Failed to mark complete:', error);
            setError('Failed to mark complete. Please try again.');
        }
    };

    const courseProgress = useMemo(() => {
        if (!modules.length || !enrollmentData) return 0;
        const totalItems = modules.reduce((acc, module) => acc + module.lessons.length, 0);
        if (totalItems === 0) return 0;
        const completedCount = enrollmentData.completedItems?.length || 0;
        return Math.round((completedCount / totalItems) * 100);
    }, [modules, enrollmentData]);

    const isCurrentLessonComplete =
        enrollmentData?.completedItems?.includes(selectedLesson?.id || '') ?? false;

    const isReadyToComplete = selectedLesson &&
        (!selectedLesson.quiz || quizAttempt) &&
        !isCurrentLessonComplete;

    useEffect(() => {
        if (authLoading) return;
        if (!user) {
            router.push(`/login?redirect=/courses/${courseId}/view`);
            return;
        }
        setLoading(true);
        fetchData();
    }, [courseId, user, authLoading, router, fetchData]);

    if (loading) return <p className="text-center mt-10 text-xl font-semibold">Loading Course Content... Get ready to learn! </p>;
    if (error)
        return (
            <div className="text-center mt-10 p-6 border rounded-lg shadow-lg bg-red-50">
                <h1 className="text-2xl font-bold text-red-700 mb-4">Access Denied!</h1>
                <p className="text-red-600 mb-4">{error}</p>
                <Link href="/courses" className="text-indigo-600 hover:underline font-medium">
                    Return to Course Catalog
                </Link>
            </div>
        );

    return (
        <div className="flex">
            <style jsx global>{`
                .h-screen-minus-header {
                    height: calc(100vh - 68px);
                }
            `}</style>

            <aside className="w-1/4 h-screen-minus-header p-4 bg-gray-50 border-r overflow-y-auto">
                <h2 className="text-xl font-bold mb-4">Course Outline</h2>

                <div className="mb-6">
                    <div className="flex justify-between items-center mb-1">
                        <span className="text-sm font-medium text-gray-700">Your Progress</span>
                        <span className="text-sm font-bold text-blue-600">{courseProgress}%</span>
                    </div>
                    <ProgressBar progress={courseProgress} />
                </div>

                <nav className="space-y-4">
                    {modules.map(module => (
                        <div key={module.id}>
                            {/* --- MODULE TITLE WITH DISCUSSION LINK (MODIFIED) --- */}
                            <div className="flex justify-between items-center mb-2">
                                <h3 className="font-semibold text-gray-800">{module.title}</h3>
                                <Link
                                    href={`/courses/${courseId}/modules/${module.id}/discussion`}
                                    className="text-xs font-medium text-indigo-600 hover:underline hover:text-indigo-800 transition duration-150 p-1 rounded-sm border border-transparent hover:border-indigo-200"
                                >
                                    💬 Discuss
                                </Link>
                            </div>
                            <ul className="space-y-1">
                                {module.lessons.map(lesson => (
                                    <li key={lesson.id}>
                                        <button onClick={() => handleLessonSelect(lesson, module.id)} className={`w-full text-left p-2 rounded-md flex justify-between items-center text-sm ${selectedLesson?.id === lesson.id ? 'bg-indigo-100 text-indigo-700 font-bold' : 'hover:bg-gray-200'}`}>
                                            <span>{lesson.title}</span>
                                            <div className="flex items-center gap-2">
                                                {/* --- NEW VIDEO BADGE --- */}
                                                {lesson.videoUrl && ( <span className="text-xs font-bold text-red-800 bg-red-200 px-2 py-1 rounded-full"> Video </span> )}
                                                {lesson.sandboxUrl && ( <span className="text-xs font-bold text-purple-800 bg-purple-200 px-2 py-1 rounded-full"> Lab </span> )}
                                                {lesson.quiz && ( <span className="text-xs font-bold text-blue-800 bg-blue-200 px-2 py-1 rounded-full"> Quiz </span> )}
                                                {enrollmentData?.completedItems?.includes(lesson.id) && (
                                                    <span className="text-xs font-bold text-green-800 bg-green-200 px-2 py-1 rounded-full"> Done </span>
                                                )}
                                            </div>
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </nav>
            </aside>
            
            <main className="w-3/4 p-8 overflow-y-auto h-screen-minus-header">
                {selectedLesson ? (
                    <article>
                        <h1 className="text-4xl font-bold mb-6">{selectedLesson.title}</h1>

                        {/* --- NEW VIDEO PLAYER SECTION --- */}
                        {selectedLesson.videoUrl && (
                            <div className="mb-8 shadow-lg">
                                <video
                                    key={selectedLesson.id} // Add key to force re-render on lesson change
                                    controls
                                    src={selectedLesson.videoUrl}
                                    className="w-full rounded-lg bg-black"
                                >
                                    Your browser does not support the video tag.
                                </video>
                            </div>
                        )}

                        {/* --- MAIN LESSON CONTENT (HTML/Markdown) --- */}
                        <div 
                            className="prose lg:prose-xl max-w-none mb-8 p-6 bg-white border rounded-lg shadow-sm"
                            dangerouslySetInnerHTML={{ __html: convertMarkdownImagesToHtml(selectedLesson.content) }} 
                        />
                        
                        {/* --- INTERACTIVE LAB / SANDBOX SECTION --- */}
                        {selectedLesson.sandboxUrl && (
                            <div className="mt-12 pt-8 border-t">
                                <h2 className="text-2xl font-bold mb-4">Interactive Lab</h2>
                                <p className="text-gray-600 mb-4">Practice your code directly below!</p>
                                <iframe 
                                    src={selectedLesson.sandboxUrl}
                                    title={`${selectedLesson.title} Sandbox`}
                                    className="w-full h-[500px] border border-gray-300 rounded-lg"
                                    sandbox="allow-scripts allow-same-origin allow-modals"
                                />
                            </div>
                        )}

                        {/* --- QUIZ / QUIZ RESULT SECTION --- */}
                        {selectedLesson.quiz && (
                            <>
                                {quizAttempt ? (
                                    <QuizResult attempt={quizAttempt} quiz={selectedLesson.quiz} />
                                ) : (
                                    <QuizTaker 
                                        quiz={selectedLesson.quiz}
                                        courseId={courseId}
                                        moduleId={currentModuleId!}
                                        lessonId={selectedLesson.id}
                                        onQuizCompleted={handleQuizCompleted}
                                    />
                                )}
                            </>
                        )}

                        {/* --- MARK COMPLETE BUTTON / STATUS --- */}
                        <div className="mt-12 pt-8 border-t flex justify-end">
                            {isCurrentLessonComplete ? (
                                <p className="font-bold text-lg text-green-600">Lesson Completed! 🎉</p>
                            ) : (
                                <button
                                    onClick={handleMarkComplete}
                                    disabled={!isReadyToComplete}
                                    className="px-6 py-3 font-bold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:bg-gray-400"
                                >
                                    {selectedLesson.quiz && !quizAttempt ? 'Complete Quiz to Finish' : 'Mark Lesson as Complete'}
                                </button>
                            )}
                        </div>

                        {/* --- Q&A SECTION --- */}
                        {currentModuleId && (
                            <QandASection 
                                lesson={selectedLesson}
                                courseId={courseId}
                                moduleId={currentModuleId}
                            />
                        )}

                    </article>
                ) : (
                    <div className="text-center mt-20 p-10 bg-white rounded-xl shadow-lg">
                        <h1 className="text-3xl font-bold text-gray-800 mb-4">Welcome to the Course!</h1>
                        <p className="text-gray-600">Select a lesson from the outline on the left to begin.</p>
                    </div>
                )}
            </main>
        </div>
    );
}