import { createClient } from '@supabase/supabase-js';

// Helper to safely access environment variables.
// This is a bit ugly, but it lets us use the same code in Vite (import.meta) 
// and potentially other environments (process.env) without refactoring later.
const getEnvVar = (key: string) => {
  try {
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env) {
      // @ts-ignore
      return import.meta.env[key];
    }
  } catch (e) {
    // quiet fail
  }

  try {
    if (typeof process !== 'undefined' && process.env) {
      return process.env[key];
    }
  } catch (e) {
    // quiet fail
  }
  
  return undefined;
};

const supabaseUrl = getEnvVar('VITE_SUPABASE_URL');
const supabaseAnonKey = getEnvVar('VITE_SUPABASE_ANON_KEY');

// Only create the client if we actually have keys.
// This prevents the app from crashing in "Offline Demo Mode".
export const supabase = supabaseUrl && supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : null;

export const isSupabaseConfigured = () => !!supabase;