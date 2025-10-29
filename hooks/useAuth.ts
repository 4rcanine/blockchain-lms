// hooks/useAuth.ts
import { useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../firebase/config';

// ✅ Merged type — don't extend User (avoids TS conflicts)
export type AuthUser = {
  uid: string;
  email: string | null;
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
            // ✅ Merge Firebase Auth + Firestore data safely
            setUser({
              uid: authUser.uid,
              email: authUser.email,
              displayName:
                firestoreData.displayName ?? authUser.displayName ?? null,
              photoURL:
                firestoreData.photoURL ?? authUser.photoURL ?? null, // Cloudinary or Firebase
              role: firestoreData.role ?? undefined,
            });
          } else {
            // Fallback to just Auth user if Firestore doc not found
            setUser({
              uid: authUser.uid,
              email: authUser.email,
              displayName: authUser.displayName,
              photoURL: authUser.photoURL,
            });
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
