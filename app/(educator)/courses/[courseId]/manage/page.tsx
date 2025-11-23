// app/(educator)/courses/[courseId]/manage/page.tsx
'use client';
import { useEffect, useState } from 'react';
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
  deleteDoc,
  writeBatch,
  where, // ✅ NEW import: where
} from 'firebase/firestore';
import { db } from '@/firebase/config';
import { useParams } from 'next/navigation';
import AddContentModal from '@/components/AddContentModal';
import VideoUploader from '@/components/VideoUploader';
import React from 'react';
import Link from 'next/link';

// ✅ NEW import: RichTextEditor
import RichTextEditor from '@/components/RichTextEditor'; 

/* ------------------------------- Types -------------------------------- */
interface QandA {
  id: string;
  questionText: string;
  answerText?: string;
  studentEmail?: string;
  askedAt?: any;
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
  dueDate?: any;
  createdAt?: any;
}

interface Lesson {
  id: string;
  title: string;
  content: string; // Now stores HTML from RichTextEditor
  qanda?: QandA[];
  quiz?: Quiz | null;
  sandboxUrl?: string;
  videoUrl?: string;
  createdAt?: any;
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

/* ---------------------------- AddLessonForm (UPDATED) ----------------------------- */
const AddLessonForm = ({
  moduleId,
  courseId,
  onLessonAdded,
}: {
  moduleId: string;
  courseId: string;
  onLessonAdded: () => void;
}) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState(''); // This will now store HTML
  const [sandboxUrl, setSandboxUrl] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [isVideoUploading, setIsVideoUploading] = useState(false);
  const [error, setError] = useState('');
  // NOTE: AddContentModal is no longer needed since RichTextEditor handles content creation/upload,
  // so `isModalOpen` state is removed.

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!title.trim()) {
      setError('A lesson title is required.');
      return;
    }
    if (isVideoUploading) {
      setError('Please wait for the video to finish uploading.');
      return;
    }

    try {
      const lessonsRef = collection(db, 'courses', courseId, 'modules', moduleId, 'lessons');
      const newLessonRef = await addDoc(lessonsRef, {
        title: title.trim(),
        content: content, // Save the HTML content directly
        sandboxUrl: sandboxUrl.trim() || null,
        videoUrl: videoUrl || null,
        createdAt: serverTimestamp(),
      });

      const moduleRef = doc(db, 'courses', courseId, 'modules', moduleId);
      await updateDoc(moduleRef, { lessons: arrayUnion(newLessonRef.id) });

      setTitle('');
      setContent('');
      setSandboxUrl('');
      setVideoUrl('');
      onLessonAdded();
    } catch (err) {
      console.error(err);
      setError('Failed to add lesson.');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="my-4 p-4 bg-gray-50 border-2 border-dashed rounded-md space-y-4">
      <h4 className="font-semibold mb-2 text-gray-700">Add a New Lesson to this Module</h4>
      <input
        type="text"
        placeholder="Lesson Title*"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="w-full p-2 border rounded-md"
        required
      />

      {/* --- REPLACEMENT FOR TEXTAREA AND AddContentModal BUTTON --- */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Lesson Content</label>
        <RichTextEditor
          content={content}
          onUpdate={setContent}
        />
      </div>
      {/* ----------------------------------------------------------- */}

      {/* VideoUploader Component */}
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
        <label className="block text-sm font-medium text-gray-700">Interactive Sandbox URL (Optional)</label>
        <input
          type="url"
          placeholder="https://stackblitz.com/..."
          value={sandboxUrl}
          onChange={(e) => setSandboxUrl(e.target.value)}
          className="w-full p-2 mt-1 border rounded-md"
        />
      </div>

      {error && <p className="text-red-500 text-sm mt-2">{error}</p>}

      <div className="flex justify-end items-center mt-4">
        {/* Removed "Upload Image/File" button as RichTextEditor handles this internally */}
        <button
          type="submit"
          disabled={isVideoUploading}
          className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-gray-400"
        >
          {isVideoUploading ? 'Uploading Video...' : 'Save Lesson'}
        </button>
      </div>
    </form>
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
      const qRef = doc(
        db,
        'courses',
        courseId,
        'modules',
        moduleId,
        'lessons',
        lessonId,
        'qanda',
        question.id
      );
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

/* ---------------------------- AddQuizForm (updated with dueDate) ------------------------------ */
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
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [questions, setQuestions] = useState<Question[]>([
    { questionText: '', options: ['', '', '', ''], correctAnswerIndex: 0 },
  ]);
  const [error, setError] = useState('');

  const handleQuestionChange = (
    index: number,
    field: keyof Question,
    value: any
  ) => {
    const updated = [...questions];
    (updated[index] as any)[field] = value;
    setQuestions(updated);
  };

  const addQuestion = () => {
    setQuestions([
      ...questions,
      { questionText: '', options: ['', '', '', ''], correctAnswerIndex: 0 },
    ]);
  };

  // -------------------- UPDATED handleSubmit --------------------
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !dueDate) {
      setError('Please provide a title and a due date for the quiz.');
      return;
    }
    setError('');
    try {
      // 1) create a new quiz doc under quizzes collection
      const quizzesCollectionRef = collection(
        db,
        'courses',
        courseId,
        'modules',
        moduleId,
        'lessons',
        lesson.id,
        'quizzes'
      );
      const newQuizRef = await addDoc(quizzesCollectionRef, {
        createdAt: serverTimestamp(),
      });

      // 2) inside that quiz doc, create quiz-data collection, document 'main'
      const quizDataCollectionRef = collection(newQuizRef, 'quiz-data');
      const mainQuizDataRef = doc(quizDataCollectionRef, 'main');
      await setDoc(mainQuizDataRef, {
        title,
        questions,
        dueDate: new Date(dueDate),
        courseId,
        createdAt: serverTimestamp(),
      });

      console.log('✅ Quiz created at path:', mainQuizDataRef.path);
      onQuizAdded();
    } catch (err) {
      console.error('❌ Failed to create quiz:', err);
      setError('Failed to save quiz.');
    }
  };
  // ----------------------------------------------------------------

  return (
    <div className="my-4 p-4 bg-blue-50 border-2 border-dashed border-blue-300 rounded-md">
      <h4 className="font-semibold mb-4 text-blue-800">
        Add a Quiz to this Lesson
      </h4>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Quiz Title
            </label>
            <input
              type="text"
              placeholder="Quiz Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full p-2 mt-1 border rounded-md font-bold"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Due Date
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full p-2 mt-1 border rounded-md"
            />
          </div>
        </div>
        {questions.map((q, index) => (
          <div key={index} className="p-3 border rounded bg-white">
            <input
              type="text"
              placeholder="Question text"
              value={q.questionText}
              onChange={(e) =>
                handleQuestionChange(index, 'questionText', e.target.value)
              }
              className="w-full p-2 border rounded mb-2"
            />
            {q.options.map((opt, i) => (
              <div key={i} className="flex items-center gap-2 mb-1">
                <input
                  type="radio"
                  name={`correct-${index}`}
                  checked={q.correctAnswerIndex === i}
                  onChange={() =>
                    handleQuestionChange(index, 'correctAnswerIndex', i)
                  }
                />
                <input
                  type="text"
                  placeholder={`Option ${i + 1}`}
                  value={opt}
                  onChange={(e) => {
                    const newOptions = [...q.options];
                    newOptions[i] = e.target.value;
                    handleQuestionChange(index, 'options', newOptions);
                  }}
                  className="flex-1 p-2 border rounded"
                />
              </div>
            ))}
          </div>
        ))}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={addQuestion}
            className="px-3 py-1 text-xs bg-indigo-100 rounded"
          >
            Add Question
          </button>
          <button
            type="submit"
            className="px-3 py-1 text-xs bg-blue-600 text-white rounded"
          >
            Save Quiz
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-3 py-1 text-xs bg-gray-300 rounded"
          >
            Cancel
          </button>
        </div>
        {error && <p className="text-red-500 text-sm">{error}</p>}
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
  const [addingLessonToModuleId, setAddingLessonToModuleId] =
    useState<string | null>(null);
  const [addingQuizToLessonId, setAddingQuizToLessonId] =
    useState<string | null>(null);
  // ✅ NEW STATE: from previous snippet
  const [pendingEnrollmentCount, setPendingEnrollmentCount] = useState(0); 

  const deleteCourseAndCollections = async () => {
    if (!courseId) return;
    if (
      !window.confirm(
        'ARE YOU ABSOLUTELY SURE? Deleting this course will permanently remove all modules, lessons, quizzes, Q&A, and enrollments.'
      )
    ) {
      return;
    }
    setLoading(true);
    try {
      const batch = writeBatch(db);
      const courseRef = doc(db, 'courses', courseId);
      const modulesSnapshot = await getDocs(collection(courseRef, 'modules'));

      for (const moduleDoc of modulesSnapshot.docs) {
        const moduleRef = doc(courseRef, 'modules', moduleDoc.id);
        const lessonsSnapshot = await getDocs(collection(moduleRef, 'lessons'));

        for (const lessonDoc of lessonsSnapshot.docs) {
          const lessonRef = doc(moduleRef, 'lessons', lessonDoc.id);

          // delete qanda docs
          const qandaSnapshot = await getDocs(collection(lessonRef, 'qanda'));
          qandaSnapshot.docs.forEach((qDoc) =>
            batch.delete(doc(lessonRef, 'qanda', qDoc.id))
          );

          // delete quizzes and nested quiz-data docs
          const quizzesSnapshot = await getDocs(
            collection(lessonRef, 'quizzes')
          );
          for (const quizDoc of quizzesSnapshot.docs) {
            // delete any docs inside quizzes/{quizId}/quiz-data
            const quizDataSnapshot = await getDocs(
              collection(quizDoc.ref, 'quiz-data')
            );
            quizDataSnapshot.docs.forEach((qd) =>
              batch.delete(doc(quizDoc.ref, 'quiz-data', qd.id))
            );
            // delete the quiz document itself
            batch.delete(doc(lessonRef, 'quizzes', quizDoc.id));
          }

          // delete lesson doc
          batch.delete(lessonRef);
        }

        // delete module doc
        batch.delete(moduleRef);
      }
      
      // Delete enrollment requests
      const enrollmentRequestsSnapshot = await getDocs(
        collection(courseRef, 'enrollmentRequests')
      );
      enrollmentRequestsSnapshot.docs.forEach((eDoc) =>
        batch.delete(doc(courseRef, 'enrollmentRequests', eDoc.id))
      );
      
      // delete course doc
      batch.delete(courseRef);
      await batch.commit();

      alert(
        `Course "${course?.title || 'Untitled'}" deleted successfully.`
      );
      window.location.href = '/educator/courses/my-courses';
    } catch (err) {
      console.error('Critical Deletion Error:', err);
      setError('Failed to delete the course.');
    } finally {
      setLoading(false);
    }
  };

  const fetchData = async () => {
    if (!courseId) return;
    setLoading(true);
    try {
      const courseDocRef = doc(db, 'courses', courseId);
      const courseSnap = await getDoc(courseDocRef);
      if (courseSnap.exists()) setCourse(courseSnap.data() as { title: string });

      // Fetch Modules and Lessons
      const modulesSnapshot = await getDocs(
        query(
          collection(db, 'courses', courseId, 'modules'),
          orderBy('createdAt')
        )
      );

      const modulesList: Module[] = await Promise.all(
        modulesSnapshot.docs.map(async (moduleDoc) => {
          const moduleData = moduleDoc.data() as Omit<Module, 'id' | 'lessons'>;

          const lessonsSnapshot = await getDocs(
            query(
              collection(
                db,
                'courses',
                courseId,
                'modules',
                moduleDoc.id,
                'lessons'
              ),
              orderBy('createdAt')
            )
          );

          const lessonsList: Lesson[] = await Promise.all(
            lessonsSnapshot.docs.map(async (lessonDoc) => {
              const lessonData = lessonDoc.data() as Omit<
                Lesson,
                'id' | 'qanda' | 'quiz'
              >;

              // q&a
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

              // ---- NEW: fetch quizzes collection and look for quiz-data/main documents ----
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
                // quizDoc.ref points to the quiz document (e.g. quizzes/{quizId})
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

          return {
            id: moduleDoc.id,
            ...moduleData,
            lessons: lessonsList,
          } as Module;
        })
      );

      setModules(modulesList);
      setError(null);
      
      // ✅ NEW: Fetch pending enrollment count
      const enrollmentRequestsQuery = query(
        collection(db, 'courses', courseId, 'enrollmentRequests'),
        where('status', '==', 'pending')
      );
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

  if (loading) return <p>Loading Course Manager...</p>;
  if (error) return <div className="text-red-600">Error: {error}</div>;

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-sm text-gray-500">Managing Course</h1>
          <h2 className="text-3xl font-bold">
            {course?.title || 'Untitled Course'}
          </h2>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/courses/${courseId}/enrollments`}
            className="px-4 py-2 text-sm font-semibold text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-md relative"
          >
            Enrollments
            {/* Display pending enrollment count */}
            {pendingEnrollmentCount > 0 && (
              <span className="absolute -top-1 -right-1 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-red-100 bg-red-600 rounded-full">
                {pendingEnrollmentCount}
              </span>
            )}
          </Link>
          <Link
            href={`/courses/${courseId}/analytics`}
            className="px-4 py-2 text-sm font-semibold text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-md"
          >
            Analytics
          </Link>
          <button
            onClick={deleteCourseAndCollections}
            className="px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-md"
          >
            Delete Course
          </button>
        </div>
      </div>

      {/* MODULE CREATION */}
      <form
        onSubmit={handleAddModule}
        className="flex items-center gap-2 mb-6"
      >
        <input
          type="text"
          placeholder="New Module Title"
          value={newModuleTitle}
          onChange={(e) => setNewModuleTitle(e.target.value)}
          className="flex-grow p-2 border rounded-md"
        />
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Add Module
        </button>
      </form>

      {/* MODULES DISPLAY */}
      <div className="space-y-10">
        {modules.length === 0 && (
          <p className="text-gray-500 italic">
            No modules yet. Add one above to begin.
          </p>
        )}
        {modules.map((module) => (
          <div
            key={module.id}
            className="p-6 bg-white border rounded-lg shadow-sm"
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-2xl font-bold">{module.title}</h3>
              <button
                onClick={() =>
                  setAddingLessonToModuleId(
                    addingLessonToModuleId === module.id ? null : module.id
                  )
                }
                className="px-3 py-1 text-sm font-semibold bg-indigo-100 text-indigo-700 rounded hover:bg-indigo-200"
              >
                {addingLessonToModuleId === module.id ? 'Cancel' : 'Add Lesson'}
              </button>
            </div>

            {/* ADD LESSON FORM */}
            {addingLessonToModuleId === module.id && (
              <AddLessonForm
                moduleId={module.id}
                courseId={courseId}
                onLessonAdded={fetchData}
              />
            )}

            {/* LESSONS DISPLAY */}
            {module.lessons.length === 0 ? (
              <p className="text-gray-500 italic">
                No lessons in this module.
              </p>
            ) : (
              <div className="space-y-6">
                {module.lessons.map((lesson) => (
                  <div
                    key={lesson.id}
                    className="p-4 border-l-4 border-indigo-400 bg-gray-50 rounded"
                  >
                    <div className="flex justify-between items-center">
                      <h4 className="font-semibold text-lg">{lesson.title}</h4>
                      <button
                        onClick={() =>
                          setAddingQuizToLessonId(
                            addingQuizToLessonId === lesson.id
                              ? null
                              : lesson.id
                          )
                        }
                        className="text-sm px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                      >
                        {addingQuizToLessonId === lesson.id
                          ? 'Cancel'
                          : lesson.quiz
                          ? 'Edit Quiz'
                          : 'Add Quiz'}
                      </button>
                    </div>
                    {/* Lesson Content is now rendered as HTML, but here it's still being outputted as text.
                    To correctly render HTML from the RichTextEditor, you would typically use dangerouslySetInnerHTML
                    in a separate component used for displaying the lesson content. Since this is the *management* page, 
                    we'll keep it as text for now, but in a student-facing view, this would need updating. */}
                    <p className="text-gray-700 mt-2 whitespace-pre-line">
                      {' '}
                      {lesson.content}{' '}
                    </p>

                    {/* Sandbox Embed */}
                    {lesson.sandboxUrl && (
                      <div className="mt-4">
                        <iframe
                          src={lesson.sandboxUrl}
                          title="Sandbox"
                          className="w-full h-96 rounded-md border"
                          allow="accelerometer; camera; microphone; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        ></iframe>
                      </div>
                    )}

                    {/* QUIZ SECTION */}
                    {addingQuizToLessonId === lesson.id ? (
                      <AddQuizForm
                        lesson={lesson}
                        courseId={courseId}
                        moduleId={module.id}
                        onQuizAdded={fetchData}
                        onCancel={() => setAddingQuizToLessonId(null)}
                      />
                    ) : (
                      lesson.quiz && (
                        <div className="mt-4 p-3 border rounded bg-blue-50">
                          <h5 className="font-semibold text-blue-800">
                            {' '}
                            Quiz: {lesson.quiz.title}{' '}
                          </h5>
                          {lesson.quiz.dueDate && (
                            <p
                              className={`inline-block px-2 py-1 rounded text-xs font-semibold ${getColorForId(
                                courseId
                              ).classes} border`}
                            >
                              Due:{' '}
                              {new Date(
                                (lesson.quiz.dueDate as any).seconds
                                  ? lesson.quiz.dueDate.seconds * 1000
                                  : lesson.quiz.dueDate
                              ).toLocaleDateString()}
                            </p>
                          )}
                          <p className="text-sm mt-1 text-gray-700">
                            {' '}
                            {lesson.quiz.questions.length} question{' '}
                            {lesson.quiz.questions.length !== 1 && 's'}{' '}
                          </p>
                        </div>
                      )
                    )}

                    {/* Q&A SECTION */}
                    <div className="mt-4">
                      <h5 className="font-semibold text-gray-800 mb-2">
                        {' '}
                        Questions & Answers{' '}
                      </h5>
                      {lesson.qanda && lesson.qanda.length > 0 ? (
                        <div className="space-y-3">
                          {lesson.qanda.map((q) => (
                            <div
                              key={q.id}
                              className="p-3 border rounded bg-white shadow-sm"
                            >
                              <p className="font-medium text-gray-800">
                                {' '}
                                Q: {q.questionText}{' '}
                              </p>
                              <p className="text-sm text-gray-500 italic">
                                {' '}
                                {q.studentEmail
                                  ? `by ${q.studentEmail}`
                                  : 'Anonymous'}{' '}
                              </p>
                              {q.answerText ? (
                                <p className="mt-2 text-gray-700">
                                  {' '}
                                  <span className="font-semibold text-green-700">
                                    {' '}
                                    A:{' '}
                                  </span>{' '}
                                  {q.answerText}{' '}
                                </p>
                              ) : (
                                <AnswerQuestionForm
                                  question={q}
                                  courseId={courseId}
                                  moduleId={module.id}
                                  lessonId={lesson.id}
                                  onAnswered={fetchData}
                                />
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-gray-500 text-sm italic">
                          {' '}
                          No questions yet.{' '}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}