// app/(admin)/admin/users/page.tsx
'use client';

import { useEffect, useState, useMemo } from 'react';
import { collection, getDocs, query, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../../../../firebase/config';
import { Trash2, Loader2, UserPlus, User, CornerUpRight } from 'lucide-react';
import { useRouter } from 'next/navigation';

// NOTE: Deleting Firebase Auth users requires a Cloud Function or Admin SDK,
// which cannot be run directly from the client. We will implement the Firestore
// profile deletion and display a warning about the Auth account.

interface UserProfile {
  uid: string;
  email: string;
  role: 'student' | 'educator' | 'admin';
  displayName?: string;
}

const roleOrder = {
  admin: 1,
  educator: 2,
  student: 3,
};

export default function UserManagement() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();

  const fetchUsers = async () => {
    setLoading(true);
    try {
      // NOTE: Your security rules must allow Admins to 'list' the /users collection
      const usersCollectionRef = collection(db, 'users');
      const querySnapshot = await getDocs(query(usersCollectionRef));
      
      const usersList = querySnapshot.docs.map(doc => ({
        uid: doc.id,
        ...doc.data()
      })) as UserProfile[];
      
      setUsers(usersList);
      setError(null);
    } catch (err: any) {
      console.error(err);
      setError('You do not have sufficient permissions to list all users. Check Firestore Rules.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // --- Sorting Users by Role ---
  const sortedUsersByRole = useMemo(() => {
    return [...users].sort((a, b) => {
      // 1. Sort by role order (Admin 1, Educator 2, Student 3)
      const roleA = roleOrder[a.role] || 99;
      const roleB = roleOrder[b.role] || 99;
      
      if (roleA !== roleB) {
        return roleA - roleB;
      }
      
      // 2. Secondary sort by email
      return (a.email || '').localeCompare(b.email || '');
    });
  }, [users]);
  
  // --- Deletion Handler ---
  const handleDeleteUser = async (user: UserProfile) => {
    if (!window.confirm(`WARNING: This action will DELETE the Firestore profile for ${user.email}. You must manually delete the Firebase Auth account.`)) {
        return;
    }
    
    setIsDeleting(true);
    try {
        // 1. Delete the Firestore Profile Document
        await deleteDoc(doc(db, 'users', user.uid));
        
        // 2. Alert the Admin about the necessary manual step
        alert(`SUCCESS: Firestore profile for ${user.email} deleted.\n\nSimulated Login Status: Invalid email or password.\n\n(Reminder: You must go to Firebase Authentication console to delete the user's login account.)`);
        
        // 3. Refresh the list
        setUsers(prev => prev.filter(u => u.uid !== user.uid));
    } catch (err) {
        console.error("Deletion Failed:", err);
        setError("Failed to delete user profile. Check permissions.");
    } finally {
        setIsDeleting(false);
    }
  };
  
  // --- Grouping Users for Display ---
  const usersGrouped = useMemo(() => {
      return sortedUsersByRole.reduce((acc, user) => {
          const role = user.role || 'student';
          if (!acc[role]) acc[role] = [];
          acc[role].push(user);
          return acc;
      }, {} as Record<string, UserProfile[]>);
  }, [sortedUsersByRole]);


  if (loading) return <div className="text-center mt-10"><Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-500" /></div>;
  if (error) return <p className="text-red-600 p-4">{error}</p>;

  return (
    <div className="p-4 space-y-8">
      <h1 className="text-3xl font-bold mb-8">User Management ({users.length} Total)</h1>
      
      {/* Admin Action Bar (Manual Account Creation) */}
      <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-xl shadow-md flex justify-between items-center">
          <p className="text-sm font-medium text-yellow-800">
              User accounts must be created first via the Firebase Console (Authentication section).
          </p>
          <button 
              onClick={() => { /* Placeholder for modal/action */ alert("User addition requires Firebase Auth access."); }}
              className="flex items-center gap-2 px-4 py-2 bg-yellow-600 text-white rounded-lg text-sm font-semibold hover:bg-yellow-700"
          >
              <UserPlus className="w-4 h-4" /> Add User (Manual)
          </button>
      </div>

      {/* User Table Sorted by Role */}
      <div className="space-y-6">
        {Object.keys(usersGrouped).sort((a, b) => roleOrder[a as keyof typeof roleOrder] - roleOrder[b as keyof typeof roleOrder]).map((role) => (
            <div key={role} className="bg-white rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden">
                <h2 className="text-xl font-bold p-4 bg-gray-50 border-b dark:bg-gray-800/50 dark:text-white capitalize">
                    {role}s ({usersGrouped[role].length})
                </h2>
                
                <table className="min-w-full leading-normal">
                    <thead>
                        <tr>
                            <th className="px-5 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Email / Display Name</th>
                            <th className="px-5 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                            <th className="px-5 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">View Profile</th>
                        </tr>
                    </thead>
                    <tbody>
                        {usersGrouped[role].map((user) => (
                            <tr key={user.uid} className="hover:bg-gray-50 transition-colors">
                                <td className="px-5 py-3 border-b border-gray-200 bg-white text-sm">
                                    <p className="font-medium text-gray-900">{user.email}</p>
                                    <p className="text-xs text-gray-500">{user.displayName}</p>
                                </td>
                                <td className="px-5 py-3 border-b border-gray-200 bg-white text-sm flex gap-2">
                                    {/* Delete Button */}
                                    <button
                                        onClick={() => handleDeleteUser(user)}
                                        disabled={isDeleting || user.role === 'admin'} // Cannot delete self/other admins easily
                                        className="text-red-500 hover:text-red-700 p-2 rounded-lg transition-colors disabled:opacity-50"
                                        title="Delete Firestore Profile (Requires manual Auth deletion)"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </td>
                                <td className="px-5 py-3 border-b border-gray-200 bg-white text-sm">
                                    {/* Link to view detailed profile */}
                                    <button onClick={() => router.push(`/admin/users/${user.uid}`)} className="text-indigo-600 hover:text-indigo-800 p-2 rounded-lg transition-colors">
                                        <CornerUpRight className="w-4 h-4" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        ))}
      </div>
    </div>
  );
}