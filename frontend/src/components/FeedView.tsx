import { useState, useEffect } from 'react';
import type { User } from '../types/auth';
import PostCard from './PostCard';
import type { Post, CategoryId } from '../types/categories';
import { PostService } from '../services/PostService';

interface FeedViewProps {
    onContact: (post: Post) => void;
    onShowConfirm: (title: string, message: string, onConfirm: () => void) => void;
    onShowToast: (message: string, type: 'success' | 'error') => void;
    searchQuery: string;
    selectedCategory: CategoryId | 'ALL';
    selectedType: 'ALL' | 'LOST' | 'FOUND';
    currentUser: User | null;
    onOpenDetail: (post: Post) => void;
    onOpenProfile: (userId: string) => void;
}

export default function FeedView({
    onContact,
    onShowConfirm,
    onShowToast,
    searchQuery,
    selectedCategory,
    selectedType,
    currentUser,
    onOpenDetail,
    onOpenProfile
}: FeedViewProps) {
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadPosts = async () => {
        setLoading(true);
        setError(null);
        try {
            // Quick connection check first
            /* 
            // Optional: checkConnection is sometimes unstable in certain environments
            if (!USE_MOCK) {
                const { connected, error: connError } = await checkConnection();
                if (!connected) {
                    throw new Error(`Connection failed: ${connError || 'Unknown error'}`);
                }
            }
            */

            const data = await PostService.getAllPosts();
            setPosts(data);
        } catch (error: any) {
            console.error('Failed to load posts', error);
            setError(error.message || 'Failed to load posts');
            onShowToast('Failed to load content. Check connection.', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadPosts();
    }, []);

    const handleDelete = (postId: number) => {
        onShowConfirm(
            'Delete Post',
            'Are you sure you want to delete this post?',
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

    // Filter posts
    const filteredPosts = posts.filter(post => {
        const matchesSearch = post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            post.description.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = selectedCategory === 'ALL' || post.category === selectedCategory;
        const matchesType = selectedType === 'ALL' || post.type === selectedType;

        return matchesSearch && matchesCategory && matchesType;
    });

    return (
        <div className="bg-background pb-20 md:pb-8">
            {/* Posts Grid - Removed Search Bar from here */}
            <div className="max-w-7xl mx-auto px-4 py-6 pt-32 md:pt-40"> {/* Adjusted padding-top to clear the fixed header */}
                {loading ? (
                    <div className="flex justify-center items-center py-20">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                    </div>
                ) : error ? (
                    <div className="text-center py-20 px-4">
                        <motion.div
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="bg-red-500/10 border border-red-500/20 rounded-3xl p-8 max-w-sm mx-auto backdrop-blur-md"
                        >
                            <div className="text-5xl mb-6">📡</div>
                            <h3 className="text-2xl font-bold text-white mb-2">Syncing Data...</h3>
                            <p className="text-gray-400 mb-8 text-sm leading-relaxed">
                                We're having trouble reaching the items database. Your connection may be unstable.
                            </p>
                            <button
                                onClick={loadPosts}
                                className="w-full py-4 bg-gradient-to-r from-primary to-secondary text-white rounded-2xl hover:scale-[1.02] active:scale-[0.98] transition-all font-bold shadow-lg shadow-primary/20"
                            >
                                Reconnect Now
                            </button>
                        </motion.div>
                    </div>
                ) : filteredPosts.length === 0 ? (
                    <div className="text-center py-20">
                        <div className="text-6xl mb-4">🔍</div>
                        <h3 className="text-xl font-bold text-white mb-2">No posts found</h3>
                        <p className="text-gray-400">Try adjusting your search or filters</p>
                    </div>
                ) : (
                    <>
                        <div className="mb-4 text-sm text-gray-400">
                            Showing {filteredPosts.length} {filteredPosts.length === 1 ? 'post' : 'posts'}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filteredPosts.map(post => (
                                <PostCard
                                    key={post.id}
                                    post={post}
                                    onClick={() => onOpenDetail(post)}
                                    onContact={() => onContact(post)}
                                    onOpenProfile={() => onOpenProfile(post.userId)}
                                    onDelete={handleDelete}
                                    currentUser={currentUser}
                                />
                            ))}
                        </div>
                    </>
                )}
            </div>
        </div >
    );
}
