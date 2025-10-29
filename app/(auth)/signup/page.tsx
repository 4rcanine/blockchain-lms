// app/(auth)/signup/page.tsx
'use client';

import { useRouter } from 'next/navigation';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '@/firebase/config';
import AuthForm, { UserRole } from '@/components/AuthForm'; // Import the UserRole type

export default function SignUp() {
    const router = useRouter();

    // The function now accepts the 'role' parameter
    const handleSignUp = async (event: React.FormEvent<HTMLFormElement>, email: string, pass: string, role?: UserRole) => {
        event.preventDefault();
        
        // Ensure a role is selected (it will be by default, but this is good practice)
        if (!role) {
            console.error("No role selected during sign-up.");
            return;
        }

        try {
            // 1. Create the user in Firebase Authentication
            const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
            const user = userCredential.user;
            console.log('Signed up successfully!', user);

            // 2. Create the user document in Firestore with the SELECTED role
            await setDoc(doc(db, "users", user.uid), {
                uid: user.uid,
                email: user.email,
                role: role, // Use the role from the form
                enrolledCourses: [],
            });

            // 3. Redirect to the dashboard
            router.push('/dashboard');

        } catch (error: any) {
            const errorCode = error.code;
            const errorMessage = error.message;
            console.error('Error signing up:', errorCode, errorMessage);
        }
    };

    return <AuthForm mode="signup" onSubmit={handleSignUp} />;
}