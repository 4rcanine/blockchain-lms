// app/(auth)/signup/page.tsx
'use client'; // This page is interactive, so it's a client component

import { useRouter } from 'next/navigation';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../../firebase/config'; // Adjust path if needed
import AuthForm from '../../../components/AuthForm'; // Adjust path if needed
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../../../firebase/config';

export default function SignUp() {
  const router = useRouter();

  const handleSignUp = async (event: React.FormEvent<HTMLFormElement>, email: string, pass: string) => {
    event.preventDefault();
    try {
      // 1. Create the user in Firebase Authentication
      const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
      const user = userCredential.user;
      console.log('Signed up successfully!', user);

      // 2. Create a document for the user in the 'users' collection in Firestore
      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        email: user.email,
        role: 'student', // Assign 'student' as the default role
        enrolledCourses: [], // Start with an empty array of courses
      });

      // 3. Redirect to the dashboard
      router.push('/dashboard'); // Change redirect to the new dashboard page

    } catch (error: any) {
      const errorCode = error.code;
      const errorMessage = error.message;
      console.error('Error signing up:', errorCode, errorMessage);
    }
  };

  return <AuthForm mode="signup" onSubmit={handleSignUp} />;
}