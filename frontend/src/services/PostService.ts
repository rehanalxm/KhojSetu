import { supabase, USE_MOCK } from '../lib/supabase';
import type { Post } from '../types/categories';

const STORAGE_KEY = 'khojsetu_mock_posts';

// ---------------------------------------------------------------------------
// Helper: map a Supabase row to our Post type
// ---------------------------------------------------------------------------
const mapRow = (p: any): Post => ({
    id: p.id,
    title: p.title,
    description: p.description,
    type: p.type,
    category: p.category,
    imageUrl: p.image_url,
    imageUrls: p.image_urls || [p.image_url].filter(Boolean),
    location: {
        lat: p.location_lat,
        lng: p.location_lng,
        name: p.location_name
    },
    timestamp: new Date(p.created_at),
    userId: p.user_id,
    contactInfo: p.contact_info,
    createdByName: p.profiles?.name
});

export const PostService = {
    // ======================== GET ALL POSTS ========================
    getAllPosts: async (): Promise<Post[]> => {
        if (USE_MOCK) {
            console.log('Mock: Fetching all posts');
            const posts = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
            return posts.map((p: any) => ({
                ...p,
                timestamp: new Date(p.timestamp)
            }));
        }

        try {
            const { data, error } = await supabase
                .from('posts')
                .select(`*, profiles:user_id (name)`)
                .order('created_at', { ascending: false })
                .limit(50);

            if (error) {
                console.error('Error fetching posts:', error);
                throw new Error(error.message || 'Failed to fetch posts');
            }

            return (data || []).map(mapRow);
        } catch (err: any) {
            console.error('getAllPosts failed:', err);
            throw new Error(err?.message || 'Failed to load posts. Please try again.');
        }
    },

    // ======================== CREATE POST ========================
    createPost: async (postData: Omit<Post, 'id' | 'timestamp'>): Promise<Post> => {
        if (USE_MOCK) {
            console.log('Mock: Creating post —', postData.title);
            const newPost: Post = {
                ...postData,
                id: Math.floor(Math.random() * 1000000),
                timestamp: new Date()
            };
            const posts = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
            posts.unshift(newPost);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(posts));
            return newPost;
        }

        try {
            // Verify active session
            const {
                data: { user }
            } = await supabase.auth.getUser();
            if (!user) {
                localStorage.removeItem('khojsetu_current_user');
                throw new Error('Session expired. Please log in again to post.');
            }

            const realUserId = user.id;

            // Non-blocking profile sync
            supabase
                .from('profiles')
                .upsert(
                    {
                        id: realUserId,
                        name:
                            postData.createdByName ||
                            user.user_metadata?.name ||
                            'Anonymous',
                        email:
                            realUserId === postData.userId
                                ? postData.contactInfo
                                : user.email,
                        avatar_url:
                            user.user_metadata?.avatar_url ||
                            `https://api.dicebear.com/7.x/avataaars/svg?seed=${realUserId}`,
                        updated_at: new Date().toISOString()
                    },
                    { onConflict: 'id' }
                )
                .then(({ error: profileError }) => {
                    if (profileError)
                        console.warn('Profile sync (non-blocking):', profileError.message);
                });

            const { data: insertData, error } = await supabase
                .from('posts')
                .insert({
                    user_id: realUserId,
                    title: postData.title,
                    description: postData.description,
                    type: postData.type,
                    category: postData.category,
                    image_url: postData.imageUrl || (postData.imageUrls?.[0] || ''),
                    image_urls: postData.imageUrls || [postData.imageUrl].filter(Boolean),
                    contact_info: postData.contactInfo,
                    location_lat: postData.location.lat,
                    location_lng: postData.location.lng,
                    location_name: postData.location.name
                })
                .select()
                .single();

            if (error) {
                console.error('Post creation failed:', {
                    message: error.message,
                    details: error.details,
                    hint: error.hint,
                    code: error.code
                });
                throw new Error(`Failed to create post: ${error.message}`);
            }

            return {
                id: insertData.id,
                title: insertData.title,
                description: insertData.description,
                type: insertData.type,
                category: insertData.category,
                imageUrl: insertData.image_url,
                imageUrls: insertData.image_urls || [insertData.image_url].filter(Boolean),
                location: {
                    lat: insertData.location_lat,
                    lng: insertData.location_lng,
                    name: insertData.location_name
                },
                timestamp: new Date(insertData.created_at),
                userId: insertData.user_id,
                contactInfo: insertData.contact_info
            };
        } catch (err: any) {
            console.error('createPost failed:', err);
            throw new Error(err?.message || 'Failed to create post. Please try again.');
        }
    },

    // ======================== DELETE POST ========================
    deletePost: async (postId: number): Promise<void> => {
        if (USE_MOCK) {
            console.log('Mock: Deleting post', postId);
            const posts = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
            const filtered = posts.filter((p: any) => p.id !== postId);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
            return;
        }

        try {
            const { error } = await supabase.from('posts').delete().eq('id', postId);
            if (error) throw error;
        } catch (err: any) {
            console.error('deletePost failed:', err);
            throw new Error(err?.message || 'Failed to delete post.');
        }
    },

    // ======================== ADMIN DELETE POST ========================
    adminDeletePost: async (postId: number): Promise<void> => {
        if (USE_MOCK) return;

        try {
            const { error } = await supabase.from('posts').delete().eq('id', postId);
            if (error) throw error;
        } catch (err: any) {
            console.error('adminDeletePost failed:', err);
            throw new Error(err?.message || 'Failed to delete post as admin.');
        }
    },

    // ======================== SEARCH (placeholder) ========================
    searchPostsByImage: async (): Promise<Post[]> => {
        return PostService.getAllPosts();
    },

    // ======================== GET POSTS BY USER ========================
    getPostsByUser: async (userId: string): Promise<Post[]> => {
        if (USE_MOCK) {
            const allPosts = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
            return allPosts
                .filter((p: any) => p.userId === userId)
                .map((p: any) => ({ ...p, timestamp: new Date(p.timestamp) }));
        }

        try {
            const { data, error } = await supabase
                .from('posts')
                .select(`*, profiles:user_id (name)`)
                .eq('user_id', userId)
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Error fetching user posts:', error);
                return [];
            }

            return (data || []).map(mapRow);
        } catch (err: any) {
            console.error('getPostsByUser failed:', err);
            return [];
        }
    },

    // ======================== POST COUNT ========================
    getUserPostCount: async (userId: string): Promise<number> => {
        if (USE_MOCK) {
            const posts = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
            return posts.filter((p: any) => p.userId === userId).length;
        }

        try {
            const { count, error } = await supabase
                .from('posts')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', userId);

            if (error) {
                console.error('Error getting post count:', error);
                return 0;
            }
            return count || 0;
        } catch (err: any) {
            console.error('getUserPostCount failed:', err);
            return 0;
        }
    }
};
