// hooks/useAuth.ts
import { useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../firebase/config';

// ✅ Create a merged type instead of extending Firebase's User
export type AuthUser = User & {
  displayName: string | null;
  photoURL: string | null;
  role?: string;
};

const useAuth = () => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (authUser) => {
      if (authUser) {
        const userDocRef = doc(db, 'users', authUser.uid);

        const unsubscribeFirestore = onSnapshot(userDocRef, (docSnap) => {
          if (docSnap.exists()) {
            const firestoreData = docSnap.data();
            // ✅ Safely merge Auth and Firestore data
            setUser({
              ...authUser,
              displayName: firestoreData.displayName ?? authUser.displayName ?? null,
              photoURL: firestoreData.photoURL ?? authUser.photoURL ?? null,
              role: firestoreData.role ?? undefined,
            });
          } else {
            setUser(authUser as AuthUser);
          }
          setLoading(false);
        });

        return () => unsubscribeFirestore();
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  return { user, loading };
};

export default useAuth;
