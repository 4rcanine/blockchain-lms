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
} from 'firebase/firestore';
import { db } from '@/firebase/config';
import { useParams } from 'next/navigation';
import AddContentModal from '@/components/AddContentModal';
import React from 'react';
import Link from 'next/link';

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
}
interface Lesson {
  id: string;
  title: string;
  content: string;
  qanda?: QandA[];
  quiz?: Quiz;
  sandboxUrl?: string;
  createdAt?: any;
}
interface Module {
  id: string;
  title: string;
  lessons: Lesson[];
}

/* ---------------------------- AddLessonForm ----------------------------- */
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
  const [content, setContent] = useState('');
  const [sandboxUrl, setSandboxUrl] = useState('');
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!title.trim()) {
      setError('A lesson title is required.');
      return;
    }
    try {
      const lessonsRef = collection(
        db,
        'courses',
        courseId,
        'modules',
        moduleId,
        'lessons'
      );
      await addDoc(lessonsRef, {
        title: title.trim(),
        content,
        sandboxUrl: sandboxUrl.trim() || null,
        createdAt: serverTimestamp(),
      });
      setTitle('');
      setContent('');
      setSandboxUrl('');
      onLessonAdded();
    } catch (err) {
      console.error(err);
      setError('Failed to add lesson.');
    }
  };

  return (
    <>
      {isModalOpen && (
        <AddContentModal
          onClose={() => setIsModalOpen(false)}
          onContentAdded={(markdown) => {
            setContent((prev) => `${prev}\n${markdown}`);
          }}
        />
      )}

      <form onSubmit={handleSubmit} className="my-4 p-4 bg-gray-50 border-2 border-dashed rounded-md">
        <h4 className="font-semibold mb-2 text-gray-700">Add a New Lesson</h4>
        <input
          type="text"
          placeholder="Lesson Title*"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full p-2 mb-2 border rounded-md"
          required
        />
        <textarea
          placeholder="Lesson Content (markdown supported)"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={6}
          className="w-full p-2 border rounded-md"
        />
        <div className="mt-3">
          <label className="block text-sm font-medium text-gray-700">Interactive Sandbox URL (Optional)</label>
          <input
            type="url"
            placeholder="https://replit.com/..."
            value={sandboxUrl}
            onChange={(e) => setSandboxUrl(e.target.value)}
            className="w-full p-2 mt-1 border rounded-md"
          />
          <p className="text-xs text-gray-500 mt-1">Example: Replit embed or other sandbox share URL.</p>
        </div>

        {error && <p className="text-red-500 text-sm mt-2">{error}</p>}

        <div className="flex justify-between items-center mt-4">
          <button type="button" onClick={() => setIsModalOpen(true)} className="px-4 py-2 text-sm font-semibold text-indigo-600 bg-indigo-100 rounded-md hover:bg-indigo-200">
            Upload Image/File
          </button>
          <button type="submit" className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700">
            Save Lesson
          </button>
        </div>
      </form>
    </>
  );
};

/* ------------------------- AnswerQuestionForm -------------------------- */
/* This component returns JSX and updates the qanda item's answerText */
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
      await updateDoc(qRef, { answerText: answer.trim(), answeredAt: serverTimestamp() });
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
        <button type="submit" disabled={saving} className="px-3 py-1 text-xs bg-green-600 text-white rounded">
          {saving ? 'Saving...' : 'Submit Answer'}
        </button>
      </div>
    </form>
  );
};

/* ---------------------------- AddQuizForm ------------------------------ */
/* Provides a simple UI to add quiz title, questions, options, and mark correct option */
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
  const [questions, setQuestions] = useState<Question[]>([]);
  const [newQuestionText, setNewQuestionText] = useState('');
  const [newOptions, setNewOptions] = useState<string[]>(['', '']);
  const [newCorrectIndex, setNewCorrectIndex] = useState<number>(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const addQuestionToList = () => {
    setError('');
    if (!newQuestionText.trim()) {
      setError('Question text is required.');
      return;
    }
    const filteredOptions = newOptions.map((o) => o.trim()).filter(Boolean);
    if (filteredOptions.length < 2) {
      setError('At least two options are required.');
      return;
    }
    if (newCorrectIndex < 0 || newCorrectIndex >= filteredOptions.length) {
      setError('Select a valid correct option.');
      return;
    }
    setQuestions((prev) => [
      ...prev,
      {
        questionText: newQuestionText.trim(),
        options: filteredOptions,
        correctAnswerIndex: newCorrectIndex,
      },
    ]);
    // reset
    setNewQuestionText('');
    setNewOptions(['', '']);
    setNewCorrectIndex(0);
  };

  const handleSaveQuiz = async () => {
    setError('');
    if (!title.trim()) {
      setError('Quiz title is required.');
      return;
    }
    if (questions.length === 0) {
      setError('Add at least one question.');
      return;
    }
    setSaving(true);
    try {
      const quizRef = doc(
        db,
        'courses',
        courseId,
        'modules',
        moduleId,
        'lessons',
        lesson.id,
        'quizzes',
        'quiz-data'
      );
      const quizData = { title: title.trim(), questions };
      await setDoc(quizRef, quizData);
      onQuizAdded();
    } catch (err) {
      console.error(err);
      setError('Failed to save quiz.');
    } finally {
      setSaving(false);
    }
  };

  const updateOption = (idx: number, value: string) => {
    setNewOptions((prev) => prev.map((o, i) => (i === idx ? value : o)));
  };

  const addOptionField = () => setNewOptions((prev) => [...prev, '']);
  const removeOptionField = (idx: number) => setNewOptions((prev) => prev.filter((_, i) => i !== idx));

  return (
    <div className="p-4 mt-4 bg-gray-100 rounded-md">
      <h3 className="font-semibold mb-2">Create Quiz for: {lesson.title}</h3>

      <input
        type="text"
        placeholder="Quiz Title"
        className="w-full p-2 border rounded mb-2"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />

      <div className="mb-3">
        <h4 className="font-medium">Add a Question</h4>
        <textarea
          placeholder="Question text"
          className="w-full p-2 border rounded mb-2"
          value={newQuestionText}
          onChange={(e) => setNewQuestionText(e.target.value)}
          rows={3}
        />
        <div className="space-y-2">
          <p className="text-sm font-medium">Options</p>
          {newOptions.map((opt, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <input
                type="radio"
                name="correctOption"
                checked={newCorrectIndex === idx}
                onChange={() => setNewCorrectIndex(idx)}
              />
              <input
                type="text"
                placeholder={`Option ${idx + 1}`}
                className="flex-1 p-2 border rounded"
                value={opt}
                onChange={(e) => updateOption(idx, e.target.value)}
              />
              {newOptions.length > 2 && (
                <button type="button" onClick={() => removeOptionField(idx)} className="text-xs px-2 py-1 bg-red-200 rounded">
                  Remove
                </button>
              )}
            </div>
          ))}
          <div className="mt-2">
            <button type="button" onClick={addOptionField} className="text-xs px-2 py-1 bg-indigo-100 rounded mr-2">Add Option</button>
            <button type="button" onClick={addQuestionToList} className="text-xs px-2 py-1 bg-green-600 text-white rounded">
              Add Question to Quiz
            </button>
          </div>
        </div>
      </div>

      {questions.length > 0 && (
        <div className="mb-3">
          <h4 className="font-medium">Questions in Quiz</h4>
          <ul className="space-y-2">
            {questions.map((q, i) => (
              <li key={i} className="p-2 bg-white rounded border">
                <p className="font-semibold">{i + 1}. {q.questionText}</p>
                <ol className="list-decimal ml-6">
                  {q.options.map((o, oi) => (
                    <li key={oi} className={q.correctAnswerIndex === oi ? 'font-bold' : ''}>{o}</li>
                  ))}
                </ol>
              </li>
            ))}
          </ul>
        </div>
      )}

      {error && <p className="text-red-600 text-sm mb-2">{error}</p>}

      <div className="flex gap-2">
        <button onClick={handleSaveQuiz} disabled={saving} className="px-3 py-1 bg-blue-600 text-white rounded">
          {saving ? 'Saving...' : 'Save Quiz'}
        </button>
        <button onClick={onCancel} className="px-3 py-1 bg-gray-300 rounded">Cancel</button>
      </div>
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
  const [addingLessonToModuleId, setAddingLessonToModuleId] = useState<string | null>(null);
  const [addingQuizToLessonId, setAddingQuizToLessonId] = useState<string | null>(null);

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
              const qandaList = qandaSnapshot.docs.map(qDoc => ({ id: qDoc.id, ...qDoc.data() })) as QandA[];

              const quizDocRef = doc(db, 'courses', courseId, 'modules', moduleDoc.id, 'lessons', lessonDoc.id, 'quizzes', 'quiz-data');
              const quizDocSnap = await getDoc(quizDocRef);
              const quizData = quizDocSnap.exists() ? ({ id: quizDocSnap.id, ...quizDocSnap.data() } as Quiz) : undefined;

              return {
                id: lessonDoc.id,
                ...lessonData,
                qanda: qandaList,
                quiz: quizData,
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
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Failed to load course data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId]);

  const handleAddModule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newModuleTitle.trim() || !courseId) return;
    try {
      await addDoc(collection(db, 'courses', courseId, 'modules'), { title: newModuleTitle.trim(), createdAt: serverTimestamp() });
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
          <h2 className="text-3xl font-bold">{course?.title || 'Untitled Course'}</h2>
        </div>
        <div className="flex gap-2">
          <span className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-md shadow-sm">Content Editor</span>
           <Link href={`/courses/${courseId}/enrollments`} className="px-4 py-2 text-sm font-semibold text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-md">
            Enrollments
           </Link>
          <Link href={`/courses/${courseId}/analytics`} className="px-4 py-2 text-sm font-semibold text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-md">
            Analytics
          </Link>
        </div>
      </div>

      <div className="mb-6 p-4 bg-white shadow rounded">
        <h3 className="text-lg font-semibold mb-2">Create New Module</h3>
        <form onSubmit={handleAddModule} className="flex gap-4">
          <input
            type="text"
            value={newModuleTitle}
            onChange={(e) => setNewModuleTitle(e.target.value)}
            placeholder="e.g., Week 1: Introduction"
            className="flex-1 p-2 border rounded"
          />
          <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded">Add Module</button>
        </form>
      </div>

      {/* Modules List */}
      <div className="space-y-6">
        {modules.length === 0 && <p className="text-sm text-gray-500">No modules yet.</p>}

        {modules.map((mod) => (
          <div key={mod.id} className="p-4 bg-white border rounded shadow-sm">
            <div className="flex justify-between items-center">
              <div>
                <p className="font-bold text-xl">{mod.title}</p>
              </div>
              <div>
                <button
                  onClick={() => setAddingLessonToModuleId(addingLessonToModuleId === mod.id ? null : mod.id)}
                  className="text-sm font-medium text-indigo-600 hover:underline"
                >
                  {addingLessonToModuleId === mod.id ? 'Cancel' : '+ Add Lesson'}
                </button>
              </div>
            </div>

            {addingLessonToModuleId === mod.id && (
              <AddLessonForm moduleId={mod.id} courseId={courseId} onLessonAdded={() => { setAddingLessonToModuleId(null); fetchData(); }} />
            )}

            <div className="mt-4">
              {mod.lessons.length === 0 ? (
                <p className="ml-4 text-sm text-gray-500 italic">No lessons in this module yet.</p>
              ) : (
                mod.lessons.map((lesson) => (
                  <div key={lesson.id} className="ml-4 pl-4 border-l-2 py-3">
                    <div className="flex justify-between items-start gap-4">
                      <div>
                        <h4 className="font-semibold">{lesson.title}</h4>
                        <p className="text-sm text-gray-600 mt-1 line-clamp-3">{lesson.content || '— No content —'}</p>
                        {lesson.sandboxUrl && <p className="text-sm text-purple-600 font-bold mt-2">✓ Interactive Lab Added</p>}
                        {lesson.quiz && <p className="text-sm text-green-600 font-bold mt-1">✓ Quiz: {lesson.quiz.title}</p>}
                      </div>

                      <div className="flex flex-col items-end gap-2">
                        {!lesson.quiz && (
                          <button
                            onClick={() => setAddingQuizToLessonId(addingQuizToLessonId === lesson.id ? null : lesson.id)}
                            className="text-xs font-bold text-blue-600 hover:underline"
                          >
                            {addingQuizToLessonId === lesson.id ? 'Cancel Quiz' : '+ Add Quiz'}
                          </button>
                        )}
                      </div>
                    </div>

                    {addingQuizToLessonId === lesson.id && (
                      <AddQuizForm
                        lesson={lesson}
                        courseId={courseId}
                        moduleId={mod.id}
                        onQuizAdded={() => { setAddingQuizToLessonId(null); fetchData(); }}
                        onCancel={() => setAddingQuizToLessonId(null)}
                      />
                    )}

                    {/* Q&A */}
                    {lesson.qanda && lesson.qanda.length > 0 && (
                      <div className="mt-3 space-y-3">
                        <h5 className="text-sm font-bold text-gray-700">Questions</h5>
                        {lesson.qanda.map((q) => (
                          <div key={q.id} className="p-3 bg-gray-50 rounded-md">
                            <p className="text-sm font-medium">Q: {q.questionText}</p>
                            <p className="text-xs text-gray-500">From: {q.studentEmail || 'student'}</p>
                            {q.answerText ? (
                              <div className="mt-2 p-2 bg-green-50 border-l-4 border-green-400 rounded">
                                <p className="text-sm"><span className="font-bold">A:</span> {q.answerText}</p>
                              </div>
                            ) : (
                              <AnswerQuestionForm question={q} courseId={courseId} moduleId={mod.id} lessonId={lesson.id} onAnswered={fetchData} />
                            )}
                          </div>
                        ))}
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
