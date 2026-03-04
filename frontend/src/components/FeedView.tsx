import { useState, useEffect } from 'react';
import type { User } from '../types/auth';
import PostCard from './PostCard';
import type { Post, CategoryId } from '../types/categories';
import { PostService } from '../services/PostService';
import { USE_MOCK, checkConnection } from '../lib/supabase';

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
            if (!USE_MOCK) {
                const { connected, error: connError } = await checkConnection();
                if (!connected) {
                    throw new Error(`Connection failed: ${connError || 'Unknown error'}`);
                }
            }

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
                    <div className="text-center py-20">
                        <div className="text-6xl mb-4">⚠️</div>
                        <h3 className="text-xl font-bold text-white mb-2">Connection Error</h3>
                        <p className="text-red-400 mb-6 max-w-md mx-auto">{error}</p>
                        <button
                            onClick={loadPosts}
                            className="px-6 py-2 bg-primary text-white rounded-full hover:bg-opacity-90 transition-all font-medium"
                        >
                            Try Again
                        </button>
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
