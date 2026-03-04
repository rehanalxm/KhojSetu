import { createClient } from '@supabase/supabase-js';

// ---------------------------------------------------------------------------
// Supabase Configuration (LOCKED FOR SHOWCASE)
// ---------------------------------------------------------------------------
const LATEST_URL = 'https://bbbgcrzlsvjmwjhlzycw.supabase.co';
const LATEST_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJiYmdjcnpsc3ZqbXdqaGx6eWN3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1NTMzMDYsImV4cCI6MjA4ODEyOTMwNn0.oNooioUEdDTdkDMdXWpFA7gzWuN4T_sDkygcP-dyPzE';

// Determine whether to run in mock mode
const getMockMode = () => {
    try {
        // Force Live Mode for showcase unless explicitly overridden in console
        const forceMock = localStorage.getItem('khojsetu_force_mock');
        if (forceMock === 'true') return true;
        if (forceMock === 'false') return false;

        // Default to Live Mode (false) unless the environment variable is explicitly 'true'
        return import.meta.env.VITE_USE_MOCK === 'true';
    } catch {
        return false;
    }
};

export const USE_MOCK = getMockMode();

// Create the Supabase client with FORCED LATEST credentials
export const supabase = createClient(LATEST_URL, LATEST_KEY, {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
    }
});

// ---------------------------------------------------------------------------
// Connection health check
// ---------------------------------------------------------------------------
export const checkConnection = async (): Promise<{
    connected: boolean;
    mode: 'mock' | 'supabase';
    error?: string;
}> => {
    if (USE_MOCK) {
        return { connected: true, mode: 'mock' };
    }

    try {
        const { error } = await supabase
            .from('posts')
            .select('count', { count: 'exact', head: true });

        if (error && error.code !== 'PGRST116') {
            console.error('Supabase connection check failed:', error);
            return { connected: false, mode: 'supabase', error: error.message };
        }
        return { connected: true, mode: 'supabase' };
    } catch (e: any) {
        console.error('Connection health check exception:', e);
        return { connected: false, mode: 'supabase', error: e.message };
    }
};
