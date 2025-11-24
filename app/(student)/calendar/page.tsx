// app/(student)/calendar/page.tsx
'use client';

import { useEffect, useState } from 'react';
import {
  collectionGroup,
  getDocs,
  query,
  where,
  Timestamp,
  doc,
  DocumentData,
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

// NOTE: This array MUST match the hex codes/order in the Educator Manage page to ensure consistency.
const COLOR_MAP = [
  { hex: '#6366F1' }, // Indigo
  { hex: '#10B981' }, // Emerald
  { hex: '#8B5CF6' }, // Violet
  { hex: '#F59E0B' }, // Amber
  { hex: '#EC4899' }, // Pink
  { hex: '#06B6D4' }, // Cyan
  { hex: '#EF4444' }, // Red
];

// Generates a consistent color object based on a string ID
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

interface EnrolledCourseInfo {
  id: string;
  title: string;
}

/* ---------------------------- Main Component --------------------------- */
export default function CalendarPage() {
  const { user, loading: authLoading } = useAuth();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);

  // ✅ NEW STATE: Controlled props for the Calendar component
  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentView, setCurrentView] = useState<'month' | 'week' | 'day' | 'agenda'>('month');


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

        // Map the enrollment documents to get both the courseId and the courseTitle
        const enrolledCourses: EnrolledCourseInfo[] = await Promise.all(
          enrolledCoursesSnapshot.docs.map(async (docRef) => {
            // Get the reference to the parent 'courses/{courseId}' document
            const courseRef = docRef.ref.parent.parent!;
            const courseId = courseRef.id;
            
            // Fetch the course title
            const courseSnap = await getDoc(courseRef);
            
            const courseTitle = courseSnap.data()?.title || 'Unknown Course';
            return { id: courseId, title: courseTitle };
          })
        );
        
        const courseIds = enrolledCourses.map(c => c.id);
        const courseMap = enrolledCourses.reduce((map, course) => {
            map.set(course.id, course.title);
            return map;
        }, new Map<string, string>());


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
            const courseId = quizData.courseId;
            const courseTitle = courseMap.get(courseId) || 'Course';
            
            // Handle Firebase Timestamp conversion
            let dueDate: Date;
            if (quizData.dueDate instanceof Timestamp) {
                dueDate = quizData.dueDate.toDate();
            } else if (quizData.dueDate?.seconds) {
              // Fallback for objects that look like Timestamps
                dueDate = new Date(quizData.dueDate.seconds * 1000);
            } else {
                dueDate = new Date(quizData.dueDate);
            }

            return {
              title: `${courseTitle}: ${quizData.title || 'Quiz'} Due`,
              start: dueDate,
              end: dueDate,
              allDay: true,
              resource: { courseId, courseTitle },
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

  /**
   * react-big-calendar prop to apply custom styling to events
   */
  const eventPropGetter: EventPropGetter<CalendarEvent> = (event) => {
    // Get the color object and specifically use the 'hex' property
    const color = getColorForId(event.resource.courseId).hex; 
    
    return {
      style: {
        backgroundColor: color,
        opacity: 0.9,
        color: 'white',
        border: '0px',
        fontWeight: 'bold',
      },
    };
  };

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
          eventPropGetter={eventPropGetter} 
          
          // ✅ CONTROL PROPS ADDED FOR NAVIGATION AND VIEW SWITCHING
          view={currentView}
          date={currentDate}
          onView={(view: any) => setCurrentView(view)}
          onNavigate={(newDate) => setCurrentDate(newDate)}
        />
      </div>
    </div>
  );
}