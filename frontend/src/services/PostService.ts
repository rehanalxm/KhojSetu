import { supabase } from '../lib/supabase';
import type { Post } from '../types/categories';
import { AuthService } from './AuthService';

// ---------------------------------------------------------------------------
// Helper: map a Supabase row to our Post type
// ---------------------------------------------------------------------------
const mapRow = (p: any): Post => ({
    id: p.id,
    title: p.title,
    description: p.description,
    type: (p.type || 'lost').toUpperCase() as 'LOST' | 'FOUND',
    category: p.category,
    imageUrl: p.image_url || '',
    imageUrls: p.image_urls || (p.image_url ? [p.image_url] : []),
    location: {
        lat: p.location_lat || 0,
        lng: p.location_lng || 0,
        name: p.location_name || 'Unknown Location'
    },
    timestamp: new Date(p.created_at || Date.now()),
    userId: p.user_id,
    contactInfo: p.contact_info,
    createdByName: p.profiles?.name
});

export const PostService = {
    // ======================== UPLOAD IMAGE ========================
    uploadImage: async (fileOrDataUrl: string, userId: string): Promise<string> => {
        if (!fileOrDataUrl || !fileOrDataUrl.startsWith('data:')) {
            return fileOrDataUrl || '';
        }

        try {
            // Convert Base64 dataURL to Blob for fast binary storage upload
            const parts = fileOrDataUrl.split(',');
            const mime = parts[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
            const ext = mime.split('/')[1] || 'jpg';
            const bstr = atob(parts[1]);
            let n = bstr.length;
            const u8arr = new Uint8Array(n);
            while (n--) {
                u8arr[n] = bstr.charCodeAt(n);
            }
            const blob = new Blob([u8arr], { type: mime });

            const cleanUserId = userId || 'anonymous';
            const fileName = `${cleanUserId}/${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${ext}`;

            const { data, error } = await supabase.storage
                .from('khojsetu-images')
                .upload(fileName, blob, {
                    contentType: mime,
                    upsert: true
                });

            if (!error && data) {
                const { data: publicUrlData } = supabase.storage
                    .from('khojsetu-images')
                    .getPublicUrl(fileName);
                if (publicUrlData?.publicUrl) {
                    return publicUrlData.publicUrl;
                }
            } else if (error) {
                console.warn('Storage upload fallback:', error.message);
            }
        } catch (uploadErr) {
            console.warn('Upload exception, using fallback:', uploadErr);
        }

        return fileOrDataUrl;
    },

    // ======================== GET ALL POSTS ========================
    getAllPosts: async (): Promise<Post[]> => {
        try {
            const { data, error } = await supabase
                .from('posts')
                .select(`*, profiles:user_id (name)`)
                .order('created_at', { ascending: false })
                .limit(100);

            if (error) {
                console.error('Error fetching posts:', error);
                throw new Error(error.message || 'Failed to fetch posts');
            }

            return (data || []).map(mapRow);
        } catch (err: any) {
            console.error('getAllPosts failed:', err);
            throw new Error(err?.message || 'Failed to load posts. Please check connection.');
        }
    },

    // ======================== REAL-TIME POSTS SUBSCRIPTION ========================
    subscribeToPosts: (onPostsChange: () => void) => {
        return supabase
            .channel('public:posts')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'posts'
                },
                () => {
                    onPostsChange();
                }
            )
            .subscribe();
    },

    // ======================== CREATE POST ========================
    createPost: async (postData: Omit<Post, 'id' | 'timestamp'>): Promise<Post> => {
        try {
            // 1. Resolve active user
            const { data: sessionData } = await supabase.auth.getSession();
            let authUser = sessionData?.session?.user;

            if (!authUser) {
                const { data: userRes } = await supabase.auth.getUser();
                authUser = userRes?.user ?? undefined;
            }

            if (!authUser) {
                throw new Error('Please login to your account before posting.');
            }

            const realUserId = authUser.id;

            // 2. Upload image to Supabase Storage if present
            let finalImageUrl = postData.imageUrl || '';
            if (finalImageUrl && finalImageUrl.startsWith('data:')) {
                finalImageUrl = await PostService.uploadImage(finalImageUrl, realUserId);
            }

            // 3. Guarantee user profile exists in profiles table
            await AuthService.ensureProfileExists(authUser, {
                name: postData.createdByName
            });

            // 4. Build standard post payload
            const normalizedType = (postData.type || 'lost').toLowerCase();

            const insertPayload: any = {
                user_id: realUserId,
                title: postData.title || 'Untitled Item',
                description: postData.description || 'No description provided',
                type: normalizedType,
                category: postData.category || 'OTHER',
                image_url: finalImageUrl,
                contact_info: postData.contactInfo || authUser.email || '',
                location_lat: postData.location?.lat || 0,
                location_lng: postData.location?.lng || 0,
                location_name: postData.location?.name || 'Unknown Location'
            };

            // 5. Insert Post into Supabase
            let { data: insertData, error: insertError } = await supabase
                .from('posts')
                .insert(insertPayload)
                .select()
                .single();

            // Fallback: If type check constraint requires uppercase ('LOST'/'FOUND')
            if (insertError && (insertError.message?.includes('type') || insertError.code === '23514')) {
                insertPayload.type = postData.type?.toUpperCase() || 'LOST';
                const retryRes = await supabase
                    .from('posts')
                    .insert(insertPayload)
                    .select()
                    .single();
                insertData = retryRes.data;
                insertError = retryRes.error;
            }

            if (insertError) {
                console.error('Post insertion database error:', insertError);
                throw new Error(insertError.message || 'Database error while saving post');
            }

            return mapRow(insertData);
        } catch (err: any) {
            console.error('createPost error details:', err);
            throw new Error(err?.message || 'Failed to create post. Please try again.');
        }
    },

    // ======================== DELETE POST ========================
    deletePost: async (postId: string | number): Promise<void> => {
        try {
            const { error } = await supabase.from('posts').delete().eq('id', postId);
            if (error) throw error;
        } catch (err: any) {
            console.error('deletePost failed:', err);
            throw new Error(err?.message || 'Failed to delete post.');
        }
    },

    // ======================== ADMIN DELETE POST ========================
    adminDeletePost: async (postId: string | number): Promise<void> => {
        try {
            const { error } = await supabase.from('posts').delete().eq('id', postId);
            if (error) throw error;
        } catch (err: any) {
            console.error('adminDeletePost failed:', err);
            throw new Error(err?.message || 'Failed to delete post as admin.');
        }
    },

    // ======================== SEARCH ========================
    searchPostsByImage: async (): Promise<Post[]> => {
        return PostService.getAllPosts();
    },

    // ======================== GET POSTS BY USER ========================
    getPostsByUser: async (userId: string): Promise<Post[]> => {
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
