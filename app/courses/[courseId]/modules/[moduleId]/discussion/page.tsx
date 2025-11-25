// app/courses/[courseId]/modules/[moduleId]/discussion/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { collection, query, where, orderBy, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/firebase/config';
import useAuth from '@/hooks/useAuth';
import { useParams } from 'next/navigation';
import Link from 'next/link';

// --- Type Definitions ---
interface Post { id: string; text: string; authorId: string; createdAt: any; isReplyTo: string | null; }
interface UserProfile { uid: string; displayName?: string; photoURL?: string; email: string; }

// --- Post Form Component ---
const PostForm = ({ courseId, moduleId, isReplyTo = null, onPostCreated }: { courseId: string; moduleId: string; isReplyTo?: string | null; onPostCreated: () => void; }) => {
    const { user } = useAuth();
    const [text, setText] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!text.trim() || !user) return;
        setIsSubmitting(true);
        try {
            await addDoc(collection(db, 'courses', courseId, 'modules', moduleId, 'discussionPosts'), {
                text: text.trim(),
                authorId: user.uid,
                createdAt: serverTimestamp(),
                isReplyTo: isReplyTo,
            });
            setText('');
            onPostCreated();
        } catch (error) {
            console.error("Failed to create post:", error);
        } finally {
            setIsSubmitting(false);
        }
    };
    return (
        <form onSubmit={handleSubmit} className="mt-4">
            <textarea value={text} onChange={e => setText(e.target.value)} placeholder={isReplyTo ? "Write a reply..." : "Start a new discussion..."} className="w-full p-3 border rounded-md" rows={isReplyTo ? 3 : 5} />
            <div className="text-right mt-2">
                <button type="submit" disabled={isSubmitting} className="px-5 py-2 font-semibold text-white bg-indigo-600 rounded-lg shadow-md hover:bg-indigo-700 transition disabled:bg-gray-400">
                    {isSubmitting ? 'Posting...' : 'Post'}
                </button>
            </div>
        </form>
    );
};


// --- Discussion Post Component ---
const DiscussionPost = ({ post, author, allPosts, usersMap, courseId, moduleId, onPostCreated }: { post: Post; author?: UserProfile; allPosts: Post[]; usersMap: Map<string, UserProfile>; courseId: string; moduleId: string; onPostCreated: () => void; }) => {
    const [showReplyForm, setShowReplyForm] = useState(false);
    const replies = allPosts.filter(p => p.isReplyTo === post.id).sort((a, b) => a.createdAt?.seconds - b.createdAt?.seconds);

    return (
        <div className="flex gap-4">
            {/* Profile Picture */}
            <div className="flex-shrink-0">
                {author?.photoURL ? (
                    <img src={author.photoURL} alt={author.displayName || 'Profile'} className="h-10 w-10 rounded-full object-cover" />
                ) : (
                    <div className="h-10 w-10 rounded-full bg-indigo-500 flex items-center justify-center text-white font-bold">
                        {author?.email?.[0].toUpperCase()}
                    </div>
                )}
            </div>
            {/* Post Content */}
            <div className="flex-grow">
                <div className="bg-white p-4 border rounded-lg shadow-sm">
                    <p className="font-bold">{author?.displayName || author?.email}</p>
                    <p className="text-xs text-gray-500 mb-2">{post.createdAt ? new Date(post.createdAt.seconds * 1000).toLocaleString() : 'Just now'}</p>
                    <p className="text-gray-800 whitespace-pre-wrap">{post.text}</p>
                </div>
                <button onClick={() => setShowReplyForm(!showReplyForm)} className="text-sm font-semibold text-indigo-600 hover:underline mt-2 ml-2">
                    {showReplyForm ? 'Cancel' : 'Reply'}
                </button>

                {showReplyForm && <PostForm courseId={courseId} moduleId={moduleId} isReplyTo={post.id} onPostCreated={() => { setShowReplyForm(false); onPostCreated(); }} />}
                
                {/* Replies */}
                <div className="mt-4 space-y-4">
                    {replies.map(reply => (
                        <DiscussionPost key={reply.id} post={reply} author={usersMap.get(reply.authorId)} allPosts={allPosts} usersMap={usersMap} courseId={courseId} moduleId={moduleId} onPostCreated={onPostCreated} />
                    ))}
                </div>
            </div>
        </div>
    );
};

// --- Main Page ---
export default function DiscussionPage() {
    const params = useParams();
    const courseId = params.courseId as string;
    const moduleId = params.moduleId as string;

    const [posts, setPosts] = useState<Post[]>([]);
    const [usersMap, setUsersMap] = useState<Map<string, UserProfile>>(new Map());
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        try {
            const postsQuery = query(collection(db, 'courses', courseId, 'modules', moduleId, 'discussionPosts'), orderBy('createdAt', 'desc'));
            const postsSnapshot = await getDocs(postsQuery);
            const postsList = postsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Post[];
            setPosts(postsList);

            const authorIds = [...new Set(postsList.map(p => p.authorId))];
            if (authorIds.length > 0) {
                const usersQuery = query(collection(db, 'users'), where('__name__', 'in', authorIds));
                const usersSnapshot = await getDocs(usersQuery);
                const usersData = new Map<string, UserProfile>();
                usersSnapshot.docs.forEach(doc => usersData.set(doc.id, { uid: doc.id, ...doc.data() } as UserProfile));
                setUsersMap(usersData);
            }
        } catch (error) {
            console.error("Failed to fetch discussion:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (courseId && moduleId) {
            fetchData();
        }
    }, [courseId, moduleId]);

    const topLevelPosts = posts.filter(p => !p.isReplyTo);

    if (loading) return <p>Loading discussion...</p>;

    return (
        <div>
            <h1 className="text-3xl font-bold mb-6">Discussion Board</h1>
            <div className="p-6 bg-gray-100 rounded-lg">
                <h2 className="text-xl font-semibold">Start a New Topic</h2>
                <PostForm courseId={courseId} moduleId={moduleId} onPostCreated={fetchData} />
                <hr className="my-8" />
                <div className="space-y-6">
                    {topLevelPosts.map(post => (
                        <DiscussionPost key={post.id} post={post} author={usersMap.get(post.authorId)} allPosts={posts} usersMap={usersMap} courseId={courseId} moduleId={moduleId} onPostCreated={fetchData} />
                    ))}
                </div>
            </div>
        </div>
    );
}