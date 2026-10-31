import { createClient, SupabaseClient } from '@supabase/supabase-js';

// ---------------------------------------------------------------------
// Supabase connection settings
//
// Read from VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY at build time. If those
// are missing or malformed (e.g. not set for the Vercel environment, wrapped
// in quotes), fall back to this project's public values below.
//
// Both fallback values are PUBLIC by design: the project URL and the
// publishable key ship in every browser bundle and access is enforced by
// Row Level Security. Never put a secret / service_role key here.
// ---------------------------------------------------------------------
const DEFAULT_SUPABASE_URL = 'https://zednjokmaubhlwvhhtzb.supabase.co';
const DEFAULT_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_-NTkMHrRHgGCTP8YwcXWIg_ABwP0RHr';

const clean = (value: unknown): string =>
  typeof value === 'string' ? value.trim().replace(/^["']|["']$/g, '').trim() : '';

const isValidUrl = (url: string): boolean => /^https:\/\/[a-z0-9-]+\.supabase\.(co|in)\/?$/i.test(url);

// Publishable keys (sb_publishable_...) or legacy anon JWTs (eyJ...). Secret keys are rejected.
const isBrowserSafeKey = (key: string): boolean =>
  key.startsWith('sb_publishable_') || (key.startsWith('eyJ') && key.split('.').length === 3);

const envUrl = clean(import.meta.env.VITE_SUPABASE_URL);
const envKey = clean(import.meta.env.VITE_SUPABASE_ANON_KEY);

if (envKey.startsWith('sb_secret_')) {
  console.error(
    '[KBZLife LMS] VITE_SUPABASE_ANON_KEY contains a SECRET key. It is exposed to every browser - rotate it in Supabase now and use the publishable key instead.'
  );
}

const supabaseUrl = (isValidUrl(envUrl) ? envUrl : DEFAULT_SUPABASE_URL).replace(/\/$/, '');
const supabaseAnonKey = isBrowserSafeKey(envKey) ? envKey : DEFAULT_SUPABASE_PUBLISHABLE_KEY;

export const isSupabaseConfigured = (): boolean => isValidUrl(supabaseUrl) && isBrowserSafeKey(supabaseAnonKey);

// Singleton client instance
let supabaseInstance: SupabaseClient | null = null;

export const getSupabaseClient = (): SupabaseClient | null => {
  if (!isSupabaseConfigured()) {
    return null;
  }
  if (!supabaseInstance) {
    try {
      supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
        },
      });
    } catch (err) {
      console.error('[KBZLife LMS] Failed to initialize Supabase client:', err);
      return null;
    }
  }
  return supabaseInstance;
};

export const getSupabaseConfig = () => {
  return {
    url: supabaseUrl,
    anonKey: supabaseAnonKey,
    isConfigured: isSupabaseConfigured(),
  };
};

export const testSupabaseConnection = async (): Promise<{
  success: boolean;
  message: string;
  details?: unknown;
}> => {
  const client = getSupabaseClient();
  if (!client) {
    return {
      success: false,
      message: 'Supabase credentials are not configured in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.',
    };
  }

  try {
    const { data, error } = await client.from('profiles').select('id, full_name, role').limit(1);
    if (error) {
      return {
        success: false,
        message: `Supabase query error: ${error.message} (Code: ${error.code})`,
        details: error,
      };
    }
    return {
      success: true,
      message: 'Successfully connected to Supabase PostgreSQL database! Profiles table verified.',
      details: data,
    };
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      message: `Connection failed: ${errorMessage}`,
      details: err,
    };
  }
};
