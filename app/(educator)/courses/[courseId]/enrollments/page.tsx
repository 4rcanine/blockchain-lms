'use client';

import { useEffect, useState } from 'react';
import {
  collection,
  doc,
  getDocs,
  query,
  where,
  writeBatch,
  serverTimestamp,
  limit,
  arrayUnion,
  arrayRemove,
} from 'firebase/firestore';
import { db } from '@/firebase/config';
import { useParams } from 'next/navigation';
import React from 'react';
import { 
    UserPlus, 
    Clock, 
    Users, 
    CheckCircle, 
    XCircle, 
    Trash2, 
    Search,
    Loader2
} from 'lucide-react';

interface EnrollmentRequest {
  id: string; 
  studentEmail: string;
  status: 'pending' | 'enrolled' | 'rejected';
}

export default function EnrollmentsPage() {
  const params = useParams();
  const courseId = params.courseId as string;
  const [requests, setRequests] = useState<EnrollmentRequest[]>([]);
  const [addEmail, setAddEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const fetchRequests = async () => {
    if (!courseId) return;
    try {
      const requestsCollectionRef = collection(db, 'courses', courseId, 'enrollmentRequests');
      const q = query(requestsCollectionRef);
      const querySnapshot = await getDocs(q);
      const requestsList = querySnapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      })) as EnrollmentRequest[];
      setRequests(requestsList);
    } catch (err) {
      console.error("Error fetching requests:", err);
    }
  };

  useEffect(() => {
    if (courseId) fetchRequests();
  }, [courseId]);

  const handleUpdateRequest = async (userId: string, status: 'enrolled' | 'rejected') => {
    try {
      const requestDocRef = doc(db, 'courses', courseId, 'enrollmentRequests', userId);
      const userDocRef = doc(db, 'users', userId);
      const notificationRef = doc(collection(db, 'users', userId, 'notifications'));

      const batch = writeBatch(db);

      batch.update(requestDocRef, { status: status, acknowledgedByStudent: false });

      if (status === 'enrolled') {
        batch.update(userDocRef, { enrolledCourses: arrayUnion(courseId) });
        batch.set(notificationRef, {
            message: `You have been enrolled in the course!`, 
            courseId: courseId,
            type: 'enrollment_approved',
            createdAt: serverTimestamp(),
            isRead: false
        });
      } else {
        batch.update(userDocRef, { enrolledCourses: arrayRemove(courseId) });
      }

      await batch.commit();
      await fetchRequests();
      setMessage(`Successfully ${status === 'enrolled' ? 'approved' : 'rejected'} student.`);
      setTimeout(() => setMessage(''), 3000);
    } catch (err: any) {
      console.error('Error updating request:', err);
      setError('Failed to update request.');
    }
  };

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    if (!addEmail.trim()) return;
    setIsProcessing(true);

    try {
      const usersCollectionRef = collection(db, 'users');
      const q = query(usersCollectionRef, where('email', '==', addEmail.trim()), limit(1));
      const userSnapshot = await getDocs(q);

      if (userSnapshot.empty) throw new Error('No user found with this email.');

      const userId = userSnapshot.docs[0].id;
      const requestDocRef = doc(db, 'courses', courseId, 'enrollmentRequests', userId);
      const userDocRef = doc(db, 'users', userId);
      const notificationRef = doc(collection(db, 'users', userId, 'notifications'));

      const batch = writeBatch(db);

      batch.set(requestDocRef, {
          status: 'enrolled',
          studentEmail: addEmail.trim(),
          addedAt: serverTimestamp(),
          acknowledgedByStudent: false, 
          studentId: userId, 
          courseId: courseId
      }, { merge: true });

      batch.update(userDocRef, { enrolledCourses: arrayUnion(courseId) });

      batch.set(notificationRef, {
        message: `An instructor has enrolled you in a new course!`,
        courseId: courseId,
        type: 'enrollment_added',
        createdAt: serverTimestamp(),
        isRead: false
      });

      await batch.commit();
      setMessage(`✅ Successfully enrolled ${addEmail}`);
      setAddEmail('');
      fetchRequests();
    } catch (err: any) {
      setError(err.message || 'Failed to add student.');
    } finally {
        setIsProcessing(false);
    }
  };

  const handleRemoveStudent = async (userId: string, userEmail: string) => {
    if (!window.confirm(`Remove ${userEmail} from this course?`)) return;

    const requestDocRef = doc(db, 'courses', courseId, 'enrollmentRequests', userId);
    const userDocRef = doc(db, 'users', userId);
    const batch = writeBatch(db);

    try {
      batch.delete(requestDocRef);
      batch.update(userDocRef, { enrolledCourses: arrayRemove(courseId) });
      await batch.commit();
      setMessage(`Removed ${userEmail} from course.`);
      fetchRequests();
    } catch (err) {
      console.error(err);
      setError("Failed to remove student.");
    }
  };

  const pendingRequests = requests.filter(r => r.status === 'pending');
  const enrolledStudents = requests.filter(r => r.status === 'enrolled');

  return (
    <div className="max-w-5xl mx-auto py-8 space-y-8 pb-20">
      
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Enrollment Manager</h1>
        <p className="text-gray-500 dark:text-gray-400">Manage student access and pending applications.</p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* --- LEFT COL: Add Student --- */}
        <div className="lg:col-span-1 space-y-6">
            <div className="bg-white dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-700 rounded-2xl p-6">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
                    <UserPlus className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                    Direct Enrollment
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                    Manually enroll a student by their email address.
                </p>
                
                <form onSubmit={handleAddStudent} className="space-y-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                        <input
                            type="email"
                            value={addEmail}
                            onChange={(e) => setAddEmail(e.target.value)}
                            placeholder="student@email.com"
                            className="w-full pl-9 pr-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900 dark:text-white transition-all"
                            required
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={isProcessing}
                        className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition-all shadow-md shadow-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Enroll Student'}
                    </button>
                </form>

                {/* Feedback Messages */}
                {message && (
                    <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-xs font-medium text-green-700 dark:text-green-400 animate-in fade-in slide-in-from-top-2">
                        {message}
                    </div>
                )}
                {error && (
                    <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-xs font-medium text-red-600 dark:text-red-400 animate-in fade-in slide-in-from-top-2">
                        {error}
                    </div>
                )}
            </div>
        </div>

        {/* --- RIGHT COL: Lists --- */}
        <div className="lg:col-span-2 space-y-8">
            
            {/* Pending Requests */}
            <div className="bg-white dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-700 rounded-2xl overflow-hidden">
                <div className="p-6 border-b border-gray-100 dark:border-gray-700 bg-amber-50/50 dark:bg-amber-900/10 flex justify-between items-center">
                    <h2 className="text-lg font-bold text-amber-800 dark:text-amber-400 flex items-center gap-2">
                        <Clock className="w-5 h-5" /> Pending Requests
                    </h2>
                    <span className="text-xs font-bold bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 px-2 py-1 rounded-full">
                        {pendingRequests.length}
                    </span>
                </div>
                
                <div className="p-6 space-y-3">
                    {pendingRequests.length === 0 ? (
                        <p className="text-sm text-gray-400 dark:text-gray-500 italic text-center py-4">No pending requests.</p>
                    ) : (
                        pendingRequests.map((req) => (
                            <div key={req.id} className="flex flex-col sm:flex-row justify-between items-center p-4 bg-gray-50 dark:bg-gray-700/30 border border-gray-100 dark:border-gray-700 rounded-xl gap-4">
                                <span className="font-medium text-gray-700 dark:text-gray-200 text-sm">{req.studentEmail}</span>
                                <div className="flex gap-2 w-full sm:w-auto">
                                    <button
                                        onClick={() => handleUpdateRequest(req.id, 'enrolled')}
                                        className="flex-1 sm:flex-none flex items-center justify-center gap-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-lg transition-colors"
                                    >
                                        <CheckCircle className="w-3.5 h-3.5" /> Approve
                                    </button>
                                    <button
                                        onClick={() => handleUpdateRequest(req.id, 'rejected')}
                                        className="flex-1 sm:flex-none flex items-center justify-center gap-1 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 hover:border-red-200 transition-colors text-xs font-bold rounded-lg"
                                    >
                                        <XCircle className="w-3.5 h-3.5" /> Reject
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Enrolled Students */}
            <div className="bg-white dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-700 rounded-2xl overflow-hidden">
                <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <Users className="w-5 h-5 text-indigo-600 dark:text-indigo-400" /> Class Roster
                    </h2>
                    <span className="text-xs font-bold bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 px-2 py-1 rounded-full">
                        {enrolledStudents.length} Students
                    </span>
                </div>

                <div className="divide-y divide-gray-100 dark:divide-gray-700">
                    {enrolledStudents.length === 0 ? (
                        <p className="text-sm text-gray-400 dark:text-gray-500 italic text-center py-8">No students enrolled yet.</p>
                    ) : (
                        enrolledStudents.map((req) => (
                            <div key={req.id} className="p-4 flex justify-between items-center hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-xs">
                                        {req.studentEmail[0].toUpperCase()}
                                    </div>
                                    <p className="text-sm font-medium text-gray-700 dark:text-gray-200">{req.studentEmail}</p>
                                </div>
                                <button 
                                    onClick={() => handleRemoveStudent(req.id, req.studentEmail)}
                                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                    title="Remove Student"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        ))
                    )}
                </div>
            </div>

        </div>
      </div>
    </div>
  );
}