import { useState, useEffect } from 'react';
import { X, Trash2, MapPin, Calendar, Archive } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { PostService } from '../services/PostService';
import { AuthService } from '../services/AuthService';
import type { Post } from '../types/categories';
import { getTimeAgo } from '../types/categories';

interface MyPostsModalProps {
    onClose: () => void;
    onShowConfirm: (title: string, message: string, onConfirm: () => void) => void;
    onShowToast: (message: string, type: 'success' | 'error') => void;
}

export default function MyPostsModal({ onClose, onShowConfirm, onShowToast }: MyPostsModalProps) {
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);

    const currentUser = AuthService.getCurrentUser();

    useEffect(() => {
        loadPosts();
    }, []);

    const loadPosts = async () => {
        if (!currentUser) return;
        setLoading(true);
        try {
            const allPosts = await PostService.getAllPosts();
            const myPosts = allPosts.filter(p => p.userId === currentUser.id);
            // Sort by newest first
            myPosts.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
            setPosts(myPosts);
        } catch (error) {
            console.error(error);
            onShowToast('Failed to load posts', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = (postId: number) => {
        onShowConfirm(
            'Delete Post',
            'Are you sure you want to delete this post? This action cannot be undone.',
            async () => {
                try {
                    await PostService.deletePost(postId);
                    setPosts(prev => prev.filter(p => p.id !== postId));
                    onShowToast('Post deleted successfully', 'success');
                } catch (error) {
                    onShowToast('Failed to delete post', 'error');
                }
            }
        );
    };

    return (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-surface border border-border w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden max-h-[80vh] flex flex-col"
            >
                {/* Header */}
                <div className="p-4 border-b border-white/10 flex justify-between items-center bg-surface/50">
                    <div className="flex items-center gap-2">
                        <Archive className="w-5 h-5 text-primary" />
                        <h2 className="font-bold text-lg text-text">My Posts</h2>
                        <span className="bg-primary/10 px-2 py-0.5 rounded-full text-xs font-medium text-primary">
                            {posts.length}
                        </span>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition"
                    >
                        <X className="w-5 h-5 text-muted hover:text-text" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {loading ? (
                        <div className="text-center py-10 text-muted">Loading your posts...</div>
                    ) : posts.length === 0 ? (
                        <div className="text-center py-10">
                            <p className="text-muted mb-2">You haven't posted anything yet.</p>
                            <button onClick={onClose} className="text-primary text-sm hover:underline">
                                Go create a post
                            </button>
                        </div>
                    ) : (
                        <AnimatePresence>
                            {posts.map(post => (
                                <motion.div
                                    key={post.id}
                                    layout
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="bg-black/5 dark:bg-white/5 border border-border rounded-xl p-3 flex gap-3 hover:border-primary/30 transition group"
                                >
                                    {/* Image Thumbnail */}
                                    <div className="w-16 h-16 rounded-lg bg-gray-200 dark:bg-gray-800 overflow-hidden flex-shrink-0">
                                        {post.imageUrl ? (
                                            <img src={post.imageUrl} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-lg">
                                                📦
                                            </div>
                                        )}
                                    </div>

                                    {/* info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-start">
                                            <h3 className="font-semibold text-text truncate pr-2">{post.title}</h3>
                                            <span className={`text-[10px] px-1.5 py-0.5 rounded border ${post.type === 'LOST'
                                                ? 'border-red-500/30 text-red-600 dark:text-red-400 bg-red-500/10'
                                                : 'border-green-500/30 text-green-600 dark:text-green-400 bg-green-500/10'
                                                }`}>
                                                {post.type}
                                            </span>
                                        </div>
                                        <p className="text-xs text-muted truncate mt-0.5">{post.description}</p>

                                        <div className="flex items-center gap-3 mt-2 text-[10px] text-muted">
                                            <span className="flex items-center gap-1">
                                                <Calendar className="w-3 h-3" />
                                                {getTimeAgo(post.timestamp)}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <MapPin className="w-3 h-3" />
                                                {post.location.name}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex flex-col justify-center pl-2 border-l border-border">
                                        <button
                                            onClick={() => handleDelete(post.id)}
                                            className="p-2 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition"
                                            title="Delete Post"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    )}
                </div>
            </motion.div>
        </div>
    );
}
