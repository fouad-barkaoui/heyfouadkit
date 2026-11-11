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
        storageKey: 'kanz.auth',
      },
    });
  }
  return client;
}

/**
 * Which external sign-in providers the project has switched on, read from
 * Supabase Auth's public settings endpoint. `null` when it can't be reached,
 * so callers can tell "off" apart from "don't know".
 */
export async function fetchEnabledProviders(signal?: AbortSignal): Promise<Record<string, boolean> | null> {
  if (!cloudConfigured) return null;
  // Bounded, so a backend that never answers reads as "can't reach it"
  // instead of leaving the sign-in screen waiting forever.
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 8000);
  signal?.addEventListener('abort', () => ctl.abort(), { once: true });
  try {
    const res = await fetch(`${url as string}/auth/v1/settings`, {
      headers: { apikey: key as string },
      signal: ctl.signal,
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { external?: Record<string, boolean> };
    return body.external ?? null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// Kept as-is on purpose: this is the actual bucket id already created and
// policed in the live Supabase project (see supabase/schema.sql). Renaming
// it here without renaming/migrating the real bucket would break every
// existing and new file upload, so it doesn't follow the app's rebrand.
export const STORAGE_BUCKET = 'nexus-media';
