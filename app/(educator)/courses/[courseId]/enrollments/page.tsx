// app/(educator)/courses/[courseId]/enrollments/page.tsx

'use client';

import { useEffect, useState } from 'react';
import {
  collection,
  doc,
  getDocs,
  query,
  updateDoc,
  where,
  writeBatch,
  serverTimestamp,
  setDoc,
  limit,
  arrayUnion,
  arrayRemove,
  deleteDoc, // Imported for removal functionality
} from 'firebase/firestore';
import { db } from '@/firebase/config';
import { useParams } from 'next/navigation';
import React from 'react';

// ----------------------------- Types ------------------------------------
interface EnrollmentRequest {
  id: string; // User ID
  studentEmail: string;
  status: 'pending' | 'enrolled' | 'rejected';
}

// ------------------------------- Component --------------------------------
export default function EnrollmentsPage() {
  const params = useParams();
  const courseId = params.courseId as string;
  const [requests, setRequests] = useState<EnrollmentRequest[]>([]);
  const [addEmail, setAddEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // 🔹 Fetch all enrollment requests for this course
  const fetchRequests = async () => {
    if (!courseId) return;
    const requestsCollectionRef = collection(
      db,
      'courses',
      courseId,
      'enrollmentRequests'
    );
    const q = query(requestsCollectionRef);
    const querySnapshot = await getDocs(q);
    const requestsList = querySnapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data(),
    })) as EnrollmentRequest[];
    setRequests(requestsList);
  };

  useEffect(() => {
    if (courseId) fetchRequests();
  }, [courseId]);

  // 🔹 Approve or reject enrollment requests (from File 1)
  const handleUpdateRequest = async (
    userId: string,
    status: 'enrolled' | 'rejected'
  ) => {
    try {
      const requestDocRef = doc(
        db,
        'courses',
        courseId,
        'enrollmentRequests',
        userId
      );
      const userDocRef = doc(db, 'users', userId);
      const batch = writeBatch(db);

      // --- START: Update request status and notification flag ---
      const requestUpdateData: { status: 'enrolled' | 'rejected'; acknowledgedByStudent?: boolean } = {
        status: status,
      };

      if (status === 'enrolled') {
        // CRITICAL: Triggers the student notification on the dashboard
        requestUpdateData.acknowledgedByStudent = false; 
      }
      
      batch.update(requestDocRef, requestUpdateData);
      // --- END: Update request status and notification flag ---

      // Update user's enrolledCourses
      if (status === 'enrolled') {
        batch.update(userDocRef, {
          enrolledCourses: arrayUnion(courseId),
        });
      } else {
        // If rejected, also remove from user's list just in case they were previously enrolled (though unlikely for pending)
        batch.update(userDocRef, {
          enrolledCourses: arrayRemove(courseId),
        });
      }

      await batch.commit();
      await fetchRequests();
    } catch (err: any) {
      console.error('Error updating request:', err);
      setError('Failed to update enrollment request.');
    }
  };

  // 🔹 Manually add a student by email (from File 1)
  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    if (!addEmail.trim()) return;

    try {
      // Find user by email
      const usersCollectionRef = collection(db, 'users');
      const q = query(
        usersCollectionRef,
        where('email', '==', addEmail.trim()),
        limit(1)
      );
      const userSnapshot = await getDocs(q);

      if (userSnapshot.empty) {
        throw new Error('No user found with this email address.');
      }

      const userDoc = userSnapshot.docs[0];
      const userId = userDoc.id;

      // Batch write: add to course + user profile
      const requestDocRef = doc(
        db,
        'courses',
        courseId,
        'enrollmentRequests',
        userId
      );
      const userDocRef = doc(db, 'users', userId);
      const batch = writeBatch(db);

      // --- START: Set status and notification flag on manual add ---
      batch.set(
        requestDocRef,
        {
          status: 'enrolled',
          studentEmail: addEmail.trim(),
          addedAt: serverTimestamp(),
          // CRITICAL: Triggers the student notification on the dashboard
          acknowledgedByStudent: false, 
        },
        { merge: true }
      );
      // --- END: Set status and notification flag on manual add ---

      batch.update(userDocRef, {
        enrolledCourses: arrayUnion(courseId),
      });

      await batch.commit();

      setMessage(`✅ Successfully enrolled ${addEmail}`);
      setAddEmail('');
      fetchRequests();
    } catch (err: any) {
      setError(err.message || 'Failed to add student.');
    }
  };

  // 🔹 Remove a student (from File 2)
  const handleRemoveStudent = async (userId: string, userEmail: string) => {
    // Add a confirmation dialog to prevent accidental removal
    if (!window.confirm(`Are you sure you want to remove ${userEmail} from this course? This action cannot be undone.`)) {
      return;
    }

    const requestDocRef = doc(db, 'courses', courseId, 'enrollmentRequests', userId);
    const userDocRef = doc(db, 'users', userId);

    const batch = writeBatch(db);

    try {
      // 1. Delete the enrollment request document entirely. This revokes their access.
      batch.delete(requestDocRef);

      // 2. Update the student's user document to remove the course ID from their list.
      batch.update(userDocRef, {
        enrolledCourses: arrayRemove(courseId)
      });

      await batch.commit();
      setMessage(`Successfully removed ${userEmail} from the course.`);
      // Clear error on success if one was set previously
      setError('');
      fetchRequests(); // Refresh the UI

    } catch (err) {
      console.error("Failed to remove student:", err);
      setError("Failed to remove student. Please check permissions and try again.");
      setMessage('');
    }
  };

  // 🔹 JSX UI
  return (
    <div className="max-w-4xl mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Course Enrollment Management</h1>
      
      {/* --- Add Student Form --- */}
      <div className="mb-8 p-4 bg-white shadow rounded-lg border border-indigo-100">
        <h2 className="text-xl font-semibold mb-2 text-indigo-800">Direct Enrollment</h2>
        <p className="text-sm text-gray-600 mb-3">Manually enroll a student using their email address.</p>
        
        <form onSubmit={handleAddStudent} className="flex flex-col sm:flex-row gap-2">
          <input
            type="email"
            value={addEmail}
            onChange={(e) => setAddEmail(e.target.value)}
            placeholder="student@example.com"
            className="w-full p-2 border rounded-md focus:ring-indigo-500 focus:border-indigo-500"
            required
          />
          <button
            type="submit"
            className="px-4 py-2 font-semibold text-white bg-indigo-600 rounded-md hover:bg-indigo-700 transition duration-150 whitespace-nowrap"
          >
            Add Student
          </button>
        </form>
        {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
        {message && <p className="text-green-600 text-sm mt-2">{message}</p>}
      </div>

      {/* --- Pending Requests --- */}
      <div className="mb-8">
        <h2 className="text-2xl font-semibold mb-3">
          🔔 Pending Enrollment Requests
        </h2>
        <div className="space-y-3">
          {requests
            .filter((r) => r.status === 'pending')
            .map((req) => (
              <div
                key={req.id}
                className="flex justify-between items-center p-4 bg-yellow-50 border border-yellow-200 shadow-sm rounded-md"
              >
                <span className="font-medium">{req.studentEmail}</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleUpdateRequest(req.id, 'enrolled')}
                    className="text-sm font-semibold text-white bg-green-600 px-3 py-1 rounded-md hover:bg-green-700 transition"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => handleUpdateRequest(req.id, 'rejected')}
                    className="text-sm font-semibold text-white bg-red-600 px-3 py-1 rounded-md hover:bg-red-700 transition"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          {requests.filter((r) => r.status === 'pending').length === 0 && (
            <p className="text-gray-500 italic p-3">No pending requests.</p>
          )}
        </div>
      </div>

      <hr className="my-8" />

      {/* --- Course Roster (Updated with Remove button) --- */}
      <div>
        <h2 className="text-2xl font-semibold mb-3">👥 Course Roster (Enrolled)</h2>
        <div className="space-y-3">
          {requests
            .filter((r) => r.status === 'enrolled')
            .map((req) => (
              <div
                key={req.id}
                className="p-4 bg-white shadow rounded-md flex justify-between items-center border"
              >
                <p className="text-gray-800">{req.studentEmail}</p>
                {/* --- NEW REMOVE BUTTON --- */}
                <button 
                  onClick={() => handleRemoveStudent(req.id, req.studentEmail)}
                  className="px-3 py-1 text-xs font-semibold text-red-700 bg-red-100 rounded-full hover:bg-red-200 transition"
                >
                  Remove
                </button>
              </div>
            ))}
          {requests.filter((r) => r.status === 'enrolled').length === 0 && (
            <p className="text-gray-500 italic p-3">
              No students are currently enrolled.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}