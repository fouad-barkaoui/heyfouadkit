import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/** True when this build is wired to a Supabase project at all. */
export const cloudConfigured = Boolean(url && key);

let client: SupabaseClient | null = null;

/**
 * Single shared client — auth, database and storage all ride on the same
 * session, so signing in once unlocks every cloud feature at once.
 */
export function getSupabase(): SupabaseClient | null {
  if (!cloudConfigured) return null;
  if (!client) {
    client = createClient(url as string, key as string, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: 'heyfouad.auth',
      },
    });
  }
  return client;
}

// Kept as-is on purpose: this is the actual bucket id already created and
// policed in the live Supabase project (see supabase/schema.sql). Renaming
// it here without renaming/migrating the real bucket would break every
// existing and new file upload, so it doesn't follow the app's rebrand.
export const STORAGE_BUCKET = 'nexus-media';
