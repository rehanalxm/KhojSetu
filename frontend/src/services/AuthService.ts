import { supabase, USE_MOCK } from '../lib/supabase';
import type { User } from '../types/auth';

const STORAGE_KEYS = {
    USER: 'khojsetu_current_user',
    ALL_USERS: 'khojsetu_mock_users'
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
        const metadata = supaUser.user_metadata || {};
        const email = supaUser.email || profile?.email || metadata.email || '';
        return {
            id: supaUser.id,
            email: email,
            name: profile?.name || metadata.name || email.split('@')[0],
            avatar:
                profile?.avatar_url ||
                metadata.avatar_url ||
                `https://api.dicebear.com/7.x/avataaars/svg?seed=${email}`,
            isAdmin: profile?.is_admin === true || metadata.isAdmin === true,
            joinedAt: new Date(supaUser.created_at)
        };
    },

    // ======================== SIGNUP WITH OTP ========================
    signupInitiate: async (
        name: string,
        email: string,
        password: string,
        gender: 'male' | 'female'
    ): Promise<void> => {
        // Always persist pending data for later verification
        localStorage.setItem(OTP_STORAGE_KEYS.PENDING_EMAIL, email);
        localStorage.setItem(OTP_STORAGE_KEYS.PENDING_PASSWORD, password);
        localStorage.setItem(OTP_STORAGE_KEYS.PENDING_NAME, name);
        localStorage.setItem(OTP_STORAGE_KEYS.PENDING_GENDER, gender);

        if (USE_MOCK) {
            console.log('Mock: Signup OTP initiated for', email);
            localStorage.setItem(OTP_STORAGE_KEYS.OTP_SESSION, `mock-otp-${Date.now()}`);
            return;
        }

        try {
            const { error } = await supabase.auth.signInWithOtp({
                email,
                options: { shouldCreateUser: false }
            });
            if (error) throw error;
            console.log('OTP sent to', email);
        } catch (err: any) {
            console.error('signupInitiate failed:', err);
            throw new Error(err?.message || 'Failed to send OTP. Please try again.');
        }
    },

    verifyOtpAndSignup: async (email: string, token: string): Promise<User> => {
        const name = localStorage.getItem(OTP_STORAGE_KEYS.PENDING_NAME) || 'User';
        const gender = (localStorage.getItem(OTP_STORAGE_KEYS.PENDING_GENDER) || 'male') as
            | 'male'
            | 'female';
        const avatarUrl = `https://api.dicebear.com/7.x/personas/svg?seed=${name}`;

        if (USE_MOCK) {
            console.log('Mock: OTP verified for', email);
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
            clearPendingOtp();
            return newUser;
        }

        try {
            const { data, error } = await supabase.auth.verifyOtp({
                email,
                token,
                type: 'email'
            });

            if (error) throw error;
            if (!data.user) throw new Error('OTP verification failed');

            // Create / update profile
            const { error: profileError } = await supabase.from('profiles').upsert(
                {
                    id: data.user.id,
                    email,
                    name,
                    avatar_url: avatarUrl,
                    gender,
                    updated_at: new Date().toISOString()
                },
                { onConflict: 'id' }
            );
            if (profileError) console.warn('Profile upsert warning:', profileError.message);

            const newUser = AuthService._formatUser(data.user, { name, avatar_url: avatarUrl });
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
        if (USE_MOCK) {
            console.log('Mock: Login attempt for', email);
            const mockUsers = JSON.parse(localStorage.getItem(STORAGE_KEYS.ALL_USERS) || '[]');
            const existingUser = mockUsers.find((u: any) => u.email === email);
            if (!existingUser) {
                throw new Error('User not found in Mock Mode. Please sign up first.');
            }
            localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(existingUser));
            return existingUser;
        }

        try {
            console.log('AuthService.login: Calling signInWithPassword...');
            const { data, error } = await supabase.auth.signInWithPassword({ email, password });
            console.log('AuthService.login: signInWithPassword returned', { hasData: !!data?.user, hasError: !!error });

            if (error) {
                console.error('AuthService.login: DB returned error:', error);
                throw error;
            }
            if (!data.user) throw new Error('Login succeeded but no user returned.');

            console.log('AuthService.login: Success! Passing control to App.tsx auth listener.');
            // We do NOT fetch the profile here anymore. 
            // App.tsx's onAuthStateChange('SIGNED_IN') will immediately trigger and call syncSession(),
            // which handles the profile fetch. Fetching it twice simultaneously causes a deadlock.

            return {
                id: data.user.id,
                email: data.user.email!,
                name: 'Loading...',
                joinedAt: new Date()
            };
        } catch (err: any) {
            console.error('Login failed:', err);
            throw new Error(err?.message || 'Login failed. Please check your credentials.');
        }
    },

    // ======================== DIRECT SIGNUP (no OTP) ========================
    signup: async (
        name: string,
        email: string,
        password: string,
        gender: 'male' | 'female'
    ): Promise<User> => {
        const avatarUrl = `https://api.dicebear.com/7.x/personas/svg?seed=${name}`;

        if (USE_MOCK) {
            console.log('Mock: Signup for', email);
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

        try {
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: { data: { name, gender, avatar_url: avatarUrl } }
            });
            if (error) throw error;
            if (!data.user) throw new Error('Signup failed');

            const { error: profileError } = await supabase.from('profiles').upsert(
                {
                    id: data.user.id,
                    email,
                    name,
                    avatar_url: avatarUrl,
                    gender,
                    updated_at: new Date().toISOString()
                },
                { onConflict: 'id' }
            );
            if (profileError) console.warn('Profile creation warning:', profileError.message);

            const newUser = AuthService._formatUser(data.user, { name, avatar_url: avatarUrl });
            localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(newUser));
            return newUser;
        } catch (err: any) {
            console.error('Signup failed:', err);
            throw new Error(err?.message || 'Signup failed. Please try again.');
        }
    },

    // ======================== PASSWORD RESET ========================
    forgotPasswordInitiate: async (email: string): Promise<void> => {
        localStorage.setItem(OTP_STORAGE_KEYS.PENDING_EMAIL, email);

        if (USE_MOCK) {
            console.log('Mock: Reset OTP initiated for', email);
            localStorage.setItem(OTP_STORAGE_KEYS.OTP_SESSION, `mock-reset-otp-${Date.now()}`);
            return;
        }

        try {
            const { error } = await supabase.auth.signInWithOtp({
                email,
                options: { shouldCreateUser: false }
            });
            if (error) throw error;
        } catch (err: any) {
            console.error('forgotPasswordInitiate failed:', err);
            throw new Error(err?.message || 'Failed to send reset OTP.');
        }
    },

    verifyOtpForPasswordReset: async (email: string, token: string): Promise<string> => {
        if (USE_MOCK) {
            console.log('Mock: OTP verified for password reset');
            const session = `mock-session-${Date.now()}`;
            localStorage.setItem(OTP_STORAGE_KEYS.OTP_SESSION, session);
            return session;
        }

        try {
            const { data, error } = await supabase.auth.verifyOtp({
                email,
                token,
                type: 'email'
            });
            if (error) throw error;
            if (!data.session) throw new Error('Session creation failed');
            localStorage.setItem(OTP_STORAGE_KEYS.OTP_SESSION, data.session.access_token);
            return data.session.access_token;
        } catch (err: any) {
            console.error('verifyOtpForPasswordReset failed:', err);
            throw new Error(err?.message || 'OTP verification failed.');
        }
    },

    completePasswordReset: async (newPassword: string): Promise<void> => {
        if (USE_MOCK) {
            console.log('Mock: Password reset complete');
            clearPendingOtp();
            return;
        }

        try {
            const { error } = await supabase.auth.updateUser({ password: newPassword });
            if (error) throw error;
            clearPendingOtp();
        } catch (err: any) {
            console.error('completePasswordReset failed:', err);
            throw new Error(err?.message || 'Password reset failed.');
        }
    },

    // ======================== SESSION / LOGOUT ========================
    logout: async () => {
        try {
            if (!USE_MOCK) {
                await supabase.auth.signOut();
            }
        } catch (err) {
            console.warn('Logout warning:', err);
        }
        localStorage.removeItem(STORAGE_KEYS.USER);
    },

    async forgotPassword(email: string) {
        if (USE_MOCK) {
            console.log('Mock: Password reset email for', email);
            return;
        }

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

    async syncSession(providedSession?: any): Promise<User | null> {
        if (USE_MOCK) return AuthService.getCurrentUser();

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

            if (!session) {
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
            console.error('syncSession failed:', err);
            localStorage.removeItem(STORAGE_KEYS.USER);
            return null;
        }
    },

    async verifyOtp(email: string, token: string) {
        if (USE_MOCK) {
            console.log('Mock: OTP recovery verified');
            return { user: null, session: null };
        }

        try {
            const { data, error } = await supabase.auth.verifyOtp({
                email,
                token,
                type: 'recovery'
            });
            if (error) throw error;
            return data;
        } catch (err: any) {
            console.error('verifyOtp failed:', err);
            throw new Error(err?.message || 'OTP verification failed.');
        }
    },

    async resetPassword(password: string) {
        if (USE_MOCK) {
            console.log('Mock: Password updated');
            return;
        }

        try {
            const { error } = await supabase.auth.updateUser({ password });
            if (error) throw error;
        } catch (err: any) {
            console.error('resetPassword failed:', err);
            throw new Error(err?.message || 'Password reset failed.');
        }
    },

    // ======================== ACCOUNT DELETION ========================
    deleteAccount: async (userId: string): Promise<void> => {
        console.log('Starting account deletion for:', userId);

        if (USE_MOCK) {
            console.log('Mock: Account deleted for', userId);
            const mockUsers = JSON.parse(localStorage.getItem(STORAGE_KEYS.ALL_USERS) || '[]');
            const filtered = mockUsers.filter((u: any) => u.id !== userId);
            localStorage.setItem(STORAGE_KEYS.ALL_USERS, JSON.stringify(filtered));
            localStorage.removeItem(STORAGE_KEYS.USER);
            return;
        }

        // Delete related data (non-blocking, best-effort)
        try {
            await supabase
                .from('messages')
                .delete()
                .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`);
        } catch (e) {
            console.warn('Non-critical: messages deletion error:', e);
        }

        try {
            await supabase.from('posts').delete().eq('user_id', userId);
        } catch (e) {
            console.warn('Non-critical: posts deletion error:', e);
        }

        const { error: profileError } = await supabase
            .from('profiles')
            .delete()
            .eq('id', userId);

        if (profileError) {
            throw new Error(`Profile deletion failed: ${profileError.message}`);
        }

        await AuthService.logout();
    },

    // ======================== ADMIN DELETE PROFILE ========================
    adminDeleteProfile: async (userId: string): Promise<void> => {
        console.log('Admin deleting account for:', userId);
        if (USE_MOCK) return;

        // Best effort related data deletion
        try {
            await supabase.from('messages').delete().or(`sender_id.eq.${userId},receiver_id.eq.${userId}`);
            await supabase.from('posts').delete().eq('user_id', userId);
        } catch (e) {
            console.warn('Non-critical: cascade deletion error:', e);
        }

        const { error } = await supabase.from('profiles').delete().eq('id', userId);
        if (error) {
            throw new Error(`Profile deletion failed: ${error.message}`);
        }
    },

    // ======================== LOCAL STATE ========================
    getCurrentUser: (): User | null => {
        const stored = localStorage.getItem(STORAGE_KEYS.USER);
        if (stored) {
            try {
                const u = JSON.parse(stored);
                return { ...u, joinedAt: new Date(u.joinedAt) };
            } catch {
                return null;
            }
        }
        return null;
    }
};
