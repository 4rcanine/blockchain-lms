// app/page.tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import useAuth from '@/hooks/useAuth';

export default function HomePage() {
    const { user, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        // This effect will run when the authentication state is determined.
        if (!loading) {
            if (user) {
                // If a user is logged in, redirect them to their dashboard.
                router.push('/dashboard');
            } else {
                // If no user is logged in, redirect them to the login page.
                // In the future, you could show a landing page here instead.
                router.push('/login');
            }
        }
    }, [user, loading, router]);

    // Display a simple loading state while the check is in progress.
    return (
        <div className="flex items-center justify-center min-h-screen">
            <p>Loading...</p>
        </div>
    );
}