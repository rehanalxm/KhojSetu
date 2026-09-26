import { supabase } from '../lib/supabase';
import type { User } from '../types/auth';

const STORAGE_KEYS = {
    USER: 'khojsetu_current_user'
};

const OTP_STORAGE_KEYS = {
    PENDING_EMAIL: 'khojsetu_pending_email',
    PENDING_PASSWORD: 'khojsetu_pending_password',
    PENDING_NAME: 'khojsetu_pending_name',
    PENDING_GENDER: 'khojsetu_pending_gender',
    OTP_SESSION: 'khojsetu_otp_session'
};

// Helper: clear all pending OTP data
const clearPendingOtp = () => {
    Object.values(OTP_STORAGE_KEYS).forEach((k) => localStorage.removeItem(k));
};

export const AuthService = {
    /**
     * Format a User object from Supabase session or profile data
     */
    _formatUser: (supaUser: any, profile?: any): User => {
        const metadata = supaUser?.user_metadata || {};
        const email = supaUser?.email || profile?.email || metadata.email || '';
        const name = profile?.name || metadata.name || (email ? email.split('@')[0] : 'User');
        const id = supaUser?.id || profile?.id || '';
        const avatar =
            profile?.avatar_url ||
            metadata.avatar_url ||
            `https://api.dicebear.com/7.x/avataaars/svg?seed=${id || email || 'user'}`;

        return {
            id,
            email,
            name,
            avatar,
            isAdmin: profile?.is_admin === true || metadata.isAdmin === true || metadata.is_admin === true,
            joinedAt: new Date(supaUser?.created_at || profile?.created_at || Date.now())
        };
    },

    /**
     * Helper: Guarantee that a profile row exists in public.profiles for the given auth user
     */
    ensureProfileExists: async (authUser: any, customProfile?: Partial<{ name: string; avatar_url: string; gender: string }>): Promise<any> => {
        if (!authUser?.id) return null;

        const metadata = authUser.user_metadata || {};
        const email = authUser.email || '';
        const name = customProfile?.name || metadata.name || (email ? email.split('@')[0] : 'User');
        const avatar_url = customProfile?.avatar_url || metadata.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${authUser.id}`;

        const payload = {
            id: authUser.id,
            email,
            name,
            avatar_url,
            gender: customProfile?.gender || metadata.gender || 'male',
            updated_at: new Date().toISOString()
        };

        try {
            const { data, error } = await supabase
                .from('profiles')
                .upsert(payload, { onConflict: 'id' })
                .select('*')
                .single();

            if (!error && data) {
                return data;
            }
        } catch (err) {
            console.warn('Profile ensure notice:', err);
        }

        return payload;
    },

    // ======================== SIGNUP WITH OTP ========================
    signupInitiate: async (
        name: string,
        email: string,
        password: string,
        gender: 'male' | 'female'
    ): Promise<void> => {
        localStorage.setItem(OTP_STORAGE_KEYS.PENDING_EMAIL, email);
        localStorage.setItem(OTP_STORAGE_KEYS.PENDING_PASSWORD, password);
        localStorage.setItem(OTP_STORAGE_KEYS.PENDING_NAME, name);
        localStorage.setItem(OTP_STORAGE_KEYS.PENDING_GENDER, gender);

        try {
            const { error } = await supabase.auth.signInWithOtp({
                email,
                options: { shouldCreateUser: false }
            });
            if (error) throw error;
        } catch (err: any) {
            console.error('signupInitiate failed:', err);
            throw new Error(err?.message || 'Failed to send OTP. Please try again.');
        }
    },

    verifyOtpAndSignup: async (email: string, token: string): Promise<User> => {
        const name = localStorage.getItem(OTP_STORAGE_KEYS.PENDING_NAME) || 'User';
        const gender = (localStorage.getItem(OTP_STORAGE_KEYS.PENDING_GENDER) || 'male') as 'male' | 'female';
        const avatarUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`;

        try {
            const { data, error } = await supabase.auth.verifyOtp({
                email,
                token,
                type: 'email'
            });

            if (error) throw error;
            if (!data.user) throw new Error('OTP verification failed');

            const profile = await AuthService.ensureProfileExists(data.user, {
                name,
                avatar_url: avatarUrl,
                gender
            });

            const newUser = AuthService._formatUser(data.user, profile);
            localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(newUser));
            clearPendingOtp();
            return newUser;
        } catch (err: any) {
            console.error('verifyOtpAndSignup failed:', err);
            throw new Error(err?.message || 'OTP verification failed. Please try again.');
        }
    },

    // ======================== LOGIN ========================
    login: async (email: string, password: string): Promise<User> => {
        try {
            const { data, error } = await supabase.auth.signInWithPassword({ email, password });

            if (error) {
                console.error('AuthService.login error:', error);
                throw error;
            }
            if (!data.user) throw new Error('Login succeeded but no user returned.');

            // Fetch or ensure profile immediately
            let { data: profile } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', data.user.id)
                .single();

            if (!profile) {
                profile = await AuthService.ensureProfileExists(data.user);
            }

            const formattedUser = AuthService._formatUser(data.user, profile);
            localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(formattedUser));
            return formattedUser;
        } catch (err: any) {
            console.error('Login failed:', err);
            throw new Error(err?.message || 'Login failed. Please check your credentials.');
        }
    },

    // ======================== DIRECT SIGNUP ========================
    signup: async (
        name: string,
        email: string,
        password: string,
        gender: 'male' | 'female'
    ): Promise<User> => {
        const avatarUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`;

        try {
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: { data: { name, gender, avatar_url: avatarUrl } }
            });
            if (error) throw error;
            if (!data.user) throw new Error('Signup failed');

            const profile = await AuthService.ensureProfileExists(data.user, {
                name,
                avatar_url: avatarUrl,
                gender
            });

            const newUser = AuthService._formatUser(data.user, profile);
            localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(newUser));
            return newUser;
        } catch (err: any) {
            console.error('Signup failed:', err);
            throw new Error(err?.message || 'Signup failed. Please try again.');
        }
    },

    // ======================== SESSION / LOGOUT ========================
    logout: async () => {
        try {
            await supabase.auth.signOut();
        } catch (err) {
            console.warn('Logout warning:', err);
        }
        // Purge all KhojSetu user storage
        Object.keys(localStorage).forEach((key) => {
            if (key.startsWith('khojsetu_')) {
                localStorage.removeItem(key);
            }
        });
    },

    async syncSession(providedSession?: any): Promise<User | null> {
        try {
            let session = providedSession;

            if (!session) {
                const { data, error } = await supabase.auth.getSession();
                if (error || !data.session) {
                    localStorage.removeItem(STORAGE_KEYS.USER);
                    return null;
                }
                session = data.session;
            }

            if (!session?.user) {
                localStorage.removeItem(STORAGE_KEYS.USER);
                return null;
            }

            const { data: profile } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', session.user.id)
                .single();

            const user = AuthService._formatUser(session.user, profile);
            localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
            return user;
        } catch (err) {
            console.error('syncSession error:', err);
            return AuthService.getCurrentUser();
        }
    },

    getCurrentUser: (): User | null => {
        const stored = localStorage.getItem(STORAGE_KEYS.USER);
        if (!stored) return null;
        try {
            return JSON.parse(stored);
        } catch {
            return null;
        }
    },

    // ======================== PASSWORD RECOVERY ========================
    forgotPassword: async (email: string): Promise<void> => {
        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: window.location.origin
            });
            if (error) throw error;
        } catch (err: any) {
            console.error('forgotPassword failed:', err);
            throw new Error(err?.message || 'Failed to send password reset email.');
        }
    },

    resetPassword: async (newPassword: string): Promise<void> => {
        try {
            const { error } = await supabase.auth.updateUser({ password: newPassword });
            if (error) throw error;
        } catch (err: any) {
            console.error('resetPassword failed:', err);
            throw new Error(err?.message || 'Password update failed.');
        }
    },

    // ======================== DELETE ACCOUNT ========================
    deleteAccount: async (userId: string): Promise<void> => {
        try {
            await supabase.from('messages').delete().or(`sender_id.eq.${userId},receiver_id.eq.${userId}`);
            await supabase.from('posts').delete().eq('user_id', userId);
            const { error } = await supabase.from('profiles').delete().eq('id', userId);
            if (error) throw error;
            await AuthService.logout();
        } catch (err: any) {
            console.error('deleteAccount failed:', err);
            throw new Error(err?.message || 'Failed to delete account.');
        }
    },

    // ======================== ADMIN PROFILE DELETION ========================
    adminDeleteProfile: async (userId: string): Promise<void> => {
        try {
            await supabase.from('messages').delete().or(`sender_id.eq.${userId},receiver_id.eq.${userId}`);
            await supabase.from('posts').delete().eq('user_id', userId);
            const { error } = await supabase.from('profiles').delete().eq('id', userId);
            if (error) throw error;
        } catch (err: any) {
            console.error('adminDeleteProfile failed:', err);
            throw new Error(err?.message || 'Failed to delete profile.');
        }
    }
};
