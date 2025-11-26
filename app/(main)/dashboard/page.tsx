'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import useAuth from '@/hooks/useAuth';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/firebase/config';
import { Loader2 } from 'lucide-react';

export default function DashboardDispatch() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const [checkingRole, setCheckingRole] = useState(true);

    useEffect(() => {
        const checkRoleAndRedirect = async () => {
            if (loading) return;
            
            if (!user) {
                router.push('/login');
                return;
            }

            try {
                const userDoc = await getDoc(doc(db, 'users', user.uid));
                if (userDoc.exists()) {
                    const role = userDoc.data().role;
                    
                    if (role === 'student') {
                        // Redirect to the route inside (student) layout
                        router.replace('/student/dashboard'); 
                    } else if (role === 'educator') {
                        // Redirect to the route inside (educator) layout
                        router.replace('/educator/dashboard');
                    } else {
                        // Fallback or Admin
                        router.replace('/admin/dashboard'); 
                    }
                }
            } catch (error) {
                console.error("Error checking role:", error);
            } finally {
                setCheckingRole(false);
            }
        };

        checkRoleAndRedirect();
    }, [user, loading, router]);

    return (
        <div className="h-screen flex flex-col items-center justify-center bg-slate-50">
            <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mb-4" />
            <p className="text-gray-500 font-medium">Redirecting to your portal...</p>
        </div>
    );
}