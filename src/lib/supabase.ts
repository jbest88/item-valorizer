
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client with project values
export const supabase = createClient(
  'https://dhsmmzgkbjedmfhrvsdw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRoc21temdrYmplZG1maHJ2c2R3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDAyMzY3MzEsImV4cCI6MjA1NTgxMjczMX0.BADNdzTgicsIVfftq5wS_a360HsyK8gI36GWf7aKPok'
);
