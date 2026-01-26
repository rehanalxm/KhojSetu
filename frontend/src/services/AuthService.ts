import { supabase, USE_MOCK } from '../lib/supabase';
import type { User } from '../types/auth';

const STORAGE_KEYS = {
    USER: 'khojsetu_current_user',
    ALL_USERS: 'khojsetu_mock_users'
};

export const AuthService = {
    /**
     * Helper to format User object from Supabase session or profile
     */
    _formatUser: (supaUser: any, profile?: any): User => {
        const metadata = supaUser.user_metadata || {};
        return {
            id: supaUser.id,
            email: supaUser.email!,
            // Prioritize profile name, then metadata, then email fallback
            name: profile?.name || metadata.name || supaUser.email!.split('@')[0],
            avatar: profile?.avatar_url || metadata.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${supaUser.email}`,
            joinedAt: new Date(supaUser.created_at)
        };
    },

    login: async (email: string, password: string): Promise<User> => {
        if (USE_MOCK) {
            console.log("Mock Mode: Logging in...", email);
            const mockUsers = JSON.parse(localStorage.getItem(STORAGE_KEYS.ALL_USERS) || '[]');
            const existingUser = mockUsers.find((u: any) => u.email === email);

            if (!existingUser) {
                throw new Error("User not found in Mock Mode. Please sign up first.");
            }

            localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(existingUser));
            return existingUser;
        }

        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) throw error;
        if (!data.user) throw new Error("Login succeeded but no user returned.");

        // Fetch profile for complete user data
        const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', data.user.id)
            .single();

        let userProfile = profile;

        // Auto-repair profile if missing
        if (!userProfile) {
            console.log("Profile missing, creating auto-repair profile...");
            const newProfile = {
                id: data.user.id,
                email: data.user.email,
                name: data.user.user_metadata?.name || data.user.email?.split('@')[0],
                avatar_url: data.user.user_metadata?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${data.user.email}`,
            };

            const { error: insertError } = await supabase
                .from('profiles')
                .insert(newProfile);

            if (!insertError) userProfile = newProfile;
            else console.error("Failed to auto-create profile:", insertError);
        }

        const user = AuthService._formatUser(data.user, userProfile);

        // Update local storage for immediate UI access (legacy support)
        localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
        return user;
    },

    signup: async (name: string, email: string, password: string, gender: 'male' | 'female'): Promise<User> => {
        // Use different avatar styles based on gender
        const avatarStyle = gender === 'male' ? 'personas' : 'personas';
        const avatarUrl = `https://api.dicebear.com/7.x/${avatarStyle}/svg?seed=${name}&faceVariant=${gender === 'male' ? '01,02,04,05,06,07,08' : '03,09,10,11'}`;
        const metadata = { name, gender, avatar_url: avatarUrl };

        if (USE_MOCK) {
            console.log("Mock Mode: Signing up...", name);
            const newUser: User = {
                id: `mock-${Date.now()}`,
                email,
                name,
                avatar: avatarUrl,
                joinedAt: new Date()
            };

            const mockUsers = JSON.parse(localStorage.getItem(STORAGE_KEYS.ALL_USERS) || '[]');
            mockUsers.push(newUser);
            localStorage.setItem(STORAGE_KEYS.ALL_USERS, JSON.stringify(mockUsers));
            localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(newUser));

            return newUser;
        }

        // 1. SignUp with Metadata
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: { data: metadata }
        });

        if (error) throw error;
        if (!data.user) throw new Error("Signup failed");

        // 2. Create Profile explicit entry (Backup for trigger failure)
        // We use upsert to avoid conflict if trigger runs faster
        const { error: profileError } = await supabase
            .from('profiles')
            .upsert({
                id: data.user.id,
                email: email,
                name: name,
                avatar_url: avatarUrl,
                gender: gender,
                updated_at: new Date().toISOString()
            }, { onConflict: 'id' });

        if (profileError) console.error("Profile creation warning:", profileError.message);

        const newUser: User = AuthService._formatUser(data.user, { name, avatar_url: avatarUrl });
        localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(newUser));

        return newUser;
    },

    logout: async () => {
        await supabase.auth.signOut();
        localStorage.removeItem('khojsetu_current_user');
    },

    async forgotPassword(email: string) {
        // IMPORTANT: The redirect URL must match your deployed domain or localhost
        // App.tsx handles the recovery token on load
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: window.location.origin,
        });
        if (error) throw error;
    },

    async syncSession(): Promise<User | null> {
        if (USE_MOCK) return AuthService.getCurrentUser();

        // Check active session from Supabase (Source of Truth)
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error || !session) {
            localStorage.removeItem(STORAGE_KEYS.USER);
            return null;
        }

        // Fetch latest profile data
        const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

        const user = AuthService._formatUser(session.user, profile);

        // Sync local storage
        localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
        return user;
    },

    async verifyOtp(email: string, token: string) {
        const { data, error } = await supabase.auth.verifyOtp({
            email,
            token,
            type: 'recovery',
        });
        if (error) throw error;
        return data;
    },

    async resetPassword(password: string) {
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
    },

    deleteAccount: async (userId: string): Promise<void> => {
        console.log("Starting account deletion for:", userId);

        // 1. Delete all messages (Try-Catch each to avoid blocking)
        try {
            const { error } = await supabase
                .from('messages')
                .delete()
                .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`);
            if (error) console.error("Non-critical: Error deleting some messages (might be RLS):", error.message);
        } catch (e) {
            console.error("Non-critical: Exception during messages deletion:", e);
        }

        // 2. Delete all posts
        try {
            const { error } = await supabase
                .from('posts')
                .delete()
                .eq('user_id', userId);
            if (error) console.error("Non-critical: Error deleting posts:", error.message);
        } catch (e) {
            console.error("Non-critical: Exception during posts deletion:", e);
        }

        // 3. Delete the user profile (CRITICAL STEP)
        console.log("Attempting to delete profile record...");
        const { error: profileError } = await supabase
            .from('profiles')
            .delete()
            .eq('id', userId);

        if (profileError) {
            console.error("CRITICAL: Failed to delete profile:", profileError.message);
            throw new Error(`Profile deletion failed: ${profileError.message}`);
        }

        // Verify profile is actually gone (to debug trigger)
        const { data: checkProfile } = await supabase
            .from('profiles')
            .select('id')
            .eq('id', userId)
            .single();

        if (checkProfile) {
            console.error("CRITICAL: Profile still exists after delete command!");
            throw new Error("Profile record persists after deletion. Trigger cannot run.");
        }

        console.log("Profile deleted successfully. Proceeding to logout.");

        // 4. Logout the user
        await AuthService.logout();
    },

    getCurrentUser: (): User | null => {
        // Fallback to local storage for synchronous access
        // Ideally we should use supabase.auth.getUser() async
        const stored = localStorage.getItem('khojsetu_current_user');
        if (stored) {
            try {
                const u = JSON.parse(stored);
                return { ...u, joinedAt: new Date(u.joinedAt) };
            } catch { return null; }
        }
        return null;
    }
};
