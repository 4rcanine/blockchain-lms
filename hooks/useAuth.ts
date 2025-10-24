// hooks/useAuth.ts
import { useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '../firebase/config'; // Adjust path if needed

const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // This is a listener that checks for auth state changes
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user); // Sets the user object if logged in, or null if logged out
      setLoading(false); // We are done loading
    });

    // Cleanup the listener when the component unmounts
    return () => unsubscribe();
  }, []); // The empty array ensures this effect runs only once

  return { user, loading };
};

export default useAuth;