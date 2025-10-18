import { createClient } from '@supabase/supabase-js';

// Supabase client for frontend (anon key - safe for public access)
// case_screen table has RLS disabled for public read access
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('[Supabase] Missing environment variables!', {
    hasUrl: !!supabaseUrl,
    hasKey: !!supabaseAnonKey
  });
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

console.log('[Supabase] Client initialized:', {
  url: supabaseUrl,
  hasKey: !!supabaseAnonKey
});
