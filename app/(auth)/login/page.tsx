// app/(auth)/login/page.tsx
'use client';

import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../../firebase/config'; // Adjust path if needed
import AuthForm from '../../../components/AuthForm'; // Adjust path if needed

export default function Login() {
  const router = useRouter();

  const handleLogin = async (event: React.FormEvent<HTMLFormElement>, email: string, pass: string) => {
    event.preventDefault();
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, pass);
      // Signed in
      const user = userCredential.user;
      console.log('Logged in successfully!', user);
      // Redirect to a dashboard or home page after successful login
      router.push('/');
    } catch (error: any) {
      const errorCode = error.code;
      const errorMessage = error.message;
      console.error('Error logging in:', errorCode, errorMessage);
    }
  };

  return <AuthForm mode="login" onSubmit={handleLogin} />;
}