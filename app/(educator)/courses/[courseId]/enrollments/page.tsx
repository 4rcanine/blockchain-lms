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
} from 'firebase/firestore';
import { db } from '@/firebase/config';
import { useParams } from 'next/navigation';

interface EnrollmentRequest {
  id: string; // User ID
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

  // 🔹 Approve or reject enrollment requests
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

      // --- START FIX: Update request status and notification flag ---
      const requestUpdateData: { status: 'enrolled' | 'rejected'; acknowledgedByStudent?: boolean } = {
        status: status,
      };

      if (status === 'enrolled') {
        // This is the CRITICAL line to trigger the student notification
        requestUpdateData.acknowledgedByStudent = false; 
      }
      
      batch.update(requestDocRef, requestUpdateData);
      // --- END FIX ---

      // Update user's enrolledCourses
      if (status === 'enrolled') {
        batch.update(userDocRef, {
          enrolledCourses: arrayUnion(courseId),
        });
      } else {
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

  // 🔹 Manually add a student by email
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

      // --- START FIX: Set status and notification flag on manual add ---
      batch.set(
        requestDocRef,
        {
          status: 'enrolled',
          studentEmail: addEmail.trim(),
          addedAt: serverTimestamp(),
          // This is the CRITICAL line to trigger the student notification
          acknowledgedByStudent: false, 
        },
        { merge: true }
      );
      // --- END FIX ---

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

  // 🔹 JSX UI
  return (
    <div>
      {/* --- Add Student Form --- */}
      <div className="mb-8 p-4 bg-white shadow rounded-lg">
        <h2 className="text-xl font-semibold mb-2">Add Student Directly</h2>
        <form onSubmit={handleAddStudent} className="flex gap-2">
          <input
            type="email"
            value={addEmail}
            onChange={(e) => setAddEmail(e.target.value)}
            placeholder="student@example.com"
            className="w-full p-2 border rounded-md"
            required
          />
          <button
            type="submit"
            className="px-4 py-2 font-semibold text-white bg-indigo-600 rounded-md whitespace-nowrap"
          >
            Add Student
          </button>
        </form>
        {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
        {message && <p className="text-green-600 text-sm mt-2">{message}</p>}
      </div>

      {/* --- Pending Requests --- */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-2">
          Pending Enrollment Requests
        </h2>
        <div className="space-y-2">
          {requests
            .filter((r) => r.status === 'pending')
            .map((req) => (
              <div
                key={req.id}
                className="flex justify-between items-center p-3 bg-white shadow rounded-md"
              >
                <span>{req.studentEmail}</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleUpdateRequest(req.id, 'enrolled')}
                    className="text-sm font-semibold text-white bg-green-500 px-3 py-1 rounded-md"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => handleUpdateRequest(req.id, 'rejected')}
                    className="text-sm font-semibold text-white bg-red-500 px-3 py-1 rounded-md"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          {requests.filter((r) => r.status === 'pending').length === 0 && (
            <p className="text-gray-500">No pending requests.</p>
          )}
        </div>
      </div>

      {/* --- Course Roster --- */}
      <div>
        <h2 className="text-xl font-semibold mb-2">Course Roster</h2>
        <div className="space-y-2">
          {requests
            .filter((r) => r.status === 'enrolled')
            .map((req) => (
              <div
                key={req.id}
                className="p-3 bg-white shadow rounded-md flex justify-between items-center"
              >
                <p>{req.studentEmail}</p>
              </div>
            ))}
          {requests.filter((r) => r.status === 'enrolled').length === 0 && (
            <p className="text-gray-500">
              No students are currently enrolled.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}