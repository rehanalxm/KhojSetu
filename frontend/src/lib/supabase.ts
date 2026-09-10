import { createClient } from '@supabase/supabase-js';

// ---------------------------------------------------------------------------
// Supabase Production Configuration
// ---------------------------------------------------------------------------
const supabaseUrl =
    import.meta.env.VITE_SUPABASE_URL ||
    'https://bbbgcrzlsvjmwjhlzycw.supabase.co';

const supabaseAnonKey =
    import.meta.env.VITE_SUPABASE_ANON_KEY ||
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJiYmdjcnpsc3ZqbXdqaGx6eWN3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1NTMzMDYsImV4cCI6MjA4ODEyOTMwNn0.oNooioUEdDTdkDMdXWpFA7gzWuN4T_sDkygcP-dyPzE';

if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('⚠️ Supabase URL or Anon Key is missing. Check your .env configuration.');
} else {
    console.log(
        '%c🟢 KhojSetu connected to Supabase Database',
        'color: #22c55e; font-weight: bold; font-size: 14px;'
    );
}

// Create the Supabase client with auth persistence enabled
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
    error?: string;
}> => {
    try {
        const { error } = await supabase
            .from('posts')
            .select('count', { count: 'exact', head: true });

        if (error && error.code !== 'PGRST116') {
            console.error('Supabase connection check failed:', error);
            return { connected: false, error: error.message };
        }
        return { connected: true };
    } catch (e: any) {
        return { connected: false, error: e.message };
    }
};
