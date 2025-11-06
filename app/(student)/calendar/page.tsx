'use client';

import { useEffect, useState } from 'react';
import {
  collectionGroup,
  getDocs,
  query,
  where,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/firebase/config';
import useAuth from '@/hooks/useAuth';

// --- Calendar imports ---
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { enUS } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';

// --- Setup for react-big-calendar ---
const locales = { 'en-US': enUS };
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

interface CalendarEvent {
  title: string;
  start: Date;
  end: Date;
  allDay: boolean;
  resource: { courseId: string };
}

export default function CalendarPage() {
  const { user, loading: authLoading } = useAuth();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading || !user) return;

    const fetchQuizEvents = async () => {
      try {
        console.log('👤 Logged-in user:', user.uid);

        // 1️⃣ Get all enrolled courses for the student
        const enrolledCoursesSnapshot = await getDocs(
          query(
            collectionGroup(db, 'enrollmentRequests'),
            where('status', '==', 'enrolled'),
            where('studentId', '==', user.uid)
          )
        );

        if (enrolledCoursesSnapshot.empty) {
          console.warn('⚠️ No enrolled courses found for student.');
          setLoading(false);
          return;
        }

        const courseIds = enrolledCoursesSnapshot.docs.map(
          (doc) => doc.ref.parent.parent!.id
        );

        console.log('✅ Enrolled course IDs:', courseIds);

        // 2️⃣ Fetch all quiz-data documents globally
        const quizzesSnapshot = await getDocs(collectionGroup(db, 'quiz-data'));
        console.log('🧩 Total quiz-data docs fetched:', quizzesSnapshot.size);

        // 3️⃣ Filter and prepare events for enrolled courses
        const quizEvents: CalendarEvent[] = quizzesSnapshot.docs
          .filter((quizDoc) => {
            const quizData = quizDoc.data();
            return (
              quizData.courseId &&
              courseIds.includes(quizData.courseId) &&
              quizData.dueDate
            );
          })
          .map((quizDoc) => {
            const quizData = quizDoc.data();
            const dueDate = (quizData.dueDate as Timestamp).toDate();
            return {
              title: `${quizData.title || 'Quiz'} Due`,
              start: dueDate,
              end: dueDate,
              allDay: true,
              resource: { courseId: quizData.courseId },
            };
          });

        console.log('✅ Final quizEvents array:', quizEvents);
        setEvents(quizEvents);
      } catch (error) {
        console.error('❌ Failed to fetch calendar events:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchQuizEvents();
  }, [user, authLoading]);

  if (loading) return <p>Loading calendar...</p>;

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">My Calendar</h1>
      <div className="h-[70vh] bg-white p-4 rounded-lg shadow">
        <Calendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          style={{ height: '100%' }}
        />
      </div>
    </div>
  );
}
