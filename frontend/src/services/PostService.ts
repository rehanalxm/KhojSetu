import { supabase } from '../lib/supabase';
import type { Post } from '../types/categories';

export const PostService = {
    getAllPosts: async (): Promise<Post[]> => {
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
            location: {
                lat: p.location_lat,
                lng: p.location_lng,
                name: p.location_name
            },
            timestamp: new Date(p.created_at),
            userId: p.user_id,
            contactInfo: p.contact_info,
            createdByName: p.profiles?.name // Mapped from joined table
        }));
    },

    createPost: async (postData: Omit<Post, 'id' | 'timestamp'>): Promise<Post> => {
        // Ensure profile exists before posting (Fix for Foreign Key Constraint Error)
        const { data: profileCheck } = await supabase
            .from('profiles')
            .select('id')
            .eq('id', postData.userId)
            .single();

        if (!profileCheck) {
            console.log("Supabase Fix: Profile missing for user, creating it now...");
            await supabase.from('profiles').insert({
                id: postData.userId,
                name: postData.createdByName,
                email: postData.contactInfo, // Best guess fallback
                avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${postData.createdByName}`
            });
        }

        const { data, error } = await supabase
            .from('posts')
            .insert({
                user_id: postData.userId,
                title: postData.title,
                description: postData.description,
                type: postData.type,
                category: postData.category,
                image_url: postData.imageUrl,
                contact_info: postData.contactInfo,
                location_lat: postData.location.lat,
                location_lng: postData.location.lng,
                location_name: postData.location.name
            })
            .select()
            .single();

        if (error) throw error;

        return {
            id: data.id,
            title: data.title,
            description: data.description,
            type: data.type,
            category: data.category,
            imageUrl: data.image_url,
            location: {
                lat: data.location_lat,
                lng: data.location_lng,
                name: data.location_name
            },
            timestamp: new Date(data.created_at),
            userId: data.user_id,
            contactInfo: data.contact_info
        };
    },

    deletePost: async (postId: number): Promise<void> => {
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
