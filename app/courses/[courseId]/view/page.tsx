// app/courses/[courseId]/view/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { doc, getDoc, collection, getDocs, query, orderBy, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/firebase/config';
import useAuth from '@/hooks/useAuth';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

// --- Type Definitions ---
interface QandA { id: string; questionText: string; answerText?: string; studentEmail: string; askedAt: any; }
interface Lesson { id: string; title: string; content: string; qanda?: QandA[]; }
interface Module { id: string; title: string; lessons: Lesson[]; }

// --- Q&A Component ---
const QandASection = ({ lesson, courseId, moduleId }: { lesson: Lesson; courseId: string; moduleId: string }) => {
    const { user } = useAuth();
    const [question, setQuestion] = useState('');
    const [qandaList, setQandaList] = useState<QandA[]>(lesson.qanda || []);

    const handleAskQuestion = async (e: React.FormEvent) => {
        e.preventDefault();
        // --- THIS IS THE CORRECTED LINE ---
        if (!question.trim() || !user || !user.email) {
            // We now check for user.email, satisfying TypeScript
            return;
        }

        const qandaRef = collection(db, 'courses', courseId, 'modules', moduleId, 'lessons', lesson.id, 'qanda');
        const newQuestion = {
            questionText: question,
            answerText: '',
            studentId: user.uid,
            studentEmail: user.email, // TypeScript now knows this is a string
            askedAt: serverTimestamp(),
        };
        await addDoc(qandaRef, newQuestion);
        // Optimistically update UI
        setQandaList([...qandaList, { ...newQuestion, id: 'temp', askedAt: new Date() }]);
        setQuestion('');
    };

    return (
        <div className="mt-12 pt-8 border-t">
            <h2 className="text-2xl font-bold mb-6">Questions & Answers</h2>
            <form onSubmit={handleAskQuestion} className="mb-8">
                <textarea value={question} onChange={e => setQuestion(e.target.value)}
                    placeholder="Ask a question about this lesson..." rows={4}
                    className="w-full p-3 border rounded-md" />
                <button type="submit" className="mt-2 px-5 py-2 font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700">Submit Question</button>
            </form>
            <div className="space-y-6">
                {qandaList.map(item => (
                    <div key={item.id}>
                        <p className="font-bold text-gray-800">Q: {item.questionText}</p>
                        <p className="text-sm text-gray-500">Asked by {item.studentEmail}</p>
                        {item.answerText ? (
                            <p className="mt-2 pl-4 border-l-4 border-green-400 text-gray-700 bg-green-50 p-2">
                                <span className="font-bold">A:</span> {item.answerText}
                            </p>
                        ) : (
                            <p className="mt-2 pl-4 text-sm text-gray-500">Awaiting an answer from the instructor...</p>
                        )}
                    </div>
                ))}
                {qandaList.length === 0 && <p className="text-gray-500">No questions have been asked for this lesson yet. Be the first!</p>}
            </div>
        </div>
    );
};

// --- Main Page Component (Course Viewer) ---
export default function CourseViewerPage() {
    // ... The rest of this component remains exactly the same as before ...
  const { user, loading: authLoading } = useAuth();
  const params = useParams();
  const router = useRouter();
  const courseId = params.courseId as string;

  const [modules, setModules] = useState<Module[]>([]);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [currentModuleId, setCurrentModuleId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push(`/login?redirect=/courses/${courseId}/view`); return; }

    const fetchCourseContent = async () => {
      try {
        const userDocRef = doc(db, 'users', user.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (!userDocSnap.exists() || !userDocSnap.data().enrolledCourses?.includes(courseId)) {
          throw new Error("You are not enrolled in this course.");
        }
        
        const modulesSnapshot = await getDocs(query(collection(db, 'courses', courseId, 'modules'), orderBy('createdAt')));
        
        const modulesList: Module[] = await Promise.all(
          modulesSnapshot.docs.map(async (moduleDoc) => {
            const lessonsSnapshot = await getDocs(query(collection(db, 'courses', courseId, 'modules', moduleDoc.id, 'lessons'), orderBy('createdAt')));
            
            const lessonsList: Lesson[] = await Promise.all(lessonsSnapshot.docs.map(async (lessonDoc) => {
                const qandaSnapshot = await getDocs(query(collection(db, 'courses', courseId, 'modules', moduleDoc.id, 'lessons', lessonDoc.id, 'qanda'), orderBy('askedAt')));
                const qandaList = qandaSnapshot.docs.map(qandaDoc => ({ id: qandaDoc.id, ...qandaDoc.data() })) as QandA[];
                return { id: lessonDoc.id, ...lessonDoc.data(), qanda: qandaList } as Lesson;
            }));

            return { id: moduleDoc.id, ...moduleDoc.data(), lessons: lessonsList } as Module;
          })
        );
        
        setModules(modulesList);
        if (modulesList.length > 0 && modulesList[0].lessons.length > 0) {
            handleLessonSelect(modulesList[0].lessons[0], modulesList[0].id);
        }
      } catch (err: any) { setError(err.message); } 
      finally { setLoading(false); }
    };
    fetchCourseContent();
  }, [courseId, user, authLoading, router]);
  
  const handleLessonSelect = (lesson: Lesson, moduleId: string) => {
      setSelectedLesson(lesson);
      setCurrentModuleId(moduleId);
  };

  if (loading) return <p>Loading Course Content...</p>;
  if (error) return (
      <div className="text-center mt-10">
          <p className="text-red-500 mb-4">{error}</p>
          <Link href="/courses" className="text-indigo-600 hover:underline">Return to Course Catalog</Link>
      </div>
  );

  return (
    <div className="flex">
      <style jsx global>{`.h-screen-minus-header { height: calc(100vh - 68px); }`}</style>
      <aside className="w-1/4 h-screen-minus-header p-4 bg-gray-50 border-r overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">Course Outline</h2>
        <nav className="space-y-4">
          {modules.map(module => (
            <div key={module.id}>
              <h3 className="font-semibold text-gray-800 mb-2">{module.title}</h3>
              <ul className="space-y-1">
                {module.lessons.map(lesson => (
                  <li key={lesson.id}>
                    <button onClick={() => handleLessonSelect(lesson, module.id)} className={`w-full text-left p-2 rounded-md text-sm ${selectedLesson?.id === lesson.id ? 'bg-indigo-100 text-indigo-700 font-bold' : 'hover:bg-gray-200'}`}>
                      {lesson.title}
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
            <div className="prose lg:prose-xl whitespace-pre-wrap">{selectedLesson.content}</div>
            <QandASection lesson={selectedLesson} courseId={courseId} moduleId={currentModuleId!} />
          </article>
        ) : ( <p>Select a lesson to begin.</p> )}
      </main>
    </div>
  );
}