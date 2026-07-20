import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase configuration. Copy `.env.example` to `.env` and fill in EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.',
  );
}

/**
 * Single shared Supabase client for the whole app.
 * AsyncStorage keeps the user logged in between app restarts.
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // On native, sessions are stored in AsyncStorage. On web (and during
    // server rendering) supabase-js falls back to its own safe default.
    ...(Platform.OS !== 'web' ? { storage: AsyncStorage } : {}),
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
