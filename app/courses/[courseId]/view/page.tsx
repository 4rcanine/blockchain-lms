//app/courses/[courseId]/view/page.tsx

'use client';

import { useEffect, useState, useMemo } from 'react';
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
} from 'firebase/firestore';
import { db } from '@/firebase/config';
import useAuth from '@/hooks/useAuth';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// --- Type Definitions ---
interface QandA {
    id: string;
    questionText: string;
    answerText?: string;
    studentEmail: string;
    askedAt: any;
}
interface Question {
    questionText: string;
    options: string[];
    correctAnswerIndex: number;
}
interface Quiz {
    id: string;
    title: string;
    questions: Question[];
}
interface QuizAttempt {
    score: number;
    totalQuestions: number;
    answers: { [key: number]: number };
    submittedAt: any;
}
interface Lesson {
    id: string;
    title: string;
    content: string;
    qanda?: QandA[];
    quiz?: Quiz;
    sandboxUrl?: string;
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

    const handleAskQuestion = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!question.trim() || !user || !user.email) return;
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
        const newQuestion = {
            questionText: question,
            answerText: '',
            studentId: user.uid,
            studentEmail: user.email,
            askedAt: serverTimestamp(),
        };
        await addDoc(qandaRef, newQuestion);
        setQandaList([...qandaList, { ...newQuestion, id: 'temp', askedAt: new Date() }]);
        setQuestion('');
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
                />
                <button
                    type="submit"
                    className="mt-2 px-5 py-2 font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700"
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

// --- QuizTaker Component ---
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
    onQuizCompleted: () => void;
}) => {
    const { user } = useAuth();
    const [selectedAnswers, setSelectedAnswers] = useState<{ [key: number]: number }>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    const handleAnswerSelect = (questionIndex: number, optionIndex: number) => {
        setSelectedAnswers((prev) => ({ ...prev, [questionIndex]: optionIndex }));
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
            if (selectedAnswers[index] === q.correctAnswerIndex) {
                score++;
            }
        });
        const attemptData = {
            studentId: user.uid,
            score: score,
            totalQuestions: quiz.questions.length,
            answers: selectedAnswers,
            submittedAt: serverTimestamp(),
        };
        try {
            const batch = writeBatch(db);
            const attemptDocRef = doc(
                db,
                'courses',
                courseId,
                'modules',
                moduleId,
                'lessons',
                lessonId,
                'quizzes',
                'quiz-data',
                'quizAttempts',
                user.uid
            );
            batch.set(attemptDocRef, attemptData);
            const enrollmentDocRef = doc(db, 'courses', courseId, 'enrollmentRequests', user.uid);
            batch.update(enrollmentDocRef, { completedItems: arrayUnion(lessonId) });
            await batch.commit();
            onQuizCompleted();
        } catch (err) {
            console.error(err);
            setError('Failed to submit your quiz. Please try again.');
            setIsSubmitting(false);
        }
    };

    return (
        <div className="mt-12 pt-8 border-t">
            <h2 className="text-2xl font-bold mb-2">{quiz.title}</h2>
            <p className="text-gray-600 mb-6">Complete the quiz to test your knowledge.</p>
            <div className="space-y-6">
                {quiz.questions.map((q, qIndex) => (
                    <div key={qIndex}>
                        <p className="font-semibold">
                            {qIndex + 1}. {q.questionText}
                        </p>
                        <div className="mt-2 space-y-2">
                            {q.options.map((option, oIndex) => (
                                <label
                                    key={oIndex}
                                    className={`block p-3 border rounded-lg cursor-pointer ${
                                        selectedAnswers[qIndex] === oIndex
                                            ? 'bg-indigo-100 border-indigo-400'
                                            : 'hover:bg-gray-100'
                                    }`}
                                >
                                    <input
                                        type="radio"
                                        name={`question-${qIndex}`}
                                        value={oIndex}
                                        onChange={() => handleAnswerSelect(qIndex, oIndex)}
                                        className="mr-2"
                                    />
                                    {option}
                                </label>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
            {error && <p className="text-red-500 mt-4">{error}</p>}
            <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="mt-6 w-full px-6 py-3 font-bold text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:bg-gray-400"
            >
                {isSubmitting ? 'Submitting...' : 'Submit Quiz'}
            </button>
        </div>
    );
};

// --- QuizResult Component ---
const QuizResult = ({ attempt, quiz }: { attempt: QuizAttempt; quiz: Quiz }) => {
    const getOptionClassName = (qIndex: number, oIndex: number) => {
        const isCorrect = quiz.questions[qIndex].correctAnswerIndex === oIndex;
        const isSelected = attempt.answers[qIndex] === oIndex;
        if (isCorrect) return 'bg-green-100 border-green-400';
        if (isSelected && !isCorrect) return 'bg-red-100 border-red-400';
        return 'bg-gray-50';
    };
    return (
        <div className="mt-12 pt-8 border-t">
            <h2 className="text-2xl font-bold mb-2">Quiz Results</h2>
            <p className="text-3xl font-bold mb-6">
                Your Score: {attempt.score} / {attempt.totalQuestions}
            </p>
            <div className="space-y-6">
                {quiz.questions.map((q, qIndex) => (
                    <div key={qIndex}>
                        <p className="font-semibold">
                            {qIndex + 1}. {q.questionText}
                        </p>
                        <div className="mt-2 space-y-2">
                            {q.options.map((option, oIndex) => (
                                <div
                                    key={oIndex}
                                    className={`block p-3 border rounded-lg text-sm ${getOptionClassName(
                                        qIndex,
                                        oIndex
                                    )}`}
                                >
                                    {option}
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
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

    const fetchData = async () => {
        if (!user || !courseId) return;
        try {
            // fetch enrollment doc first (this enforces rule)
            const enrollmentRef = doc(db, 'courses', courseId, 'enrollmentRequests', user.uid);
            const enrollmentSnap = await getDoc(enrollmentRef);
            if (!enrollmentSnap.exists()) {
                throw new Error('You are not enrolled in this course.');
            }
            setEnrollmentData(enrollmentSnap.data() as EnrollmentData);

            // fetch course doc to determine instructor status (so we avoid forbidden writes)
            const courseDocRef = doc(db, 'courses', courseId);
            const courseDocSnap = await getDoc(courseDocRef);
            const courseDocData = courseDocSnap.exists() ? courseDocSnap.data() : null;
            const instructorIds = (courseDocData?.instructorIds as string[] | undefined) || [];
            setIsInstructor(instructorIds.includes(user.uid));

            // fetch modules (read)
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
                                'id' | 'qanda' | 'quiz'
                            >;

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

                            const quizDocRef = doc(
                                db,
                                'courses',
                                courseId,
                                'modules',
                                moduleDoc.id,
                                'lessons',
                                lessonDoc.id,
                                'quizzes',
                                'quiz-data'
                            );
                            const quizDocSnap = await getDoc(quizDocRef);
                            const quizData = quizDocSnap.exists()
                                ? ({ id: quizDocSnap.id, ...quizDocSnap.data() } as Quiz)
                                : undefined;

                            return {
                                id: lessonDoc.id,
                                ...lessonData,
                                qanda: qandaList,
                                quiz: quizData,
                            } as Lesson;
                        })
                    );

                    // --- AUTO-POPULATE LESSONS FIELD (only if the current user is an instructor) ---
                    const lessonIds = lessonsList.map((l) => l.id);
                    if (isInstructor) {
                        try {
                            await updateDoc(doc(db, 'courses', courseId, 'modules', moduleDoc.id), {
                                lessons: lessonIds,
                            });
                        } catch (err) {
                            // If update fails for any reason, log but continue.
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
            if (modulesList.length > 0 && modulesList[0].lessons.length > 0) {
                handleLessonSelect(modulesList[0].lessons[0], modulesList[0].id);
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleLessonSelect = async (lesson: Lesson, moduleId: string) => {
        setSelectedLesson(lesson);
        setCurrentModuleId(moduleId);
        setQuizAttempt(null);
        if (lesson.quiz && user) {
            const attemptDocRef = doc(
                db,
                'courses',
                courseId,
                'modules',
                moduleId,
                'lessons',
                lesson.id,
                'quizzes',
                'quiz-data',
                'quizAttempts',
                user.uid
            );
            const attemptDocSnap = await getDoc(attemptDocRef);
            if (attemptDocSnap.exists()) {
                setQuizAttempt(attemptDocSnap.data() as QuizAttempt);
            }
        }
    };

    const handleMarkComplete = async () => {
        if (!user || !selectedLesson) return;
        try {
            const enrollmentDocRef = doc(db, 'courses', courseId, 'enrollmentRequests', user.uid);
            await updateDoc(enrollmentDocRef, {
                completedItems: arrayUnion(selectedLesson.id),
            });
            setEnrollmentData((prev) => ( {
                ...prev!,
                completedItems: [...(prev?.completedItems || []), selectedLesson.id],
            }));
        } catch (error) {
            console.error('Failed to mark complete:', error);
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

    useEffect(() => {
        if (authLoading) return;
        if (!user) {
            router.push(`/login?redirect=/courses/${courseId}/view`);
            return;
        }
        setLoading(true);
        fetchData();
    }, [courseId, user, authLoading, router, isInstructor]);

    if (loading) return <p>Loading Course Content...</p>;
    if (error)
        return (
            <div className="text-center mt-10">
                <p className="text-red-500 mb-4">{error}</p>
                <Link href="/courses" className="text-indigo-600 hover:underline">
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

                <div className="mb-4">
                    <div className="flex justify-between items-center mb-1">
                        <span className="text-sm font-medium text-gray-700">Progress</span>
                        <span className="text-sm font-medium text-gray-700">
                            {courseProgress}%
                        </span>
                    </div>
                    <ProgressBar progress={courseProgress} />
                </div>

                <nav className="space-y-4">
                {modules.map((module) => (
                    <div key={module.id}>
                        <h3 className="font-semibold text-gray-800 mb-2">{module.title}</h3>
                        <ul className="space-y-1">
                            {module.lessons.map((lesson) => (
                                <li key={lesson.id}>
                                    <button
                                        onClick={() => handleLessonSelect(lesson, module.id)}
                                        className={`w-full text-left p-2 rounded-md flex justify-between items-center text-sm ${
                                            selectedLesson?.id === lesson.id
                                                ? 'bg-indigo-100 text-indigo-700 font-bold'
                                                : 'hover:bg-gray-200'
                                        }`}
                                    >
                                        <span>{lesson.title}</span>
                                        <div className="flex items-center gap-2">
                                            {lesson.sandboxUrl && (
                                                <span className="text-xs font-bold text-purple-800 bg-purple-200 px-2 py-1 rounded-full">
                                                    Lab
                                                </span>
                                            )}
                                            {lesson.quiz && (
                                                <span className="text-xs font-bold text-blue-800 bg-blue-200 px-2 py-1 rounded-full">
                                                    Quiz
                                                </span>
                                            )}
                                            {enrollmentData?.completedItems?.includes(lesson.id) && (
                                                <span className="text-xs font-bold text-green-800 bg-green-200 px-2 py-1 rounded-full">
                                                    Done
                                                </span>
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

            {/* --- MAIN LESSON AREA --- */}
            <main className="w-3/4 p-8 overflow-y-auto h-screen-minus-header">
                {selectedLesson ? (
                    <article>
                        <h1 className="text-4xl font-bold mb-6">{selectedLesson.title}</h1>
                        <div className="prose lg:prose-xl max-w-none">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                {selectedLesson.content}
                            </ReactMarkdown>
                        </div>

                        {/* --- Optional Lab --- */}
                        {selectedLesson.sandboxUrl && (
                            <div className="mt-12 pt-8 border-t">
                                <h2 className="text-2xl font-bold mb-4">Interactive Lab</h2>
                                <iframe
                                    src={selectedLesson.sandboxUrl}
                                    className="w-full h-[600px] border-0 rounded-md overflow-hidden shadow-lg"
                                    title="Coding Sandbox"
                                    allow="accelerometer; ambient-light-sensor; camera; encrypted-media; geolocation; gyroscope; hid; microphone; midi; payment; usb; vr; xr-spatial-tracking"
                                    sandbox="allow-forms allow-modals allow-popups allow-presentation allow-same-origin allow-scripts"
                                ></iframe>
                            </div>
                        )}

                        {/* --- Quiz --- */}
                        {quizAttempt ? (
                            <QuizResult attempt={quizAttempt} quiz={selectedLesson.quiz!} />
                        ) : selectedLesson.quiz ? (
                            <QuizTaker
                                quiz={selectedLesson.quiz}
                                courseId={courseId}
                                moduleId={currentModuleId!}
                                lessonId={selectedLesson.id}
                                onQuizCompleted={fetchData}
                            />
                        ) : null}

                        {/* --- Mark Complete Button --- */}
                        <div className="mt-12 pt-8 border-t">
                            <button
                                onClick={handleMarkComplete}
                                disabled={isCurrentLessonComplete}
                                className={`w-full px-6 py-3 font-bold text-white rounded-lg ${
                                    isCurrentLessonComplete
                                        ? 'bg-green-600 cursor-default'
                                        : 'bg-indigo-600 hover:bg-indigo-700'
                                }`}
                            >
                                {isCurrentLessonComplete ? '✓ Completed' : 'Mark as Complete'}
                            </button>
                        </div>

                        {/* --- Q&A Section --- */}
                        <QandASection
                            lesson={selectedLesson}
                            courseId={courseId}
                            moduleId={currentModuleId!}
                        />
                    </article>
                ) : modules.length > 0 ? (
                    <p>Select a lesson from the outline to begin.</p>
                ) : (
                    <p>The instructor has not added any content to this course yet.</p>
                )}
            </main>
        </div>
    );
}
