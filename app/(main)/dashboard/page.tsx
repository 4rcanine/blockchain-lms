'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import useAuth from '@/hooks/useAuth';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/firebase/config';
import { Loader2, ShieldCheck } from 'lucide-react';

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
                        router.replace('/student/dashboard'); 
                    } else if (role === 'educator') {
                        router.replace('/educator/dashboard');
                    } else {
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
        <div className="min-h-screen w-full flex flex-col items-center justify-center bg-slate-50 dark:bg-gray-950 transition-colors duration-500">
            
            {/* Card Container */}
            <div className="relative p-8 md:p-12 rounded-3xl bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border border-white/20 dark:border-gray-800 shadow-2xl flex flex-col items-center gap-6 max-w-sm w-full mx-4">
                
                {/* Ambient Glow Effect */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-indigo-500/20 dark:bg-indigo-500/10 rounded-full blur-3xl pointer-events-none animate-pulse" />

                {/* Icon / Loader Wrapper */}
                <div className="relative z-10 flex items-center justify-center">
                    <div className="relative">
                        {/* Spinner */}
                        <Loader2 className="w-12 h-12 text-indigo-600 dark:text-indigo-400 animate-spin" />
                        
                        <div className="absolute inset-0 flex items-center justify-center">
                        </div>
                    </div>
                </div>

                {/* Text Content */}
                <div className="text-center space-y-2 relative z-10">
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white tracking-tight">
                        Accessing Portal
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                        Verifying your credentials...
                    </p>
                </div>

                {/* Progress Bar / Decoration */}
                <div className="w-full h-1 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 w-1/2 animate-[shimmer_1.5s_infinite_linear] rounded-full" />
                </div>
            </div>
        </div>
    );
}