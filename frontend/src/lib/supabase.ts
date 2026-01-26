import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Supabase credentials missing. App is running in Mock Mode.');
} else {
    console.log('Supabase Connected:', {
        url: supabaseUrl.substring(0, 15) + '...',
        hasKey: !!supabaseAnonKey
    });
}

const finalUrl = supabaseUrl.startsWith('http') ? supabaseUrl : 'https://placeholder.supabase.co';
const finalKey = supabaseAnonKey || 'mock-key';

export const USE_MOCK = !supabaseUrl || !supabaseAnonKey || import.meta.env.VITE_USE_MOCK === 'true';

export const supabase = createClient(finalUrl, finalKey);

export const checkConnection = async () => {
    try {
        if (USE_MOCK) return { connected: true, mode: 'mock' };

        const { error } = await supabase.from('posts').select('count', { count: 'exact', head: true });
        if (error && error.code !== 'PGRST116') { // PGRST116 is just no result, which is fine for connection check
            console.error("Supabase connection check failed:", error);
            return { connected: false, error: error.message };
        }
        return { connected: true, mode: 'supabase' };
    } catch (e: any) {
        return { connected: false, error: e.message };
    }
};
