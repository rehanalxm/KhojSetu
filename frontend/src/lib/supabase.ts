import { createClient } from '@supabase/supabase-js';

// ---------------------------------------------------------------------------
// Supabase Configuration
// ---------------------------------------------------------------------------
// Hardcoded credentials (env vars were not loading reliably on this system)
const SUPABASE_URL = 'https://bbbgcrzlsvjmwjhlzycw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJiYmdjcnpsc3ZqbXdqaGx6eWN3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1NTMzMDYsImV4cCI6MjA4ODEyOTMwNn0.oNooioUEdDTdkDMdXWpFA7gzWuN4T_sDkygcP-dyPzE';

// ---- MOCK MODE TOGGLE ----
// Set to true  → app uses localStorage (no database needed)
// Set to false → app uses real Supabase (tables must exist)


// Prefer environment variables, fallback to hardcoded values for maximum reliability
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || SUPABASE_ANON_KEY;

// Determine whether to run in mock mode
// ROBUST CHECK: Fallback to true if env is missing OR if localStorage has a force flag
const getMockMode = () => {
    try {
        const forceMock = localStorage.getItem('khojsetu_force_mock');
        if (forceMock === 'true') return true;
        if (forceMock === 'false') return false;

        // Default behavior: check env
        const envValue = import.meta.env.VITE_USE_MOCK;
        if (envValue === undefined) {
            console.warn('VITE_USE_MOCK is undefined, defaulting to MOCK MODE for safety');
            return true;
        }
        return envValue === 'true';
    } catch {
        return true;
    }
};

export const USE_MOCK = getMockMode();

// Log startup mode clearly
if (USE_MOCK) {
    console.log(
        '%c🟡 KhojSetu running in MOCK MODE (localStorage)',
        'color: #f59e0b; font-weight: bold; font-size: 14px;'
    );
} else {
    console.log(
        '%c🟢 KhojSetu connected to Supabase',
        'color: #22c55e; font-weight: bold; font-size: 14px;',
        { url: supabaseUrl.substring(0, 30) + '...' }
    );
}

// Create the Supabase client with persistence enabled
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
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
