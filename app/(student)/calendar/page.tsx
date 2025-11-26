// app/(student)/calendar/page.tsx
'use client';

import { useEffect, useState } from 'react';
import {
  collectionGroup,
  getDocs,
  query,
  Timestamp,
  doc,
  getDoc,
} from 'firebase/firestore';
import { db } from '@/firebase/config';
import useAuth from '@/hooks/useAuth';

// --- Calendar imports ---
import { Calendar, dateFnsLocalizer, EventPropGetter } from 'react-big-calendar';
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

/* ---------------------------- Utility: Course Coloring ----------------------------- */
const COLOR_MAP = [
  { hex: '#6366F1' }, // Indigo
  { hex: '#10B981' }, // Emerald
  { hex: '#8B5CF6' }, // Violet
  { hex: '#F59E0B' }, // Amber
  { hex: '#EC4899' }, // Pink
  { hex: '#06B6D4' }, // Cyan
  { hex: '#EF4444' }, // Red
];

const getColorForId = (id: string): (typeof COLOR_MAP)[number] => {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % COLOR_MAP.length;
  return COLOR_MAP[index];
};

/* ------------------------------- Types -------------------------------- */
interface CalendarEvent {
  title: string;
  start: Date;
  end: Date;
  allDay: boolean;
  resource: { courseId: string; courseTitle: string };
}

/* ---------------------------- Main Component --------------------------- */
export default function CalendarPage() {
  const { user, loading: authLoading } = useAuth();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentView, setCurrentView] = useState<'month' | 'week' | 'day' | 'agenda'>('month');

  useEffect(() => {
    if (authLoading || !user) return;

    const fetchQuizEvents = async () => {
      try {
        // 1️⃣ FIX: Fetch Enrolled Courses from User Profile (Instead of Collection Group)
        // This avoids the "Missing Permissions" error on the enrollmentRequests query
        const userDocRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userDocRef);
        
        if (!userSnap.exists()) {
            console.warn('User profile not found');
            setLoading(false);
            return;
        }

        const userData = userSnap.data();
        const enrolledCourseIds: string[] = userData.enrolledCourses || [];

        if (enrolledCourseIds.length === 0) {
          setLoading(false);
          return;
        }

        // 2️⃣ Fetch Course Titles for the enrolled IDs
        // We map the IDs to a Map object for easy lookup: ID -> Title
        const courseMap = new Map<string, string>();
        
        await Promise.all(
            enrolledCourseIds.map(async (courseId) => {
                try {
                    const courseSnap = await getDoc(doc(db, 'courses', courseId));
                    if (courseSnap.exists()) {
                        courseMap.set(courseId, courseSnap.data().title);
                    }
                } catch (e) {
                    console.error(`Could not fetch course title for ${courseId}`, e);
                }
            })
        );

        // 3️⃣ Fetch all quiz-data documents globally
        // Your rules allow "allow read: if isSignedIn()" for quiz-data, so this is safe.
        const quizzesSnapshot = await getDocs(collectionGroup(db, 'quiz-data'));

        // 4️⃣ Filter and prepare events
        // We only keep quizzes belonging to courses the student is enrolled in
        const quizEvents: CalendarEvent[] = quizzesSnapshot.docs
          .filter((quizDoc) => {
            const quizData = quizDoc.data();
            return (
              quizData.courseId &&
              enrolledCourseIds.includes(quizData.courseId) && // Filter by enrolled list
              quizData.dueDate
            );
          })
          .map((quizDoc) => {
            const quizData = quizDoc.data();
            const courseId = quizData.courseId;
            const courseTitle = courseMap.get(courseId) || 'Course';
            
            // Handle Firebase Timestamp conversion
            let dueDate: Date;
            if (quizData.dueDate instanceof Timestamp) {
                dueDate = quizData.dueDate.toDate();
            } else if (quizData.dueDate?.seconds) {
                dueDate = new Date(quizData.dueDate.seconds * 1000);
            } else {
                dueDate = new Date(quizData.dueDate);
            }

            return {
              title: `${courseTitle}: ${quizData.title || 'Quiz'}`,
              start: dueDate,
              end: dueDate,
              allDay: true,
              resource: { courseId, courseTitle },
            };
          });

        setEvents(quizEvents);
      } catch (error) {
        console.error('❌ Failed to fetch calendar events:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchQuizEvents();
  }, [user, authLoading]);

  const eventPropGetter: EventPropGetter<CalendarEvent> = (event) => {
    const color = getColorForId(event.resource.courseId).hex; 
    return {
      style: {
        backgroundColor: color,
        opacity: 0.9,
        color: 'white',
        border: '0px',
        fontWeight: 'bold',
        fontSize: '0.85rem',
        borderRadius: '6px',
      },
    };
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Loading calendar...</div>;

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6 text-gray-800">My Calendar</h1>
      <div className="h-[75vh] bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <Calendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          style={{ height: '100%' }}
          eventPropGetter={eventPropGetter} 
          view={currentView}
          date={currentDate}
          onView={(view: any) => setCurrentView(view)}
          onNavigate={(newDate) => setCurrentDate(newDate)}
          popup // Allows seeing more events in a popup if a day is crowded
        />
      </div>
    </div>
  );
}