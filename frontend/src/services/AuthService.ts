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

export const AuthService = {
    /**
     * Helper to format User object from Supabase session or profile
     */
    _formatUser: (supaUser: any, profile?: any): User => {
        const metadata = supaUser.user_metadata || {};
        return {
            id: supaUser.id,
            email: supaUser.email!,
            name: profile?.name || metadata.name || supaUser.email!.split('@')[0],
            avatar: profile?.avatar_url || metadata.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${supaUser.email}`,
            joinedAt: new Date(supaUser.created_at)
        };
    },

    // ============ SIGNUP WITH OTP ============
    signupInitiate: async (name: string, email: string, password: string, gender: 'male' | 'female'): Promise<void> => {
        if (USE_MOCK) {
            console.log("Mock Mode: Storing signup data...");
            localStorage.setItem(OTP_STORAGE_KEYS.PENDING_EMAIL, email);
            localStorage.setItem(OTP_STORAGE_KEYS.PENDING_PASSWORD, password);
            localStorage.setItem(OTP_STORAGE_KEYS.PENDING_NAME, name);
            localStorage.setItem(OTP_STORAGE_KEYS.PENDING_GENDER, gender);
            localStorage.setItem(OTP_STORAGE_KEYS.OTP_SESSION, `mock-otp-${Date.now()}`);
            return;
        }

        localStorage.setItem(OTP_STORAGE_KEYS.PENDING_EMAIL, email);
        localStorage.setItem(OTP_STORAGE_KEYS.PENDING_PASSWORD, password);
        localStorage.setItem(OTP_STORAGE_KEYS.PENDING_NAME, name);
        localStorage.setItem(OTP_STORAGE_KEYS.PENDING_GENDER, gender);

        const { error } = await supabase.auth.signInWithOtp({
            email,
            options: { shouldCreateUser: false },
        });

        if (error) throw error;
        console.log("OTP sent to", email);
    },

    verifyOtpAndSignup: async (email: string, token: string): Promise<User> => {
        if (USE_MOCK) {
            console.log("Mock Mode: Verifying OTP...");
            const name = localStorage.getItem(OTP_STORAGE_KEYS.PENDING_NAME);
            const gender = (localStorage.getItem(OTP_STORAGE_KEYS.PENDING_GENDER) || 'male') as 'male' | 'female';

            const avatarUrl = `https://api.dicebear.com/7.x/personas/svg?seed=${name}`;
            const newUser: User = {
                id: `mock-${Date.now()}`,
                email,
                name: name || 'User',
                avatar: avatarUrl,
                joinedAt: new Date()
            };

            const mockUsers = JSON.parse(localStorage.getItem(STORAGE_KEYS.ALL_USERS) || '[]');
            mockUsers.push(newUser);
            localStorage.setItem(STORAGE_KEYS.ALL_USERS, JSON.stringify(mockUsers));
            localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(newUser));

            localStorage.removeItem(OTP_STORAGE_KEYS.PENDING_EMAIL);
            localStorage.removeItem(OTP_STORAGE_KEYS.PENDING_PASSWORD);
            localStorage.removeItem(OTP_STORAGE_KEYS.PENDING_NAME);
            localStorage.removeItem(OTP_STORAGE_KEYS.PENDING_GENDER);

            return newUser;
        }

        const { data, error } = await supabase.auth.verifyOtp({
            email,
            token,
            type: 'email',
        });

        if (error) throw error;
        if (!data.user) throw new Error("OTP verification failed");

        const pendingName = localStorage.getItem(OTP_STORAGE_KEYS.PENDING_NAME) || email.split('@')[0];
        const pendingGender = (localStorage.getItem(OTP_STORAGE_KEYS.PENDING_GENDER) || 'male') as 'male' | 'female';
        const avatarUrl = `https://api.dicebear.com/7.x/personas/svg?seed=${pendingName}`;

        const { error: profileError } = await supabase
            .from('profiles')
            .upsert({
                id: data.user.id,
                email: email,
                name: pendingName,
                avatar_url: avatarUrl,
                gender: pendingGender,
                updated_at: new Date().toISOString()
            }, { onConflict: 'id' });

        if (profileError) console.error("Profile creation warning:", profileError.message);

        const newUser: User = AuthService._formatUser(data.user, { name: pendingName, avatar_url: avatarUrl });
        localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(newUser));

        localStorage.removeItem(OTP_STORAGE_KEYS.PENDING_EMAIL);
        localStorage.removeItem(OTP_STORAGE_KEYS.PENDING_PASSWORD);
        localStorage.removeItem(OTP_STORAGE_KEYS.PENDING_NAME);
        localStorage.removeItem(OTP_STORAGE_KEYS.PENDING_GENDER);

        return newUser;
    },

    // ============ LOGIN ============
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

        const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', data.user.id)
            .single();

        let userProfile = profile;

        if (!userProfile) {
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
        localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
        return user;
    },

    signup: async (name: string, email: string, password: string, gender: 'male' | 'female'): Promise<User> => {
        const avatarUrl = `https://api.dicebear.com/7.x/personas/svg?seed=${name}`;
        const metadata = { name, gender, avatar_url: avatarUrl };

        if (USE_MOCK) {
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

        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: { data: metadata }
        });

        if (error) throw error;
        if (!data.user) throw new Error("Signup failed");

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

    // ============ PASSWORD RESET WITH OTP ============
    forgotPasswordInitiate: async (email: string): Promise<void> => {
        if (USE_MOCK) {
            console.log("Mock Mode: Sending reset OTP...");
            localStorage.setItem(OTP_STORAGE_KEYS.PENDING_EMAIL, email);
            localStorage.setItem(OTP_STORAGE_KEYS.OTP_SESSION, `mock-reset-otp-${Date.now()}`);
            return;
        }

        localStorage.setItem(OTP_STORAGE_KEYS.PENDING_EMAIL, email);

        const { error } = await supabase.auth.signInWithOtp({
            email,
            options: { shouldCreateUser: false },
        });

        if (error) throw error;
    },

    verifyOtpForPasswordReset: async (email: string, token: string): Promise<string> => {
        if (USE_MOCK) {
            console.log("Mock Mode: OTP verified for password reset");
            const session = `mock-session-${Date.now()}`;
            localStorage.setItem(OTP_STORAGE_KEYS.OTP_SESSION, session);
            return session;
        }

        const { data, error } = await supabase.auth.verifyOtp({
            email,
            token,
            type: 'email',
        });

        if (error) throw error;
        if (!data.session) throw new Error("Session creation failed");

        localStorage.setItem(OTP_STORAGE_KEYS.OTP_SESSION, data.session.access_token);
        return data.session.access_token;
    },

    completePasswordReset: async (newPassword: string): Promise<void> => {
        if (USE_MOCK) {
            console.log("Mock Mode: Password reset successful");
            localStorage.removeItem(OTP_STORAGE_KEYS.PENDING_EMAIL);
            localStorage.removeItem(OTP_STORAGE_KEYS.OTP_SESSION);
            return;
        }

        const { error } = await supabase.auth.updateUser({
            password: newPassword,
        });

        if (error) throw error;

        localStorage.removeItem(OTP_STORAGE_KEYS.PENDING_EMAIL);
        localStorage.removeItem(OTP_STORAGE_KEYS.OTP_SESSION);
    },

    logout: async () => {
        await supabase.auth.signOut();
        localStorage.removeItem(STORAGE_KEYS.USER);
    },

    async forgotPassword(email: string) {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: window.location.origin,
        });
        if (error) throw error;
    },

    async syncSession(): Promise<User | null> {
        if (USE_MOCK) return AuthService.getCurrentUser();

        const { data: { session }, error } = await supabase.auth.getSession();

        if (error || !session) {
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

        try {
            const { error } = await supabase
                .from('messages')
                .delete()
                .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`);
            if (error) console.error("Non-critical: Error deleting messages:", error.message);
        } catch (e) {
            console.error("Non-critical: Exception during messages deletion:", e);
        }

        try {
            const { error } = await supabase
                .from('posts')
                .delete()
                .eq('user_id', userId);
            if (error) console.error("Non-critical: Error deleting posts:", error.message);
        } catch (e) {
            console.error("Non-critical: Exception during posts deletion:", e);
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

    getCurrentUser: (): User | null => {
        const stored = localStorage.getItem(STORAGE_KEYS.USER);
        if (stored) {
            try {
                const u = JSON.parse(stored);
                return { ...u, joinedAt: new Date(u.joinedAt) };
            } catch { return null; }
        }
        return null;
    }
};
