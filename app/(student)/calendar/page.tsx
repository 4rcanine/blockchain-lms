// app/(student)/calendar/page.tsx
'use client';

import { useEffect, useState } from 'react';
import {
  collectionGroup,
  getDocs,
  doc,
  getDoc,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/firebase/config';
import useAuth from '@/hooks/useAuth';

import { Calendar, dateFnsLocalizer, EventPropGetter, ToolbarProps, View } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { enUS } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';

import { 
    ChevronLeft, 
    ChevronRight, 
    Calendar as CalendarIcon, 
    List, 
    LayoutGrid,
    Clock
} from 'lucide-react';

const locales = { 'en-US': enUS };
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

const COLOR_MAP = [
  { hex: '#6366F1' },
  { hex: '#10B981' },
  { hex: '#8B5CF6' },
  { hex: '#F59E0B' },
  { hex: '#EC4899' },
  { hex: '#06B6D4' },
  { hex: '#EF4444' },
];

const getColorForId = (id: string) => {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % COLOR_MAP.length;
  return COLOR_MAP[index];
};

interface CalendarEvent {
  title: string;
  start: Date;
  end: Date;
  allDay: boolean;
  resource: { courseId: string; courseTitle: string };
}

// --- Custom Toolbar Component ---
const CustomToolbar = (toolbar: ToolbarProps<CalendarEvent>) => {
    const goToBack = () => toolbar.onNavigate('PREV');
    const goToNext = () => toolbar.onNavigate('NEXT');
    const goToCurrent = () => toolbar.onNavigate('TODAY');
  
    const label = () => {
      const date = toolbar.date;
      return <span className="text-xl font-bold text-gray-800 dark:text-white">{format(date, 'MMMM yyyy')}</span>;
    };

    const viewButtons: { id: View; label: string; icon: any }[] = [
        { id: 'month', label: 'Month', icon: LayoutGrid },
        { id: 'week', label: 'Week', icon: Clock },
        { id: 'agenda', label: 'List', icon: List },
    ];
  
    return (
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <div className="flex items-center gap-4">
            <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                <CalendarIcon className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>{label()}</div>
        </div>
  
        <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700 p-1 rounded-lg">
            <button 
                onClick={goToBack} 
                className="p-1.5 hover:bg-white dark:hover:bg-gray-600 rounded-md text-gray-600 dark:text-gray-300 transition-all shadow-sm hover:shadow"
            >
                <ChevronLeft className="w-5 h-5" />
            </button>
            <button 
                onClick={goToCurrent} 
                className="px-3 py-1 text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-600 rounded-md transition-all shadow-sm hover:shadow"
            >
                Today
            </button>
            <button 
                onClick={goToNext} 
                className="p-1.5 hover:bg-white dark:hover:bg-gray-600 rounded-md text-gray-600 dark:text-gray-300 transition-all shadow-sm hover:shadow"
            >
                <ChevronRight className="w-5 h-5" />
            </button>
        </div>
  
        <div className="flex bg-gray-100 dark:bg-gray-700 p-1 rounded-lg">
            {viewButtons.map((viewType) => (
                <button
                    key={viewType.id}
                    onClick={() => toolbar.onView(viewType.id)}
                    className={`
                        flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all
                        ${toolbar.view === viewType.id 
                            ? 'bg-white dark:bg-gray-600 text-indigo-600 dark:text-white shadow-sm' 
                            : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                        }
                    `}
                >
                    <viewType.icon className="w-3 h-3" />
                    {viewType.label}
                </button>
            ))}
        </div>
      </div>
    );
  };

/* ---------------------------- Main Component --------------------------- */
export default function CalendarPage() {
  const { user, loading: authLoading } = useAuth();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  
  const [currentView, setCurrentView] = useState<View>('month');

  useEffect(() => {
    if (authLoading || !user) return;

    const fetchQuizEvents = async () => {
      try {
        const userDocRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userDocRef);
        
        if (!userSnap.exists()) {
            setLoading(false);
            return;
        }

        const userData = userSnap.data();
        const enrolledCourseIds: string[] = userData.enrolledCourses || [];

        if (enrolledCourseIds.length === 0) {
          setLoading(false);
          return;
        }

        const courseMap = new Map<string, string>();
        await Promise.all(
            enrolledCourseIds.map(async (courseId) => {
                try {
                    const courseSnap = await getDoc(doc(db, 'courses', courseId));
                    if (courseSnap.exists()) {
                        courseMap.set(courseId, courseSnap.data().title);
                    }
                } catch (e) { console.error(e); }
            })
        );

        const quizzesSnapshot = await getDocs(collectionGroup(db, 'quiz-data'));

        const quizEvents: CalendarEvent[] = quizzesSnapshot.docs
          .filter((quizDoc) => {
            const quizData = quizDoc.data();
            return (
              quizData.courseId &&
              enrolledCourseIds.includes(quizData.courseId) &&
              quizData.dueDate
            );
          })
          .map((quizDoc) => {
            const quizData = quizDoc.data();
            const courseTitle = courseMap.get(quizData.courseId) || 'Course';
            
            let dueDate: Date;
            if (quizData.dueDate instanceof Timestamp) {
                dueDate = quizData.dueDate.toDate();
            } else if (quizData.dueDate?.seconds) {
                dueDate = new Date(quizData.dueDate.seconds * 1000);
            } else {
                dueDate = new Date(quizData.dueDate);
            }

            return {
              title: `${quizData.title || 'Assignment'} Due`,
              start: dueDate,
              end: dueDate,
              allDay: true,
              resource: { courseId: quizData.courseId, courseTitle },
            };
          });

        setEvents(quizEvents);
      } catch (error) {
        console.error('Failed to fetch events:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchQuizEvents();
  }, [user, authLoading]);

  const eventPropGetter: EventPropGetter<CalendarEvent> = (event) => {
    const colorData = getColorForId(event.resource.courseId);
    return {
      style: {
        backgroundColor: colorData.hex,
        color: 'white',
        border: 'none',
        borderRadius: '6px',
        fontSize: '0.8rem',
        padding: '2px 6px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      },
    };
  };

  if (loading) {
      return (
        <div className="flex h-[70vh] items-center justify-center">
            <div className="flex flex-col items-center gap-2">
                <div className="w-8 h-8 border-4 border-indigo-200 dark:border-indigo-900 border-t-indigo-600 dark:border-t-indigo-400 rounded-full animate-spin"></div>
                <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Syncing Schedule...</p>
            </div>
        </div>
      );
  }

  return (
    <div className="space-y-6">
        {/* CSS Overrides for Big Calendar Dark Mode Support */}
        <style jsx global>{`
            .rbc-calendar { font-family: inherit; }
            
            /* Light Mode Defaults (implicit) + Dark Mode Overrides via body class */
            .dark .rbc-header { border-bottom: 1px solid #374151 !important; color: #9ca3af; }
            .rbc-header { padding: 12px 0; font-size: 0.75rem; font-weight: 600; text-transform: uppercase; color: #6b7280; border-bottom: 1px solid #f3f4f6 !important; }
            
            .dark .rbc-month-view { background-color: #1f2937; border: 1px solid #374151; }
            .rbc-month-view { border: 1px solid #f3f4f6; border-radius: 1rem; overflow: hidden; background: white; }
            
            .dark .rbc-day-bg + .rbc-day-bg { border-left: 1px solid #374151; }
            .rbc-day-bg + .rbc-day-bg { border-left: 1px solid #f9fafb; }
            
            .dark .rbc-month-row + .rbc-month-row { border-top: 1px solid #374151; }
            .rbc-month-row + .rbc-month-row { border-top: 1px solid #f9fafb; }
            
            .dark .rbc-off-range-bg { background-color: #111827; }
            .rbc-off-range-bg { background-color: #f9fafb; }
            
            .dark .rbc-today { background-color: rgba(99, 102, 241, 0.2); }
            .rbc-today { background-color: #eef2ff; }
            
            .dark .rbc-date-cell { color: #e5e7eb; }
            
            .rbc-event { transition: transform 0.1s; }
            .rbc-event:hover { transform: scale(1.02); }
        `}</style>

        <div className="bg-white dark:bg-gray-800 p-6 md:p-8 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 h-[calc(100vh-140px)] transition-colors duration-300">
            <Calendar
                localizer={localizer}
                events={events}
                startAccessor="start"
                endAccessor="end"
                style={{ height: '100%' }}
                eventPropGetter={eventPropGetter} 
                
                // Pass the specific components prop
                components={{
                    toolbar: CustomToolbar
                }}

                // Controlled Props
                view={currentView}
                date={currentDate}
                onView={(view) => setCurrentView(view)} // TypeScript infers 'view' correctly now
                onNavigate={(newDate) => setCurrentDate(newDate)}
                
                popup
                selectable
            />
        </div>
    </div>
  );
}