'use client';

import { useEffect, useState } from 'react';
import { 
    collection, 
    query, 
    where, 
    orderBy, 
    getDocs,
    getDoc, 
    addDoc, 
    updateDoc, 
    deleteDoc, 
    serverTimestamp, 
    doc 
} from 'firebase/firestore';
import { db } from '@/firebase/config';
import useAuth from '@/hooks/useAuth';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import ImageUploader from '@/components/ImageUploader';
import BackButton from '@/components/BackButton'; // 1. Import BackButton
import { 
    MessageSquare, 
    Send, 
    Reply, 
    Loader2, 
    User, 
    Image as ImageIcon, 
    X, 
    Pencil, 
    Trash2, 
    MoreHorizontal
} from 'lucide-react';

// --- Type Definitions ---
interface Post { 
    id: string; 
    text: string; 
    imageUrl?: string; 
    authorId: string; 
    createdAt: any; 
    isReplyTo: string | null; 
}

interface UserProfile { 
    uid: string; 
    displayName?: string; 
    photoURL?: string; 
    email: string; 
}

// --- Post Form Component ---
const PostForm = ({ 
    courseId, 
    moduleId, 
    isReplyTo = null, 
    onPostCreated,
    onCancelReply
}: { 
    courseId: string; 
    moduleId: string; 
    isReplyTo?: string | null; 
    onPostCreated: () => void;
    onCancelReply?: () => void;
}) => {
    const { user } = useAuth();
    const [text, setText] = useState('');
    const [imageUrl, setImageUrl] = useState(''); 
    const [showImageUpload, setShowImageUpload] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if ((!text.trim() && !imageUrl) || !user) return;
        
        setIsSubmitting(true);
        try {
            await addDoc(collection(db, 'courses', courseId, 'modules', moduleId, 'discussionPosts'), {
                text: text.trim(),
                imageUrl: imageUrl || null,
                authorId: user.uid,
                createdAt: serverTimestamp(),
                isReplyTo: isReplyTo,
            });
            setText('');
            setImageUrl('');
            setShowImageUpload(false);
            onPostCreated();
            if (onCancelReply) onCancelReply();
        } catch (error) {
            console.error("Failed to create post:", error);
        } finally {
            setIsSubmitting(false);
        }
    };
    
    return (
        <div className="mt-4 relative animate-in fade-in slide-in-from-top-2">
            <form onSubmit={handleSubmit}>
                <textarea 
                    value={text} 
                    onChange={e => setText(e.target.value)} 
                    placeholder={isReplyTo ? "Write a reply..." : "Start a new discussion..."} 
                    className="w-full p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 resize-none shadow-sm" 
                    rows={isReplyTo ? 3 : 4} 
                />

                {/* Image Preview Area */}
                {imageUrl && (
                    <div className="mt-3 relative w-fit">
                        <img src={imageUrl} alt="Upload preview" className="h-32 w-auto rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm" />
                        <button 
                            type="button" 
                            onClick={() => setImageUrl('')} 
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 shadow-md transition-colors"
                        >
                            <X className="w-3 h-3" />
                        </button>
                    </div>
                )}

                {/* Image Uploader Toggle */}
                {showImageUpload && !imageUrl && (
                    <div className="mt-3 p-4 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-lg">
                        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">Upload Image</p>
                        <ImageUploader onUploadComplete={(url) => { setImageUrl(url); setShowImageUpload(false); }} />
                    </div>
                )}

                <div className="flex justify-between items-center mt-3">
                    <div className="flex gap-2">
                         <button 
                            type="button"
                            onClick={() => setShowImageUpload(!showImageUpload)}
                            className={`p-2 rounded-lg transition-colors ${showImageUpload ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400' : 'text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                            title="Add Image"
                         >
                            <ImageIcon className="w-5 h-5" />
                         </button>
                    </div>

                    <div className="flex gap-2">
                        {isReplyTo && (
                            <button 
                                type="button" 
                                onClick={onCancelReply} 
                                className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                            >
                                Cancel
                            </button>
                        )}
                        <button 
                            type="submit" 
                            disabled={isSubmitting || (!text.trim() && !imageUrl)} 
                            className="flex items-center gap-2 px-6 py-2 font-semibold text-white bg-indigo-600 rounded-lg shadow-md hover:bg-indigo-700 transition-all disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:cursor-not-allowed active:scale-95"
                        >
                            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                            {isSubmitting ? 'Posting...' : 'Post'}
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
};

// --- Discussion Post Component ---
const DiscussionPost = ({ 
    post, 
    author, 
    allPosts, 
    usersMap, 
    courseId, 
    moduleId, 
    onPostCreated 
}: { 
    post: Post; 
    author?: UserProfile; 
    allPosts: Post[]; 
    usersMap: Map<string, UserProfile>; 
    courseId: string; 
    moduleId: string; 
    onPostCreated: () => void; 
}) => {
    const { user } = useAuth();
    const [showReplyForm, setShowReplyForm] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editText, setEditText] = useState(post.text);
    const [isSavingEdit, setIsSavingEdit] = useState(false);
    
    const replies = allPosts
        .filter(p => p.isReplyTo === post.id)
        .sort((a, b) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0));

    const isOwner = user?.uid === post.authorId;

    // --- Handle Edit ---
    const handleUpdatePost = async () => {
        if (!editText.trim()) return;
        setIsSavingEdit(true);
        try {
            const postRef = doc(db, 'courses', courseId, 'modules', moduleId, 'discussionPosts', post.id);
            await updateDoc(postRef, { text: editText.trim() });
            setIsEditing(false);
            onPostCreated(); // Refresh list
        } catch (error) {
            console.error("Error updating post:", error);
        } finally {
            setIsSavingEdit(false);
        }
    };

    // --- Handle Delete ---
    const handleDeletePost = async () => {
        if (!window.confirm("Are you sure you want to delete this post?")) return;
        try {
            const postRef = doc(db, 'courses', courseId, 'modules', moduleId, 'discussionPosts', post.id);
            await deleteDoc(postRef);
            onPostCreated(); // Refresh list
        } catch (error) {
            console.error("Error deleting post:", error);
        }
    };

    return (
        <div className="flex gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* Profile Picture */}
            <Link href={`/users/${post.authorId}`} className="flex-shrink-0 group h-fit">
                {author?.photoURL ? (
                    <img 
                        src={author.photoURL} 
                        alt={author.displayName || 'Profile'} 
                        className="h-10 w-10 rounded-full object-cover ring-2 ring-gray-100 dark:ring-gray-700 group-hover:ring-indigo-500 transition-all" 
                    />
                ) : (
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold ring-2 ring-gray-100 dark:ring-gray-700 group-hover:ring-indigo-500 transition-all shadow-sm">
                        {author?.email?.[0].toUpperCase() || <User className="w-5 h-5" />}
                    </div>
                )}
            </Link>

            {/* Post Content */}
            <div className="flex-grow min-w-0">
                <div className="bg-white dark:bg-gray-800 p-5 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-sm hover:shadow-md transition-shadow relative group/post">
                    
                    {/* Header: Name + Date + Actions */}
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2 overflow-hidden">
                            <Link 
                                href={`/users/${post.authorId}`} 
                                className="font-bold text-gray-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 hover:underline transition-colors truncate text-sm sm:text-base"
                            >
                                {author?.displayName || author?.email}
                            </Link>
                            <span className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">
                                • {post.createdAt ? new Date(post.createdAt.seconds * 1000).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                            </span>
                        </div>

                        {/* Edit/Delete Actions (Only for Owner) */}
                        {isOwner && !isEditing && (
                            <div className="flex items-center gap-1 opacity-0 group-hover/post:opacity-100 transition-opacity">
                                <button 
                                    onClick={() => setIsEditing(true)} 
                                    className="p-1.5 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                                    title="Edit"
                                >
                                    <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button 
                                    onClick={handleDeletePost} 
                                    className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-colors"
                                    title="Delete"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        )}
                    </div>
                    
                    {/* Body Text / Edit Form */}
                    {isEditing ? (
                        <div className="mt-2">
                            <textarea 
                                value={editText}
                                onChange={(e) => setEditText(e.target.value)}
                                className="w-full p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                                rows={3}
                            />
                            <div className="flex justify-end gap-2 mt-2">
                                <button 
                                    onClick={() => setIsEditing(false)} 
                                    className="px-3 py-1 text-xs font-medium text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
                                >
                                    Cancel
                                </button>
                                <button 
                                    onClick={handleUpdatePost} 
                                    disabled={isSavingEdit}
                                    className="px-3 py-1 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-md disabled:opacity-50"
                                >
                                    {isSavingEdit ? 'Saving...' : 'Save'}
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed text-sm sm:text-base">
                                {post.text}
                            </p>
                            
                            {/* Display Image if Exists */}
                            {post.imageUrl && (
                                <div className="mt-3">
                                    <img 
                                        src={post.imageUrl} 
                                        alt="Post attachment" 
                                        className="max-h-80 rounded-lg border border-gray-100 dark:border-gray-700 shadow-sm"
                                    />
                                </div>
                            )}
                        </div>
                    )}
                </div>
                
                {/* Reply Button */}
                {!isEditing && (
                    <button 
                        onClick={() => setShowReplyForm(!showReplyForm)} 
                        className={`text-xs font-semibold mt-2 ml-2 flex items-center gap-1 transition-colors ${showReplyForm ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400'}`}
                    >
                        <Reply className="w-3 h-3" />
                        {showReplyForm ? 'Cancel Reply' : 'Reply'}
                    </button>
                )}

                {/* Reply Form */}
                {showReplyForm && (
                    <div className="ml-2 mt-2 pl-4 border-l-2 border-indigo-100 dark:border-indigo-900/50">
                        <PostForm 
                            courseId={courseId} 
                            moduleId={moduleId} 
                            isReplyTo={post.id} 
                            onPostCreated={() => { setShowReplyForm(false); onPostCreated(); }} 
                            onCancelReply={() => setShowReplyForm(false)}
                        />
                    </div>
                )}
                
                {/* Nested Replies */}
                {replies.length > 0 && (
                    <div className="mt-6 space-y-6 ml-2 pl-4 sm:pl-6 border-l-2 border-gray-100 dark:border-gray-800">
                        {replies.map(reply => (
                            <DiscussionPost 
                                key={reply.id} 
                                post={reply} 
                                author={usersMap.get(reply.authorId)} 
                                allPosts={allPosts} 
                                usersMap={usersMap} 
                                courseId={courseId} 
                                moduleId={moduleId} 
                                onPostCreated={onPostCreated} 
                            />
                        ))}
                    </div>
                )}
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
            // 1. Fetch Posts
            const postsQuery = query(collection(db, 'courses', courseId, 'modules', moduleId, 'discussionPosts'), orderBy('createdAt', 'desc'));
            const postsSnapshot = await getDocs(postsQuery);
            const postsList = postsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Post[];
            setPosts(postsList);

            // 2. Fetch Authors
            const authorIds = [...new Set(postsList.map(p => p.authorId))];
            if (authorIds.length > 0) {
                const usersData = new Map<string, UserProfile>();
                
                await Promise.all(authorIds.map(async (uid) => {
                    try {
                        const userSnap = await getDoc(doc(db, 'users', uid));
                        if (userSnap.exists()) {
                            usersData.set(uid, { uid: uid, ...userSnap.data() } as UserProfile);
                        }
                    } catch (e) {
                        console.error("Skipping user fetch for", uid, e);
                    }
                }));
                
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

    if (loading) return (
        <div className="flex justify-center items-center h-[50vh]">
            <div className="flex flex-col items-center gap-2">
                <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                <p className="text-gray-500 dark:text-gray-400 text-sm">Loading discussions...</p>
            </div>
        </div>
    );

    return (
        <div className="max-w-4xl mx-auto pt-12 pb-20 px-4">
            {/* 2. Added BackButton Here */}
            <BackButton />

            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                    <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                        <MessageSquare className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    Discussion Board
                </h1>
                <p className="text-gray-500 dark:text-gray-400 mt-2 ml-1">
                    Share your thoughts, ask questions, and interact with peers.
                </p>
            </div>
            
            {/* Main Content */}
            <div className="p-6 md:p-8 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-inner">
                <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Start a New Topic</h2>
                <PostForm courseId={courseId} moduleId={moduleId} onPostCreated={fetchData} />
                
                <div className="my-10 border-t border-gray-200 dark:border-gray-800" />
                
                {topLevelPosts.length === 0 ? (
                    <div className="text-center py-12">
                        <div className="w-16 h-16 bg-gray-200 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                            <MessageSquare className="w-8 h-8 text-gray-400 dark:text-gray-600" />
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white">No posts yet</h3>
                        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Be the first to start the conversation!</p>
                    </div>
                ) : (
                    <div className="space-y-8">
                        {topLevelPosts.map(post => (
                            <DiscussionPost 
                                key={post.id} 
                                post={post} 
                                author={usersMap.get(post.authorId)} 
                                allPosts={posts} 
                                usersMap={usersMap} 
                                courseId={courseId} 
                                moduleId={moduleId} 
                                onPostCreated={fetchData} 
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}