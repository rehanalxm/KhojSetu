import { supabase, USE_MOCK } from '../lib/supabase';
import type { Post } from '../types/categories';

const STORAGE_KEY = 'khojsetu_mock_posts';

export const PostService = {
    getAllPosts: async (): Promise<Post[]> => {
        if (USE_MOCK) {
            console.log("Mock Mode: Fetching all posts...");
            const posts = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
            return posts.map((p: any) => ({
                ...p,
                timestamp: new Date(p.timestamp)
            }));
        }

        // Fetch posts and join with profiles to get user name
        const { data, error } = await supabase
            .from('posts')
            .select(`
                *,
                profiles:user_id (name)
            `)
            .order('created_at', { ascending: false });

        if (error) {
            console.error("Error fetching posts:", error);
            return [];
        }

        return (data || []).map((p) => ({
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
        }));
    },

    createPost: async (postData: Omit<Post, 'id' | 'timestamp'>): Promise<Post> => {
        if (USE_MOCK) {
            console.log("Mock Mode: Creating post...", postData.title);
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

        // In Supabase mode, we MUST use the real session ID to satisfy RLS
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Authentication required to post.");

        const realUserId = user.id;

        // Ensure profile exists before posting (Fix for Foreign Key Constraint Error)
        const { error: profileError } = await supabase
            .from('profiles')
            .upsert({
                id: realUserId,
                name: postData.createdByName || user.user_metadata?.name || 'Anonymous',
                email: realUserId === postData.userId ? postData.contactInfo : user.email,
                avatar_url: user.user_metadata?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${realUserId}`
            }, { onConflict: 'id' });

        if (profileError) {
            console.error("Profile sync failed (non-blocking):", profileError);
        }

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
            console.error("Post creation failed in Supabase:", error);
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
    },

    deletePost: async (postId: number): Promise<void> => {
        if (USE_MOCK) {
            console.log("Mock Mode: Deleting post...", postId);
            const posts = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
            const filtered = posts.filter((p: any) => p.id !== postId);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
            return;
        }

        const { error } = await supabase
            .from('posts')
            .delete()
            .eq('id', postId);

        if (error) throw error;
    },

    searchPostsByImage: async (): Promise<Post[]> => {
        // Basic implementation: Just return all posts for now or add a text search
        // Supabase Vector is needed for real image search, for now we can filter by type/category if needed
        return PostService.getAllPosts();
    }
};
