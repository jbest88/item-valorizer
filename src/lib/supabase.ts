
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../integrations/supabase/types';

const SUPABASE_URL = "https://dhsmmzgkbjedmfhrvsdw.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRoc21temdrYmplZG1maHJ2c2R3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDAyMzY3MzEsImV4cCI6MjA1NTgxMjczMX0.BADNdzTgicsIVfftq5wS_a360HsyK8gI36GWf7aKPok";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY);
