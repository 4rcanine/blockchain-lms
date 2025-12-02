// app/page.tsx
'use client';

import React, { useEffect, useState, useRef } from 'react';
import { collection, query, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '@/firebase/config';
import useAuth from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { 
  Code2, 
  Bot, 
  Users, 
  ArrowRight, 
  Layers, 
  Terminal, 
  ShieldCheck,
  Loader2,
  Cpu,
  Blocks
} from 'lucide-react';

// --- CONFIG: ADD YOUR CRYPTO PNG PATHS HERE ---
const CRYPTO_IMAGES = [
    '/btc.png', // Replace with your actual file names in the public folder
    '/eth.png',
    '/sol.png',
    '/usdt.png',
    '/doge.png',
    '/trx.png'
];

// --- Type Definitions ---
interface Course {
  id: string;
  title: string;
  description: string;
  tags: string[];
  imageUrl?: string;
}

// --- ANIMATION COMPONENT: Reveal on Scroll ---
const RevealOnScroll = ({ children, delay = 0 }: { children: React.ReactNode, delay?: number }) => {
    const [isVisible, setIsVisible] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsVisible(true);
                    observer.unobserve(entry.target);
                }
            },
            { threshold: 0.1 }
        );
        if (ref.current) observer.observe(ref.current);
        return () => observer.disconnect();
    }, []);

    return (
        <div 
            ref={ref} 
            className={`transition-all duration-1000 ease-out transform ${
                isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'
            }`}
            style={{ transitionDelay: `${delay}ms` }}
        >
            {children}
        </div>
    );
};

// --- ANIMATION COMPONENT: Floating Crypto Icons ---
const FloatingCryptoIcons = () => {
    const [icons, setIcons] = useState<{id: number, x: number, y: number, size: number, img: string, duration: number}[]>([]);

    useEffect(() => {
        const interval = setInterval(() => {
            // Add a new icon every 800ms to 2000ms
            const newIcon = {
                id: Date.now(),
                x: Math.random() * 90, 
                y: Math.random() * 80 + 10, 
                size: Math.random() * 40 + 30, 
                img: CRYPTO_IMAGES[Math.floor(Math.random() * CRYPTO_IMAGES.length)],
                duration: Math.random() * 3 + 4 
            };

            setIcons(prev => [...prev, newIcon]);

            // Remove icon after animation
            setTimeout(() => {
                setIcons(prev => prev.filter(i => i.id !== newIcon.id));
            }, newIcon.duration * 1000);

        }, 1500);

        return () => clearInterval(interval);
    }, []);

    return (
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
            {icons.map(icon => (
                <div
                    key={icon.id}
                    className="absolute opacity-0 animate-float-up"
                    style={{
                        left: `${icon.x}%`,
                        top: `${icon.y}%`,
                        width: `${icon.size}px`,
                        height: `${icon.size}px`,
                        animationDuration: `${icon.duration}s`
                    }}
                >
                    <Image 
                        src={icon.img} 
                        alt="crypto" 
                        width={60} 
                        height={60}
                        // UPDATED: Increased opacity here (was 40/20, now 90/60)
                        className="w-full h-full object-contain opacity-90 dark:opacity-60 drop-shadow-lg"
                    />
                </div>
            ))}
            
            <style jsx>{`
                @keyframes floatUp {
                    0% { transform: translateY(20px) scale(0.8) rotate(0deg); opacity: 0; }
                    /* UPDATED: Increased max opacity to 1 (was 0.6) */
                    20% { opacity: 1; transform: scale(1) rotate(10deg); }
                    80% { opacity: 1; }
                    100% { transform: translateY(-100px) scale(0.8) rotate(-10deg); opacity: 0; }
                }
                .animate-float-up {
                    animation-name: floatUp;
                    animation-timing-function: ease-in-out;
                    animation-fill-mode: forwards;
                }
            `}</style>
        </div>
    );
};

// --- Reusable Course Card ---
function CourseCard({ course }: { course: Course }) {
    return (
        <div className="group bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col overflow-hidden hover:-translate-y-1 h-full">
            <div className="relative h-48 overflow-hidden bg-gray-100 dark:bg-gray-700">
                {course.imageUrl ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img 
                        src={course.imageUrl} 
                        alt={course.title} 
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <Layers className="text-gray-300 dark:text-gray-600 w-12 h-12" />
                    </div>
                )}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />
            </div>
            
            <div className="p-6 flex flex-col flex-grow">
                <div className="flex flex-wrap gap-2 mb-3">
                    {course.tags.slice(0, 3).map(tag => (
                        <span 
                            key={tag} 
                            className="px-2.5 py-1 text-[10px] uppercase tracking-wider font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-900/30 rounded-full border border-indigo-100 dark:border-indigo-800/50"
                        >
                            {tag}
                        </span>
                    ))}
                </div>
                
                <h3 className="font-bold text-xl mb-2 text-gray-900 dark:text-white line-clamp-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                    {course.title}
                </h3>
                
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-6 flex-grow line-clamp-3 leading-relaxed">
                    {course.description}
                </p>
                
                <Link 
                    href={`/courses/${course.id}`} 
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-semibold text-sm group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300 mt-auto"
                >
                    View Course <ArrowRight className="w-4 h-4" />
                </Link>
            </div>
        </div>
    );
}

// --- Helper Component for Feature Cards ---
function FeatureCard({ icon, title, desc, color, gradient }: { icon: React.ReactNode, title: string, desc: string, color: string, gradient: string }) {
    return (
        <div className="p-8 bg-gray-50 dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 hover:border-indigo-200 dark:hover:border-indigo-500/50 hover:bg-white dark:hover:bg-gray-800 hover:shadow-xl transition-all duration-300 group relative overflow-hidden h-full">
            <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${gradient} opacity-10 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110`} />
            
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 bg-gradient-to-br ${gradient} shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                {icon}
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">{title}</h3>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed">{desc}</p>
        </div>
    );
}

// --- Main Landing Page Component ---
export default function LandingPage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const [featuredCourses, setFeaturedCourses] = useState<Course[]>([]);
    const [isLoadingCourses, setIsLoadingCourses] = useState(true);

    useEffect(() => {
        if (!authLoading) {
            if (user) {
                router.push('/dashboard');
            } else {
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

    if (authLoading || (user && !authLoading)) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 dark:bg-gray-900">
                <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
                <p className="mt-4 text-gray-500 dark:text-gray-400 font-medium">Initializing connection...</p>
            </div>
        );
    }

    return (
        <div className="bg-slate-50 dark:bg-gray-900 text-gray-900 dark:text-white selection:bg-indigo-500 selection:text-white transition-colors duration-300 overflow-x-hidden">
            
            {/* --- Hero Section --- */}
            <section className="relative pt-32 pb-20 lg:pt-40 lg:pb-32 overflow-hidden">
                {/* Cyber Grid Background */}
                <div className="absolute inset-0 z-0 opacity-30 dark:opacity-20 pointer-events-none" 
                     style={{ 
                         backgroundImage: `radial-gradient(#6366f1 1px, transparent 1px), radial-gradient(#6366f1 1px, transparent 1px)`, 
                         backgroundSize: '40px 40px', 
                         backgroundPosition: '0 0, 20px 20px' 
                     }}>
                </div>
                
                {/* FLOATING CRYPTO ICONS LAYER */}
                <FloatingCryptoIcons />

                {/* Glowing Orbs */}
                <div className="absolute top-20 left-1/4 w-96 h-96 bg-indigo-500/30 rounded-full blur-3xl pointer-events-none animate-pulse" />
                <div className="absolute bottom-20 right-1/4 w-96 h-96 bg-purple-500/30 rounded-full blur-3xl pointer-events-none animate-pulse" style={{ animationDelay: '1s' }} />

                <div className="container mx-auto px-6 relative z-10 text-center">
                    
                    {/* Animate In: Badge */}
                    <div className="animate-in slide-in-from-bottom-8 fade-in duration-700">
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/80 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 text-sm font-semibold mb-8 backdrop-blur-sm shadow-sm">
                            <span className="flex h-2 w-2 relative">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                            </span>
                            <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                                Web3 Learning Reimagined
                            </span>
                        </div>
                    </div>

                    {/* Animate In: Title */}
                    <div className="animate-in slide-in-from-bottom-8 fade-in duration-1000 delay-150">
                        <h1 className="text-5xl md:text-7xl font-black tracking-tight mb-6 leading-tight">
                            Build the Future on <br />
                            <span className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 bg-clip-text text-transparent drop-shadow-sm">
                                The Blockchain
                            </span>
                        </h1>
                    </div>
                    
                    {/* Animate In: Description */}
                    <div className="animate-in slide-in-from-bottom-8 fade-in duration-1000 delay-300">
                        <p className="mt-6 text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto leading-relaxed">
                            An interactive, community-driven platform to master smart contracts, dApps, and blockchain architecture.
                        </p>
                    </div>
                    
                    {/* Animate In: Buttons */}
                    <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center items-center animate-in slide-in-from-bottom-8 fade-in duration-1000 delay-500">
                        <Link href="/signup" className="px-8 py-4 bg-indigo-600 text-white rounded-xl font-bold text-lg shadow-lg shadow-indigo-500/30 hover:bg-indigo-700 hover:shadow-indigo-500/50 transition-all transform hover:-translate-y-1">
                            Get Started Free
                        </Link>
                        <Link href="#courses" className="px-8 py-4 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-700 rounded-xl font-bold text-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-all">
                            Explore Catalog
                        </Link>
                    </div>

                    {/* Tech Stack Strip */}
                    <div className="mt-20 pt-10 border-t border-gray-200 dark:border-gray-800 animate-in fade-in duration-1000 delay-700">
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-8">Powered By Modern Tech</p>
                        <div className="flex flex-wrap justify-center gap-8 md:gap-16 opacity-60 dark:opacity-50 grayscale hover:grayscale-0 transition-all duration-500">
                            {['Ethereum', 'Solidity', 'Next.js', 'Hardhat', 'IPFS'].map((tech) => (
                                <span key={tech} className="text-lg font-bold flex items-center gap-2 text-gray-800 dark:text-gray-200">
                                    <Blocks className="w-5 h-5 text-indigo-500" /> {tech}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* --- Features Section --- */}
            <section className="py-24 bg-white dark:bg-gray-950 relative">
                <div className="container mx-auto px-6">
                    <RevealOnScroll>
                        <div className="text-center max-w-3xl mx-auto mb-16">
                            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-gray-900 dark:text-white">Why BlockchainLMS?</h2>
                            <p className="text-gray-600 dark:text-gray-400 text-lg">
                                Traditional learning is static. We made it dynamic, interactive, and intelligent.
                            </p>
                        </div>
                    </RevealOnScroll>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {/* CARD 1: Interactive Labs */}
                        <RevealOnScroll delay={100}>
                            <FeatureCard 
                                icon={<Code2 className="w-8 h-8 text-white" />}
                                title="Interactive Labs"
                                desc="Don't just watch videos. Write real Solidity code and deploy smart contracts directly in our browser-based IDE."
                                color="bg-blue-500"
                                gradient="from-blue-500 to-cyan-500"
                            />
                        </RevealOnScroll>
                        
                        {/* CARD 2: AI Assistant */}
                        <RevealOnScroll delay={200}>
                            <FeatureCard 
                                icon={<Bot className="w-8 h-8 text-white" />}
                                title="AI Assistant"
                                desc="Stuck on a bug? Our AI-powered mentor is available 24/7 to debug code and explain complex concepts."
                                color="bg-indigo-500"
                                gradient="from-indigo-500 to-purple-500"
                            />
                        </RevealOnScroll>

                        {/* CARD 3: Community Driven */}
                        <RevealOnScroll delay={300}>
                            <FeatureCard 
                                icon={<Users className="w-8 h-8 text-white" />}
                                title="Community Driven"
                                desc="Stuck on a bug? Connect with instructors and peers in specific discussion boards for every module."
                                color="bg-violet-500"
                                gradient="from-violet-500 to-fuchsia-500"
                            />
                        </RevealOnScroll>
                    </div>
                </div>
            </section>

            {/* --- Featured Courses Section --- */}
            <section id="courses" className="py-24 bg-slate-50 dark:bg-gray-900 border-y border-gray-200 dark:border-gray-800">
                <div className="container mx-auto px-6">
                    <RevealOnScroll>
                        <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-4">
                            <div>
                                <h2 className="text-3xl md:text-4xl font-bold mb-4 text-gray-900 dark:text-white">Featured Courses</h2>
                                <p className="text-gray-600 dark:text-gray-400">Curated content to fast-track your Web3 career.</p>
                            </div>
                            <Link href="/courses" className="text-indigo-600 dark:text-indigo-400 font-semibold hover:text-indigo-800 dark:hover:text-indigo-300 flex items-center gap-1 group transition-colors">
                                View All Catalog <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                            </Link>
                        </div>
                    </RevealOnScroll>
                    
                    {isLoadingCourses ? (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="h-96 bg-gray-200 dark:bg-gray-800 rounded-2xl animate-pulse"></div>
                            ))}
                        </div>
                    ) : featuredCourses.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {featuredCourses.map((course, index) => (
                                <RevealOnScroll key={course.id} delay={index * 100}>
                                    <CourseCard course={course} />
                                </RevealOnScroll>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-12">
                            <p className="text-gray-500 dark:text-gray-400 text-lg">No courses available at the moment. Check back soon!</p>
                        </div>
                    )}
                </div>
            </section>

            {/* --- CTA / Future Section --- */}
            <section className="py-24 bg-white dark:bg-gray-950 overflow-hidden">
                <div className="container mx-auto px-6">
                    <RevealOnScroll>
                        <div className="relative bg-gray-900 dark:bg-gray-800 rounded-3xl overflow-hidden shadow-2xl">
                            {/* Abstract Cyber Elements */}
                            <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 bg-indigo-600 rounded-full blur-[100px] opacity-40"></div>
                            <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-96 h-96 bg-cyan-600 rounded-full blur-[100px] opacity-30"></div>
                            
                            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>

                            <div className="relative z-10 p-12 md:p-24 text-center">
                                <div className="inline-flex p-3 bg-white/10 rounded-2xl mb-6 backdrop-blur-sm border border-white/10">
                                    <ShieldCheck className="w-12 h-12 text-indigo-300" />
                                </div>
                                <h2 className="text-4xl md:text-6xl font-black text-white mb-6 tracking-tight">
                                    Ready to Build the Future?
                                </h2>
                                <p className="text-indigo-100 text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
                                    Join thousands of developers who are shifting their careers to Web3. 
                                    Secure your spot in the next cohort.
                                </p>
                                <Link 
                                    href="/signup" 
                                    className="inline-flex items-center gap-2 bg-white text-indigo-900 font-bold text-lg px-10 py-4 rounded-xl shadow-xl hover:bg-indigo-50 transition-all hover:scale-105"
                                >
                                    <Cpu className="w-5 h-5" /> Start Building
                                </Link>
                            </div>
                        </div>
                    </RevealOnScroll>
                </div>
            </section>

            {/* --- Footer --- */}
            <footer className="bg-slate-50 dark:bg-gray-900 pt-16 pb-8 border-t border-gray-200 dark:border-gray-800">
                <div className="container mx-auto px-6">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
                        <div className="col-span-1 md:col-span-1">
                            <Image src="/logo5.png" alt="Logo" width={140} height={40} className="mb-6 opacity-90 dark:invert" />
                            <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed">
                                Empowering the next generation of blockchain developers with world-class education and tools.
                            </p>
                        </div>
                        
                        <div>
                            <h4 className="font-bold text-gray-900 dark:text-white mb-4">Platform</h4>
                            <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                                <li><Link href="/courses" className="hover:text-indigo-600 dark:hover:text-indigo-400">Catalog</Link></li>
                                <li><Link href="/pricing" className="hover:text-indigo-600 dark:hover:text-indigo-400">Pricing</Link></li>
                                <li><Link href="/instructors" className="hover:text-indigo-600 dark:hover:text-indigo-400">For Instructors</Link></li>
                            </ul>
                        </div>
                        
                        <div>
                            <h4 className="font-bold text-gray-900 dark:text-white mb-4">Resources</h4>
                            <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                                <li><Link href="/blog" className="hover:text-indigo-600 dark:hover:text-indigo-400">Blog</Link></li>
                                <li><Link href="/docs" className="hover:text-indigo-600 dark:hover:text-indigo-400">Documentation</Link></li>
                                <li><Link href="/community" className="hover:text-indigo-600 dark:hover:text-indigo-400">Community</Link></li>
                            </ul>
                        </div>

                        <div>
                            <h4 className="font-bold text-gray-900 dark:text-white mb-4">Legal</h4>
                            <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                                <li><Link href="/privacy" className="hover:text-indigo-600 dark:hover:text-indigo-400">Privacy Policy</Link></li>
                                <li><Link href="/terms" className="hover:text-indigo-600 dark:hover:text-indigo-400">Terms of Service</Link></li>
                            </ul>
                        </div>
                    </div>
                    
                    <div className="pt-8 border-t border-gray-200 dark:border-gray-800 text-center text-sm text-gray-400 dark:text-gray-500">
                        <p>&copy; {new Date().getFullYear()} BlockchainLMS. All Rights Reserved.</p>
                    </div>
                </div>
            </footer>
        </div>
    );
}