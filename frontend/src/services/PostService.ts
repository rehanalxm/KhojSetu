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

// Helper: compress dataURL to a tiny fallback thumbnail (< 20KB)
const createTinyThumbnail = (base64Str: string, maxDim = 400, quality = 0.4): Promise<string> => {
    return new Promise((resolve) => {
        if (!base64Str || !base64Str.startsWith('data:')) {
            return resolve(base64Str || '');
        }
        const img = new Image();
        img.src = base64Str;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            let { width, height } = img;
            if (width > height) {
                if (width > maxDim) {
                    height = Math.round((height * maxDim) / width);
                    width = maxDim;
                }
            } else {
                if (height > maxDim) {
                    width = Math.round((width * maxDim) / height);
                    height = maxDim;
                }
            }
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx?.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.onerror = () => resolve(base64Str.slice(0, 10000));
    });
};

// ---------------------------------------------------------------------------
// Intelligent In-Memory & Session Cache Layer (0ms Instant Load)
// ---------------------------------------------------------------------------
let postsCache: Post[] | null = null;
let lastCacheTimestamp = 0;
const CACHE_TTL_MS = 60 * 1000; // 1 minute auto-refresh or real-time event-driven

export const PostService = {
    // Invalidate or clear cache
    invalidateCache: () => {
        postsCache = null;
        lastCacheTimestamp = 0;
    },

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

            const cleanUserId = userId || 'user';
            const fileName = `${cleanUserId}/${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${ext}`;

            // Fast 5-second timeout on storage upload
            const uploadPromise = supabase.storage
                .from('khojsetu-images')
                .upload(fileName, blob, {
                    contentType: mime,
                    upsert: true
                });

            const timeoutPromise = new Promise<any>((_, reject) =>
                setTimeout(() => reject(new Error('Storage timeout')), 5000)
            );

            const { data, error } = await Promise.race([uploadPromise, timeoutPromise]);

            if (!error && data) {
                const { data: publicUrlData } = supabase.storage
                    .from('khojsetu-images')
                    .getPublicUrl(fileName);
                if (publicUrlData?.publicUrl) {
                    return publicUrlData.publicUrl;
                }
            }
        } catch (uploadErr) {
            console.warn('Storage upload notice, using optimized thumbnail:', uploadErr);
        }

        // Fallback: compress to ultra-lightweight thumbnail so JSON insert is under 20KB
        return await createTinyThumbnail(fileOrDataUrl, 400, 0.4);
    },

    // ======================== GET ALL POSTS (With Intelligent Cache) ========================
    getAllPosts: async (forceRefresh = false): Promise<Post[]> => {
        const now = Date.now();

        // 1. Instant Cache Return (0ms loading, zero delay)
        if (!forceRefresh && postsCache !== null && (now - lastCacheTimestamp < CACHE_TTL_MS)) {
            return postsCache;
        }

        try {
            // 2. Fast fetch from Supabase with 4-second safety timeout
            const fetchPromise = supabase
                .from('posts')
                .select(`*, profiles:user_id (name)`)
                .order('created_at', { ascending: false })
                .limit(100);

            const timeoutPromise = new Promise<any>((_, reject) =>
                setTimeout(() => reject(new Error('Fetch timeout')), 4000)
            );

            const { data, error } = await Promise.race([fetchPromise, timeoutPromise]);

            if (error) {
                console.warn('Error fetching posts:', error.message);
                return postsCache || [];
            }

            const formatted = (data || []).map(mapRow);
            postsCache = formatted;
            lastCacheTimestamp = Date.now();
            return formatted;
        } catch (err: any) {
            console.warn('getAllPosts notice:', err?.message);
            return postsCache || [];
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
                    // Invalidate cache immediately on real-time event
                    PostService.invalidateCache();
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

            // 2. Upload image or get lightweight optimized URL
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

            const newPost = mapRow(insertData);

            // Optimistic in-memory cache update
            if (postsCache) {
                postsCache = [newPost, ...postsCache.filter(p => p.id !== newPost.id)];
            }
            lastCacheTimestamp = Date.now();

            return newPost;
        } catch (err: any) {
            console.error('createPost error details:', err);
            const msg = err?.message || '';
            if (msg.includes('abort') || msg.includes('signal')) {
                throw new Error('Upload took too long or was interrupted. Please try again.');
            }
            throw new Error(msg || 'Failed to create post. Please try again.');
        }
    },

    // ======================== DELETE POST ========================
    deletePost: async (postId: string | number): Promise<void> => {
        try {
            const { error } = await supabase.from('posts').delete().eq('id', postId);
            if (error) throw error;

            // Optimistic in-memory cache update
            if (postsCache) {
                postsCache = postsCache.filter(p => p.id !== postId);
            }
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

            if (postsCache) {
                postsCache = postsCache.filter(p => p.id !== postId);
            }
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
