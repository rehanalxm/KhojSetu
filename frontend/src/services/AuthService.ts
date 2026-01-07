import { supabase } from '../lib/supabase';
import type { User } from '../types/auth';

export const AuthService = {
    login: async (email: string, password: string): Promise<User> => {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) throw error;

        // Check if profile exists
        const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', data.user.id)
            .single();

        let userProfile = profile;

        // Auto-repair: If profile is missing (e.g. old user), create it
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

            if (!insertError) {
                userProfile = newProfile;
            } else {
                console.error("Failed to auto-create profile:", insertError);
            }
        }

        const user: User = {
            id: data.user.id,
            email: data.user.email!,
            name: userProfile?.name || data.user.user_metadata?.name || email.split('@')[0],
            avatar: userProfile?.avatar_url || data.user.user_metadata?.avatar_url,
            joinedAt: new Date(data.user.created_at)
        };

        // Cache for legacy sync access if needed (optional)
        localStorage.setItem('khojsetu_current_user', JSON.stringify(user));
        return user;
    },

    signup: async (name: string, email: string, password: string, gender: 'male' | 'female'): Promise<User> => {
        // Use different avatar styles based on gender
        const avatarStyle = gender === 'male' ? 'personas' : 'personas';
        const avatarUrl = `https://api.dicebear.com/7.x/${avatarStyle}/svg?seed=${name}&faceVariant=${gender === 'male' ? '01,02,04,05,06,07,08' : '03,09,10,11'}`;

        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    name,
                    gender,
                    avatar_url: avatarUrl
                }
            }
        });

        if (error) throw error;
        if (!data.user) throw new Error("Signup failed");

        const newUser: User = {
            id: data.user.id,
            email: email,
            name: name,
            avatar: avatarUrl,
            joinedAt: new Date()
        };

        const { error: profileError } = await supabase
            .from('profiles')
            .insert({
                id: newUser.id,
                email: newUser.email,
                name: newUser.name,
                avatar_url: newUser.avatar,
                gender: gender,
                created_at: newUser.joinedAt.toISOString()
            });

        if (profileError) {
            console.error("Profile creation failed:", profileError);
            // Verify if it failed because trigger already created it (unlikely here but possible)
        }

        localStorage.setItem('khojsetu_current_user', JSON.stringify(newUser));
        return newUser;
    },

    logout: async () => {
        await supabase.auth.signOut();
        localStorage.removeItem('khojsetu_current_user');
    },

    async forgotPassword(email: string) {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: window.location.origin + '/reset-password',
        });
        if (error) throw error;
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
