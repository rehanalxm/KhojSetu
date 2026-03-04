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


// Read from env if available, fallback to hardcoded values
// FORCE: Unconditionally use the hardcoded values to bypass any Vite caching of the old URL
const supabaseUrl = SUPABASE_URL;
const supabaseAnonKey = SUPABASE_ANON_KEY;

// Determine whether to run in mock mode
export const USE_MOCK = false; // SWITCH TO LIVE DATABASE

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

// Create the Supabase client with NO persistence (fix "default logging" on refresh)
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        persistSession: false,
        autoRefreshToken: false,
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
        return { connected: false, mode: 'supabase', error: e.message };
    }
};
