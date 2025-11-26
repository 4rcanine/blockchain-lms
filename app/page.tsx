// app/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { collection, query, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '@/firebase/config';
import useAuth from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { 
  Code2, 
  BrainCircuit, 
  Users, 
  ArrowRight, 
  Layers, 
  Terminal, 
  ShieldCheck,
  Loader2
} from 'lucide-react';

// --- Type Definitions ---
interface Course {
  id: string;
  title: string;
  description: string;
  tags: string[];
  imageUrl?: string;
}

// --- Reusable Course Card ---
const CourseCard = ({ course }: { course: Course }) => (
    <div className="group bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col overflow-hidden hover:-translate-y-1">
        <div className="relative h-48 overflow-hidden">
            {course.imageUrl ? (
                <img 
                    src={course.imageUrl} 
                    alt={course.title} 
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
                />
            ) : (
                <div className="w-full h-full bg-gradient-to-br from-indigo-50 to-blue-100 flex items-center justify-center">
                    <Layers className="text-indigo-200 w-12 h-12" />
                </div>
            )}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />
        </div>
        
        <div className="p-6 flex flex-col flex-grow">
            <div className="flex flex-wrap gap-2 mb-3">
                {course.tags.slice(0, 3).map(tag => (
                    <span 
                        key={tag} 
                        className="px-2.5 py-1 text-[10px] uppercase tracking-wider font-bold text-indigo-700 bg-indigo-50 rounded-full border border-indigo-100"
                    >
                        {tag}
                    </span>
                ))}
            </div>
            
            <h3 className="font-bold text-xl mb-2 text-gray-900 line-clamp-2 group-hover:text-indigo-600 transition-colors">
                {course.title}
            </h3>
            
            <p className="text-sm text-gray-600 mb-6 flex-grow line-clamp-3 leading-relaxed">
                {course.description}
            </p>
            
            <Link 
                href={`/courses/${course.id}`} 
                className="w-full flex items-center justify-center gap-2 py-3 rounded-lg bg-gray-50 text-gray-700 font-semibold text-sm group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300"
            >
                View Course <ArrowRight className="w-4 h-4" />
            </Link>
        </div>
    </div>
);

// --- Main Landing Page Component ---
export default function LandingPage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const [featuredCourses, setFeaturedCourses] = useState<Course[]>([]);
    const [isLoadingCourses, setIsLoadingCourses] = useState(true);

    useEffect(() => {
        // This effect handles routing and data fetching
        if (!authLoading) {
            if (user) {
                // If user is already logged in, send them to their dashboard
                router.push('/dashboard');
            } else {
                // If user is logged out, fetch featured courses
                const fetchFeaturedCourses = async () => {
                    try {
                        const coursesRef = collection(db, 'courses');
                        const q = query(coursesRef, orderBy('createdAt', 'desc'), limit(3));
                        const snapshot = await getDocs(q);
                        const coursesList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Course[];
                        setFeaturedCourses(coursesList);
                    } catch (error) {
                        console.error("Failed to fetch featured courses:", error);
                    } finally {
                        setIsLoadingCourses(false);
                    }
                };
                fetchFeaturedCourses();
            }
        }
    }, [user, authLoading, router]);

    // Loading State
    if (authLoading || (user && !authLoading)) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-white">
                <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
                <p className="mt-4 text-gray-500 font-medium">Entering the Matrix...</p>
            </div>
        );
    }

    // --- RENDER THE LANDING PAGE ---
    return (
        <div className="bg-white text-gray-900 selection:bg-indigo-100 selection:text-indigo-900">
            
            {/* --- Hero Section --- */}
            <section className="relative pt-24 pb-20 md:pt-32 md:pb-32 overflow-hidden">
                {/* Background Decor */}
                <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-indigo-50 rounded-[100%] blur-3xl opacity-60" />
                    <div className="absolute bottom-0 right-0 w-[800px] h-[600px] bg-blue-50 rounded-[100%] blur-3xl opacity-40" />
                </div>

                <div className="container mx-auto px-6 text-center relative z-10">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-sm font-semibold mb-8">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                        </span>
                        New Version 1.0 Live
                    </div>

                    <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 leading-tight">
                        Master the Future of <br />
                        <span className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
                            Web3 Development
                        </span>
                    </h1>
                    
                    <p className="mt-4 text-xl md:text-2xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
                        An interactive, community-driven platform to master smart contracts, dApps, and blockchain architecture.
                    </p>
                    
                    <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center items-center">
                        <Link href="/signup" className="px-8 py-4 bg-indigo-600 text-white rounded-xl font-bold text-lg shadow-lg hover:bg-indigo-700 hover:shadow-indigo-500/25 transition-all transform hover:-translate-y-1">
                            Start Learning for Free
                        </Link>
                        <Link href="#courses" className="px-8 py-4 bg-white text-gray-700 border border-gray-200 rounded-xl font-bold text-lg hover:bg-gray-50 transition-all">
                            Browse Courses
                        </Link>
                    </div>

                    {/* Tech Stack Strip */}
                    <div className="mt-16 pt-8 border-t border-gray-100">
                        <p className="text-sm font-semibold text-gray-400 uppercase tracking-widest mb-6">Learn Technologies Used By Top Protocols</p>
                        <div className="flex flex-wrap justify-center gap-8 md:gap-16 opacity-50 grayscale hover:grayscale-0 transition-all duration-500">
                            {['Solidity', 'React', 'Next.js', 'Ethereum', 'Hardhat'].map((tech) => (
                                <span key={tech} className="text-xl font-bold text-gray-800 flex items-center gap-2">
                                    <Terminal className="w-5 h-5 text-indigo-600" /> {tech}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* --- Features Section --- */}
            <section className="py-24 bg-white relative">
                <div className="container mx-auto px-6">
                    <div className="text-center max-w-3xl mx-auto mb-16">
                        <h2 className="text-3xl md:text-4xl font-bold mb-4">Why BlockchainLMS?</h2>
                        <p className="text-gray-600 text-lg">We stripped away the fluff. Here is everything you need to go from zero to deployed dApp.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <FeatureCard 
                            icon={<Code2 className="w-8 h-8 text-white" />}
                            title="Interactive Labs"
                            desc="Don't just watch videos. Write real Solidity code and deploy smart contracts directly in our browser-based IDE."
                            color="bg-blue-500"
                        />
                        <FeatureCard 
                            icon={<BrainCircuit className="w-8 h-8 text-white" />}
                            title="AI Learning Paths"
                            desc="Not sure where to start? Our AI analyzes your goals and generates a custom curriculum just for you."
                            color="bg-indigo-500"
                        />
                        <FeatureCard 
                            icon={<Users className="w-8 h-8 text-white" />}
                            title="Community Driven"
                            desc="Stuck on a bug? Connect with instructors and peers in specific discussion boards for every module."
                            color="bg-violet-500"
                        />
                    </div>
                </div>
            </section>

            {/* --- Featured Courses Section --- */}
            <section id="courses" className="py-24 bg-gray-50 border-y border-gray-200">
                <div className="container mx-auto px-6">
                    <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-4">
                        <div>
                            <h2 className="text-3xl md:text-4xl font-bold mb-4">Featured Courses</h2>
                            <p className="text-gray-600">Explore the highest-rated content added this month.</p>
                        </div>
                        <Link href="/courses" className="text-indigo-600 font-semibold hover:text-indigo-800 flex items-center gap-1 group">
                            View All Catalog <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                        </Link>
                    </div>
                    
                    {isLoadingCourses ? (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="h-96 bg-gray-200 rounded-2xl animate-pulse"></div>
                            ))}
                        </div>
                    ) : featuredCourses.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {featuredCourses.map(course => <CourseCard key={course.id} course={course} />)}
                        </div>
                    ) : (
                        <div className="text-center py-12">
                            <p className="text-gray-500 text-lg">No courses available at the moment. Check back soon!</p>
                        </div>
                    )}
                </div>
            </section>

            {/* --- Trust/Security Section (Optional Filler) --- */}
            <section className="py-24 bg-white">
                <div className="container mx-auto px-6">
                    <div className="bg-indigo-900 rounded-3xl overflow-hidden shadow-2xl relative">
                         {/* Abstract Patterns */}
                         <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 bg-indigo-700 rounded-full blur-3xl opacity-50"></div>
                         <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 bg-blue-700 rounded-full blur-3xl opacity-50"></div>

                        <div className="relative z-10 p-12 md:p-20 text-center">
                            <ShieldCheck className="w-16 h-16 text-indigo-300 mx-auto mb-6" />
                            <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">
                                Ready to Build the Future?
                            </h2>
                            <p className="text-indigo-100 text-lg md:text-xl max-w-2xl mx-auto mb-10">
                                Join thousands of developers who are shifting their careers to Web3. 
                                Secure your spot in the next cohort.
                            </p>
                            <Link 
                                href="/signup" 
                                className="inline-block bg-white text-indigo-900 font-bold text-lg px-10 py-4 rounded-xl shadow-lg hover:bg-indigo-50 transition-all hover:scale-105"
                            >
                                Get Started for Free
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            {/* --- Footer --- */}
            <footer className="bg-gray-50 pt-16 pb-8 border-t border-gray-200">
                <div className="container mx-auto px-6">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
                        <div className="col-span-1 md:col-span-1">
                            <Image src="/logo5.png" alt="Logo" width={140} height={40} className="mb-6 opacity-90" />
                            <p className="text-gray-500 text-sm leading-relaxed">
                                Empowering the next generation of blockchain developers with world-class education and tools.
                            </p>
                        </div>
                        
                        <div>
                            <h4 className="font-bold text-gray-900 mb-4">Platform</h4>
                            <ul className="space-y-2 text-sm text-gray-600">
                                <li><Link href="/courses" className="hover:text-indigo-600">Catalog</Link></li>
                                <li><Link href="/pricing" className="hover:text-indigo-600">Pricing</Link></li>
                                <li><Link href="/instructors" className="hover:text-indigo-600">For Instructors</Link></li>
                            </ul>
                        </div>
                        
                        <div>
                            <h4 className="font-bold text-gray-900 mb-4">Resources</h4>
                            <ul className="space-y-2 text-sm text-gray-600">
                                <li><Link href="/blog" className="hover:text-indigo-600">Blog</Link></li>
                                <li><Link href="/docs" className="hover:text-indigo-600">Documentation</Link></li>
                                <li><Link href="/community" className="hover:text-indigo-600">Community</Link></li>
                            </ul>
                        </div>

                        <div>
                            <h4 className="font-bold text-gray-900 mb-4">Legal</h4>
                            <ul className="space-y-2 text-sm text-gray-600">
                                <li><Link href="/privacy" className="hover:text-indigo-600">Privacy Policy</Link></li>
                                <li><Link href="/terms" className="hover:text-indigo-600">Terms of Service</Link></li>
                            </ul>
                        </div>
                    </div>
                    
                    <div className="pt-8 border-t border-gray-200 text-center text-sm text-gray-400">
                        <p>&copy; {new Date().getFullYear()} BlockchainLMS. All Rights Reserved.</p>
                    </div>
                </div>
            </footer>
        </div>
    );
}

// Helper Component for Feature Cards to keep code clean
const FeatureCard = ({ icon, title, desc, color }: { icon: React.ReactNode, title: string, desc: string, color: string }) => (
    <div className="p-8 bg-gray-50 rounded-2xl border border-gray-100 hover:border-indigo-100 hover:bg-white hover:shadow-xl transition-all duration-300 group">
        <div className={`w-14 h-14 rounded-xl flex items-center justify-center mb-6 ${color} shadow-lg group-hover:scale-110 transition-transform`}>
            {icon}
        </div>
        <h3 className="text-xl font-bold text-gray-900 mb-3">{title}</h3>
        <p className="text-gray-600 leading-relaxed">{desc}</p>
    </div>
);