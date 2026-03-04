
import { createClient } from '@supabase/supabase-js';

const URL = 'https://bbbgcrzlsvjmwjhlzycw.supabase.co';
const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJiYmdjcnpsc3ZqbXdqaGx6eWN3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1NTMzMDYsImV4cCI6MjA4ODEyOTMwNn0.oNooioUEdDTdkDMdXWpFA7gzWuN4T_sDkygcP-dyPzE';

const supabase = createClient(URL, KEY);

async function diagnostic() {
    console.log('--- Deep Query Diagnostic ---');

    // Test 1: Basic Select
    console.log('Test 1: Basic posts fetch...');
    const { data: b1, error: e1 } = await supabase.from('posts').select('*').limit(1);
    if (e1) console.error('T1 Failed:', e1.message);
    else console.log('T1 Success! Found post with ID:', b1[0]?.id);

    // Test 2: The Join query
    console.log('Test 2: Join fetch (profiles!user_id)...');
    const { data: b2, error: e2 } = await supabase
        .from('posts')
        .select(`*, profiles!user_id (name)`)
        .limit(1);

    if (e2) {
        console.error('❌ T2 Failed (Join Error):', e2.message);
        console.log('Attempting alternative join (profiles!id)...');
        const { data: b3, error: e3 } = await supabase
            .from('posts')
            .select(`*, profiles!id (name)`)
            .limit(1);
        if (e3) {
            console.error('❌ T3 Failed (Alternative Join Failed):', e3.message);
            console.log('Attempting simple join (profiles)...');
            const { data: b4, error: e4 } = await supabase
                .from('posts')
                .select(`*, profiles(name)`)
                .limit(1);
            if (e4) {
                console.error('❌ T4 Failed (Simple Join Failed):', e4.message);
            } else {
                console.log('✅ T4 Success! Use profiles(name)');
            }
        } else {
            console.log('✅ T3 Success! Use profiles!id(name)');
        }
    } else {
        console.log('✅ T2 Success! Join is working perfectly.');
    }
}

diagnostic();
