
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  throw new Error(
    'Please define VITE_SUPABASE_URL in your Supabase project settings'
  );
}

if (!supabaseAnonKey) {
  throw new Error(
    'Please define VITE_SUPABASE_ANON_KEY in your Supabase project settings'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
