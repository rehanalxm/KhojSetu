import { useState, useEffect } from 'react';
import { Shield, Trash2, X, Users, Image as ImageIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { PostService } from '../services/PostService';
import { AuthService } from '../services/AuthService';
import type { Post } from '../types/categories';
import type { User } from '../types/auth';
import { getTimeAgo } from '../types/categories';

interface AdminPanelProps {
    onClose: () => void;
    onShowToast: (message: string, type: 'success' | 'error') => void;
    onShowConfirm: (title: string, message: string, onConfirm: () => void) => void;
    currentUser: User | null;
}

export default function AdminPanel({ onClose, onShowToast, onShowConfirm, currentUser }: AdminPanelProps) {
    const [activeTab, setActiveTab] = useState<'posts' | 'users'>('posts');
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);

    // Local mock state for users since we don't have a public get-all-users route easily available for mock mode
    // In a real app with Supabase, you would create an admin RPC function to get users. For this showcase, 
    // we'll rely on the posts data to find unique users, or a specialized RPC if needed. 
    // Since we need to delete fake IDs, let's load all posts and extract unique users from there for the UI.
    const [users, setUsers] = useState<{ id: string, name: string }[]>([]);

    useEffect(() => {
        if (!currentUser?.isAdmin) {
            onShowToast('Access Denied. Admin privileges required.', 'error');
            onClose();
            return;
        }

        loadData();
    }, [currentUser, activeTab]);

    const loadData = async () => {
        setLoading(true);
        try {
            if (activeTab === 'posts') {
                const allPosts = await PostService.getAllPosts();
                setPosts(allPosts);
            } else if (activeTab === 'users') {
                // In a perfect world, we'd query `public.profiles`. Since we don't have a service method 
                // for fetching all profiles setup yet, let's extract users from our posts as a lightweight solution
                // OR we can make a direct supabase call here if USE_MOCK is false.
                const { supabase, USE_MOCK } = await import('../lib/supabase');
                if (!USE_MOCK) {
                    const { data, error } = await supabase.from('profiles').select('id, name, email');
                    if (!error && data) {
                        setUsers(data as any);
                    }
                } else {
                    // Mock fallback
                    const mockUsers = JSON.parse(localStorage.getItem('khojsetu_mock_users') || '[]');
                    setUsers(mockUsers);
                }
            }
        } catch (error) {
            console.error('Failed to load admin data', error);
            onShowToast('Failed to load data', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleDeletePost = (postId: number) => {
        onShowConfirm(
            'Admin: Delete Post',
            'Are you sure you want to permanently delete this post?',
            async () => {
                try {
                    await PostService.adminDeletePost(postId);
                    setPosts(prev => prev.filter(p => p.id !== postId));
                    onShowToast('Post deleted by Admin', 'success');
                } catch (error) {
                    onShowToast('Failed to delete post. Check permissions.', 'error');
                }
            }
        );
    };

    const handleDeleteUser = (userId: string, userName: string) => {
        if (userId === currentUser?.id) {
            onShowToast('You cannot delete your own admin account.', 'error');
            return;
        }

        onShowConfirm(
            'Admin: Delete User Profile',
            `Are you sure you want to permanently delete ${userName}'s profile and all their posts?`,
            async () => {
                try {
                    await AuthService.adminDeleteProfile(userId);
                    setUsers(prev => prev.filter(u => u.id !== userId));
                    onShowToast('User profile deleted successfully', 'success');
                } catch (error) {
                    onShowToast('Failed to delete user. Check permissions.', 'error');
                }
            }
        );
    };

    if (!currentUser?.isAdmin) return null;

    return (
        <div className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-surface border border-red-500/30 w-full max-w-3xl rounded-2xl shadow-2xl shadow-red-500/10 overflow-hidden max-h-[85vh] flex flex-col"
            >
                {/* Header */}
                <div className="p-4 border-b border-red-500/20 bg-red-500/5 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-red-500/20 rounded-lg text-red-500">
                            <Shield className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="font-bold text-lg text-text">Admin Control Panel</h2>
                            <p className="text-xs text-red-400">Restricted Access</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/10 rounded-full transition"
                    >
                        <X className="w-5 h-5 text-muted hover:text-text" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-white/10 bg-surface/50">
                    <button
                        onClick={() => setActiveTab('posts')}
                        className={`flex-1 py-3 text-sm font-bold border-b-2 transition-colors flex items-center justify-center gap-2 ${activeTab === 'posts' ? 'border-primary text-primary' : 'border-transparent text-muted hover:text-text'
                            }`}
                    >
                        <ImageIcon className="w-4 h-4" /> Manage Posts
                    </button>
                    <button
                        onClick={() => setActiveTab('users')}
                        className={`flex-1 py-3 text-sm font-bold border-b-2 transition-colors flex items-center justify-center gap-2 ${activeTab === 'users' ? 'border-primary text-primary' : 'border-transparent text-muted hover:text-text'
                            }`}
                    >
                        <Users className="w-4 h-4" /> Manage Profiles
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4 bg-black/20">
                    {loading ? (
                        <div className="text-center py-10 text-muted">Loading data...</div>
                    ) : activeTab === 'posts' ? (
                        <div className="space-y-3">
                            {posts.length === 0 && <div className="text-center text-muted py-8">No posts found.</div>}
                            <AnimatePresence>
                                {posts.map(post => (
                                    <motion.div
                                        key={post.id}
                                        layout
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="bg-surface border border-border rounded-xl p-3 flex gap-4 items-center"
                                    >
                                        <div className="w-12 h-12 rounded-lg bg-gray-800 overflow-hidden flex-shrink-0">
                                            {post.imageUrl ? (
                                                <img src={post.imageUrl} className="w-full h-full object-cover" />
                                            ) : (
                                                <ImageIcon className="w-full h-full p-3 text-muted" />
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-bold text-text truncate">{post.title}</h3>
                                            <div className="flex gap-2 text-[10px] mt-1">
                                                <span className={`px-1.5 py-0.5 rounded border ${post.type?.toUpperCase() === 'LOST' ? 'border-red-500/30 text-red-400 bg-red-500/10' : 'border-green-500/30 text-green-400 bg-green-500/10'}`}>
                                                    {post.type?.toUpperCase()}
                                                </span>
                                                <span className="text-muted">By: {post.createdByName || post.userId.substring(0, 8)}</span>
                                                <span className="text-muted">{getTimeAgo(post.timestamp)}</span>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleDeletePost(post.id)}
                                            className="p-2 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition"
                                            title="Force Delete Post"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {users.length === 0 && <div className="text-center text-muted py-8">No users found.</div>}
                            <AnimatePresence>
                                {users.map(u => (
                                    <motion.div
                                        key={u.id}
                                        layout
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="bg-surface border border-border rounded-xl p-3 flex justify-between items-center"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-primary to-secondary p-0.5">
                                                <img
                                                    src={`https://api.dicebear.com/7.x/personas/svg?seed=${u.name || u.id}`}
                                                    className="w-full h-full rounded-full bg-black"
                                                />
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-text text-sm">{u.name || 'Unknown User'}</h3>
                                                <p className="text-[10px] text-muted font-mono">{u.id}</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleDeleteUser(u.id, u.name)}
                                            className="px-3 py-1.5 bg-red-500/10 text-red-500 text-xs font-bold rounded-lg hover:bg-red-500 hover:text-white transition flex items-center gap-1"
                                            title="Delete User and all related data"
                                        >
                                            <Trash2 className="w-3 h-3" />
                                            Remove Fake ID
                                        </button>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>
                    )}
                </div>
            </motion.div>
        </div>
    );
}
