import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Calendar, Mail, MapPin, Grid3x3, Loader2, MessageSquare, Award } from 'lucide-react';
import type { Post } from '../types/categories';
import { PostService } from '../services/PostService';
import { supabase, USE_MOCK } from '../lib/supabase';

interface UserProfileModalProps {
    userId: string;
    onClose: () => void;
    onContact: (post: Post) => void;
    onOpenPost: (post: Post) => void;
}

interface UserProfile {
    id: string;
    name: string;
    avatar_url: string;
    email: string;
    created_at: string;
}

export default function UserProfileModal({ userId, onClose, onContact, onOpenPost }: UserProfileModalProps) {
    const [loading, setLoading] = useState(true);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [posts, setPosts] = useState<Post[]>([]);
    const [stats, setStats] = useState({ lost: 0, found: 0 });

    useEffect(() => {
        const fetchProfileAndPosts = async () => {
            setLoading(true);
            try {
                // Fetch Profile
                let userProfile: UserProfile | null = null;
                if (USE_MOCK) {
                    const mockUsers = JSON.parse(localStorage.getItem('khojsetu_mock_users') || '[]');
                    const found = mockUsers.find((u: any) => u.id === userId);
                    if (found) {
                        userProfile = {
                            id: found.id,
                            name: found.name,
                            avatar_url: found.avatar,
                            email: found.email,
                            created_at: found.joinedAt
                        };
                    } else {
                        // Fallback/Placeholder for mock if not found
                        userProfile = {
                            id: userId,
                            name: 'User ' + userId.slice(0, 5),
                            avatar_url: `https://api.dicebear.com/7.x/personas/svg?seed=${userId}`,
                            email: 'user@example.com',
                            created_at: new Date(Date.now() - 10000000).toISOString()
                        };
                    }
                } else {
                    const { data, error } = await supabase
                        .from('profiles')
                        .select('*')
                        .eq('id', userId)
                        .single();
                    if (!error) userProfile = data;
                }
                setProfile(userProfile);

                // Fetch Posts
                const allPosts = await PostService.getAllPosts();
                const userPosts = allPosts.filter(p => p.userId === userId);
                setPosts(userPosts);

                setStats({
                    lost: userPosts.filter(p => p.type === 'LOST').length,
                    found: userPosts.filter(p => p.type === 'FOUND').length
                });

            } catch (err) {
                console.error("Failed to load profile:", err);
            } finally {
                setLoading(false);
            }
        };

        if (userId) fetchProfileAndPosts();
    }, [userId]);

    return (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
                initial={{ y: 50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 50, opacity: 0 }}
                className="bg-surface/95 border border-white/10 w-full max-w-2xl max-h-[85vh] rounded-3xl overflow-hidden shadow-2xl flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header/Cover Section */}
                <div className="relative h-32 md:h-40 bg-gradient-to-br from-primary via-secondary to-indigo-600">
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-2 bg-black/20 hover:bg-black/40 rounded-full text-white transition-all backdrop-blur-sm"
                    >
                        <X className="w-5 h-5" />
                    </button>

                    {/* Avatar */}
                    <div className="absolute -bottom-12 left-8 p-1.5 bg-surface rounded-full">
                        <div className="w-24 h-24 md:w-28 md:h-28 rounded-full overflow-hidden bg-black ring-4 ring-surface">
                            <img
                                src={profile?.avatar_url || `https://api.dicebear.com/7.x/personas/svg?seed=${userId}`}
                                alt={profile?.name}
                                className="w-full h-full object-cover"
                            />
                        </div>
                    </div>
                </div>

                {/* Profile Info */}
                <div className="pt-16 px-8 pb-6 border-b border-white/10">
                    <div className="flex justify-between items-start">
                        <div>
                            <h2 className="text-2xl md:text-3xl font-black text-text tracking-tight">
                                {profile?.name || 'Loading...'}
                            </h2>
                            <p className="text-muted text-sm flex items-center gap-2 mt-1">
                                <Mail className="w-4 h-4" />
                                {profile?.email || '••••••@•••••.com'}
                            </p>
                        </div>
                        <div className="flex gap-4">
                            <div className="text-center">
                                <p className="text-xl font-black text-red-400">{stats.lost}</p>
                                <p className="text-[10px] font-bold text-muted uppercase tracking-tighter">Lost</p>
                            </div>
                            <div className="text-center">
                                <p className="text-xl font-black text-green-400">{stats.found}</p>
                                <p className="text-[10px] font-bold text-muted uppercase tracking-tighter">Found</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-4 mt-4">
                        <div className="flex items-center gap-1.5 text-xs text-muted bg-white/5 px-2.5 py-1.5 rounded-full border border-white/5">
                            <Calendar className="w-3.5 h-3.5" />
                            Joined {profile ? new Date(profile.created_at).toLocaleDateString() : '...'}
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-primary bg-primary/10 px-2.5 py-1.5 rounded-full border border-primary/10">
                            <Award className="w-3.5 h-3.5" />
                            Community Hero
                        </div>
                    </div>
                </div>

                {/* Posts Section */}
                <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-black/5">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="flex items-center gap-2 font-bold text-text">
                            <Grid3x3 className="w-5 h-5 text-primary" />
                            Post History
                        </h3>
                        {loading && <Loader2 className="w-4 h-4 animate-spin text-muted" />}
                    </div>

                    {posts.length > 0 ? (
                        <div className="grid grid-cols-2 gap-4">
                            {posts.map(post => (
                                <motion.div
                                    key={post.id}
                                    whileHover={{ y: -4 }}
                                    className="bg-white/5 border border-white/5 rounded-2xl overflow-hidden cursor-pointer group"
                                    onClick={() => onOpenPost(post)}
                                >
                                    <div className="aspect-[4/3] bg-black relative">
                                        <img
                                            src={post.imageUrl || (post.imageUrls && post.imageUrls[0])}
                                            alt={post.title}
                                            className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                                        />
                                        <div className={`absolute top-2 left-2 px-2 py-0.5 rounded text-[10px] font-bold uppercase ${post.type === 'LOST' ? 'bg-red-500 text-white' : 'bg-green-500 text-white'}`}>
                                            {post.type}
                                        </div>
                                    </div>
                                    <div className="p-3">
                                        <h4 className="text-sm font-bold text-text truncate group-hover:text-primary transition">{post.title}</h4>
                                        <p className="text-[10px] text-muted flex items-center gap-1 mt-1">
                                            <MapPin className="w-3 h-3" />
                                            {post.location.name.split(',')[0]}
                                        </p>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    ) : !loading && (
                        <div className="text-center py-12">
                            <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                                <X className="w-8 h-8 text-muted/30" />
                            </div>
                            <p className="text-muted text-sm">No posts to show yet</p>
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div className="p-4 md:p-6 bg-surface border-t border-white/10">
                    <button
                        onClick={() => {
                            // Find any post to initiate chat if no direct userId chat exists
                            if (posts.length > 0) onContact(posts[0]);
                            else onClose(); // Or show a toast "No contact points available"
                        }}
                        className="w-full bg-white/5 hover:bg-white/10 text-text font-bold py-4 rounded-2xl transition flex items-center justify-center gap-2 border border-white/10"
                    >
                        <MessageSquare className="w-5 h-5 text-primary" />
                        Message {profile?.name || 'User'}
                    </button>
                </div>
            </motion.div>
        </div>
    );
}
