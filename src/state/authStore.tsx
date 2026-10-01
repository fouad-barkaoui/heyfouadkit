import type { Session, User } from '@supabase/supabase-js';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  AVATAR_EVENT,
  blobToDataUrl,
  pruneCloudAvatars,
  readLocalAvatar,
  uploadCloudAvatar,
  writeLocalAvatar,
} from '@/data/avatar';
import { cloudConfigured, fetchEnabledProviders, getSupabase } from '@/data/supabaseClient';
import { parseOAuthRedirectError, rememberReturnRoute, takeReturnRoute } from './oauthReturn';

export type AuthResult =
  | { ok: true; message?: string; signedIn?: boolean }
  | { ok: false; error: string };

/** Whether the Google button should be offered: switched on in Supabase,
 * switched off, still asking, or unknown because the check couldn't run. */
export type GoogleStatus = 'checking' | 'on' | 'off' | 'unknown';

/**
 * A failed Google round-trip comes back as error parameters in the URL.
 * Read them once, before the router or the Supabase client look at the
 * address bar, clean them out, and keep the message for the sign-in screen.
 */
const initialOAuthError: string | null = (() => {
  if (typeof window === 'undefined') return null;
  const parsed = parseOAuthRedirectError(window.location.href);
  if (!parsed) return null;
  const back = takeReturnRoute();
  try {
    window.history.replaceState(window.history.state, '', back ? `${parsed.cleanedUrl.split('#')[0]}${back}` : parsed.cleanedUrl);
  } catch {
    /* sandboxed frame — the stale parameters are harmless */
  }
  return parsed.message;
})();

interface AuthContextValue {
  configured: boolean;
  ready: boolean;
  user: User | null;
  session: Session | null;
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signUp: (email: string, password: string, username?: string) => Promise<AuthResult>;
  /** Leaves the page for Google; only resolves (with an error) if it couldn't. */
  signInWithGoogle: () => Promise<AuthResult>;
  googleStatus: GoogleStatus;
  /** Why the last Google round-trip failed, until the sign-in screen shows it. */
  oauthError: string | null;
  clearOAuthError: () => void;
  signOut: () => Promise<void>;
  sendReset: (email: string) => Promise<AuthResult>;
  changePassword: (next: string) => Promise<AuthResult>;
  updateUsername: (next: string) => Promise<AuthResult>;
  /** The profile picture to show for whoever is using the app right now —
   * the account's cloud picture when signed in, a device-local one otherwise. */
  avatarUrl: string | null;
  /** Save a cropped picture (or `null` to remove it). */
  setAvatar: (image: Blob | null) => Promise<AuthResult>;
  /** Merge keys into the account's metadata (consents, "what's new" seen…). Best effort. */
  updateMeta: (data: Record<string, unknown>) => Promise<boolean>;
}

/**
 * The account's profile picture URL, if there is one.
 *
 * A picture the person chose lives in `avatar_custom` (an empty string means
 * they removed it on purpose). That key exists because Supabase rewrites
 * `avatar_url` with the Google photo on every Google sign-in, which would
 * otherwise wipe out an uploaded picture. Without a choice of their own, the
 * Google photo is used.
 */
export function getAvatarUrl(user: User | null): string | null {
  if (!user) return null;
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  if (typeof meta.avatar_custom === 'string') return meta.avatar_custom || null;
  for (const k of ['avatar_url', 'picture'] as const) {
    const v = meta[k];
    if (typeof v === 'string' && v) return v;
  }
  return null;
}

/** Up to two initials for the no-picture fallback. */
export function getInitials(name: string): string {
  const parts = name.trim().split(/[\s._-]+/).filter(Boolean);
  if (parts.length === 0) return '·';
  const first = parts[0]!.charAt(0);
  const second = parts.length > 1 ? parts[parts.length - 1]!.charAt(0) : '';
  return (first + second).toUpperCase();
}

/** The username the person chose, else the name on their Google account,
 * else a name derived from their email. */
export function getDisplayName(user: User | null): string {
  if (!user) return '';
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  for (const k of ['username', 'full_name', 'name'] as const) {
    const v = typeof meta[k] === 'string' ? (meta[k] as string).trim() : '';
    if (v) return v;
  }
  return user.email ? (user.email.split('@')[0] ?? user.email) : 'there';
}

const USERNAME_PATTERN = /^[a-zA-Z0-9 _-]+$/;

function validateUsername(raw: string): string | null {
  const trimmed = raw.trim();
  if (trimmed.length < 2 || trimmed.length > 24) return 'Usernames are 2–24 characters.';
  if (!USERNAME_PATTERN.test(trimmed)) return 'Use only letters, numbers, spaces, - and _.';
  return null;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Supabase's client throws a bare "Failed to fetch" on almost any transient
 * network hiccup — a flaky wifi handoff, a request that raced the tab
 * waking from sleep, a VPN blip — not just a real outage. One quiet retry
 * clears the vast majority of these without bothering the person; only a
 * genuinely sustained connectivity problem still surfaces the error.
 */
async function withRetry<T extends { error: { message: string } | null }>(run: () => Promise<T>): Promise<T> {
  const first = await run();
  if (!first.error) return first;
  const msg = first.error.message.toLowerCase();
  const transient = msg.includes('failed to fetch') || msg.includes('network') || msg.includes('load failed');
  if (!transient) return first;
  await new Promise((resolve) => window.setTimeout(resolve, 800));
  return run();
}

/** Supabase phrases these tersely; the UI should say what to do next. */
function friendly(message: string): string {
  const m = message.toLowerCase();
  if (m.includes('invalid login credentials')) return 'That email and password combination does not match an account.';
  if (m.includes('user already registered')) return 'An account with that email already exists — sign in instead.';
  if (m.includes('password should be')) return 'Use a password of at least 6 characters.';
  if (m.includes('email not confirmed')) return 'Confirm the email we sent you, then sign in.';
  if (m.includes('rate limit') || m.includes('too many')) return 'Too many attempts. Wait a minute and try again.';
  if (m.includes('failed to fetch') || m.includes('network')) return 'No connection to the cloud right now — your work stays saved on this device.';
  return message;
}

function isOfflineAuthError(error: { name?: string; message?: string; status?: number }): boolean {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return true;
  const m = `${error.name ?? ''} ${error.message ?? ''}`.toLowerCase();
  return m.includes('retryable') || m.includes('fetch') || m.includes('network') || error.status === 0;
}

/** The last session this device saw (supabase-js keeps it under our storage key). */
function readStoredSession(): Session | null {
  try {
    const raw = window.localStorage.getItem('heyfouad.auth');
    const parsed = raw ? (JSON.parse(raw) as Session) : null;
    return parsed?.user && parsed.access_token ? parsed : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }): JSX.Element {
  const supabase = useMemo(() => getSupabase(), []);
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(!cloudConfigured);

  useEffect(() => {
    if (!supabase) return;
    let cancelled = false;

    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (cancelled) return;
        // Offline with an expired token the refresh can't run, and the client
        // reports "no session". The person hasn't signed out — keep them in
        // (reads come from this device, writes queue) until the network is
        // back and the token refreshes on its own.
        if (!data.session && error && isOfflineAuthError(error)) setSession(readStoredSession());
        else setSession(data.session);
      })
      .catch(() => {
        if (!cancelled) setSession(readStoredSession());
      })
      .finally(() => {
        if (!cancelled) setReady(true);
      });

    const { data: sub } = supabase.auth.onAuthStateChange((event, next) => {
      if (event === 'INITIAL_SESSION' && !next) return; // getSession() above decides
      setSession(next);
      // Back from Google: put the person on the screen they started from.
      if (event === 'SIGNED_IN' && next) {
        const back = takeReturnRoute();
        if (back && window.location.hash !== back) window.location.hash = back.slice(1);
      }
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [supabase]);

  /* ── Google ──────────────────────────────────────────────────────── */
  const [googleStatus, setGoogleStatus] = useState<GoogleStatus>(cloudConfigured ? 'checking' : 'off');
  const [oauthError, setOAuthError] = useState<string | null>(initialOAuthError);
  const clearOAuthError = useCallback(() => setOAuthError(null), []);

  // Ask Supabase whether Google is switched on, so the button only appears
  // once the provider is configured — no dead button, no raw error page.
  useEffect(() => {
    if (!cloudConfigured) return;
    const ctl = new AbortController();
    void fetchEnabledProviders(ctl.signal).then((providers) => {
      if (ctl.signal.aborted) return;
      setGoogleStatus(providers ? (providers.google ? 'on' : 'off') : 'unknown');
    });
    return () => ctl.abort();
  }, []);

  const signIn = useCallback(
    async (email: string, password: string): Promise<AuthResult> => {
      if (!supabase) return { ok: false, error: 'This build is not connected to a cloud project.' };
      const { error } = await withRetry(() => supabase.auth.signInWithPassword({ email: email.trim(), password }));
      return error ? { ok: false, error: friendly(error.message) } : { ok: true };
    },
    [supabase],
  );

  const signUp = useCallback(
    async (email: string, password: string, username?: string): Promise<AuthResult> => {
      if (!supabase) return { ok: false, error: 'This build is not connected to a cloud project.' };
      const trimmedUsername = username?.trim();
      if (trimmedUsername) {
        const problem = validateUsername(trimmedUsername);
        if (problem) return { ok: false, error: problem };
      }
      const { data, error } = await withRetry(() =>
        supabase.auth.signUp({
          email: email.trim(),
          password,
          ...(trimmedUsername ? { options: { data: { username: trimmedUsername } } } : {}),
        }),
      );
      if (error) return { ok: false, error: friendly(error.message) };
      if (!data.session) {
        return {
          ok: true,
          signedIn: false,
          message: 'Account created. Check your inbox to confirm the address, then sign in.',
        };
      }
      return { ok: true, signedIn: true, message: 'Account created — you are signed in.' };
    },
    [supabase],
  );

  /** Redirects to Google, then back here. Requires the Google provider to be
   * switched on in the Supabase project's Auth settings, and this origin to
   * be on its Redirect URLs allow list. */
  const signInWithGoogle = useCallback(async (): Promise<AuthResult> => {
    if (!supabase) return { ok: false, error: 'This build is not connected to a cloud project.' };
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      return { ok: false, error: 'You are offline. Connect to the internet to sign in with Google.' };
    }
    if (googleStatus === 'off') {
      return { ok: false, error: 'Google sign-in is not switched on for this app yet. Use your email and password for now.' };
    }
    rememberReturnRoute(window.location.hash);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        // Trailing slash so it matches an allow-list entry like https://host/**.
        redirectTo: `${window.location.origin}/`,
        // Always show Google's account chooser, so someone with several
        // Google accounts (or on a shared computer) picks the right one.
        queryParams: { prompt: 'select_account' },
      },
    });
    if (error) {
      takeReturnRoute();
      return { ok: false, error: friendly(error.message) };
    }
    return { ok: true };
  }, [supabase, googleStatus]);

  const signOut = useCallback(async () => {
    await supabase?.auth.signOut();
  }, [supabase]);

  const sendReset = useCallback(
    async (email: string): Promise<AuthResult> => {
      if (!supabase) return { ok: false, error: 'This build is not connected to a cloud project.' };
      const { error } = await withRetry(() =>
        supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: window.location.origin }),
      );
      return error
        ? { ok: false, error: friendly(error.message) }
        : { ok: true, message: 'If that address has an account, a reset link is on its way.' };
    },
    [supabase],
  );

  /** Set a new password for the signed-in account, without leaving the app. */
  const changePassword = useCallback(
    async (next: string): Promise<AuthResult> => {
      if (!supabase) return { ok: false, error: 'This build is not connected to a cloud project.' };
      if (next.length < 8) return { ok: false, error: 'Use a password of at least 8 characters.' };
      const { error } = await supabase.auth.updateUser({ password: next });
      return error
        ? { ok: false, error: friendly(error.message) }
        : { ok: true, message: 'Password updated. Use it the next time you sign in.' };
    },
    [supabase],
  );

  /** Set or change the display name shown instead of the account's email. */
  const updateUsername = useCallback(
    async (next: string): Promise<AuthResult> => {
      if (!supabase) return { ok: false, error: 'This build is not connected to a cloud project.' };
      const problem = validateUsername(next);
      if (problem) return { ok: false, error: problem };
      const { error } = await supabase.auth.updateUser({ data: { username: next.trim() } });
      return error ? { ok: false, error: friendly(error.message) } : { ok: true, message: 'Username updated.' };
    },
    [supabase],
  );

  /* ── Profile picture ─────────────────────────────────────────────── */
  const [localAvatar, setLocalAvatar] = useState<string | null>(() =>
    typeof window === 'undefined' ? null : readLocalAvatar(),
  );
  useEffect(() => {
    const sync = (): void => setLocalAvatar(readLocalAvatar());
    window.addEventListener(AVATAR_EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(AVATAR_EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  const user = session?.user ?? null;
  const avatarUrl = user ? getAvatarUrl(user) : localAvatar;

  const setAvatar = useCallback(
    async (image: Blob | null): Promise<AuthResult> => {
      const current = session?.user ?? null;
      // No account: the picture lives only in this browser.
      if (!current || !supabase) {
        if (!image) {
          writeLocalAvatar(null);
          return { ok: true, message: 'Picture removed.' };
        }
        const saved = writeLocalAvatar(await blobToDataUrl(image));
        return saved
          ? { ok: true, message: 'Picture saved on this device.' }
          : { ok: false, error: 'This browser would not let us save the picture (storage is full or blocked).' };
      }
      try {
        // Written to both keys: `avatar_custom` is the one Google sign-ins
        // leave alone (see getAvatarUrl); '' records an explicit removal.
        if (!image) {
          const { data, error } = await supabase.auth.updateUser({ data: { avatar_url: null, avatar_custom: '' } });
          if (error) return { ok: false, error: friendly(error.message) };
          if (data.user) setSession((s) => (s ? { ...s, user: data.user } : s));
          void pruneCloudAvatars(current.id, null);
          return { ok: true, message: 'Picture removed.' };
        }
        const url = await uploadCloudAvatar(current.id, image);
        const { data, error } = await supabase.auth.updateUser({ data: { avatar_url: url, avatar_custom: url } });
        if (error) return { ok: false, error: friendly(error.message) };
        if (data.user) setSession((s) => (s ? { ...s, user: data.user } : s));
        return { ok: true, message: 'Profile picture updated.' };
      } catch (err) {
        return { ok: false, error: friendly(err instanceof Error ? err.message : String(err)) };
      }
    },
    [session, supabase],
  );

  const updateMeta = useCallback(
    async (data: Record<string, unknown>): Promise<boolean> => {
      if (!supabase || !session?.user) return false;
      try {
        const { data: res, error } = await withRetry(() => supabase.auth.updateUser({ data }));
        if (error) return false;
        if (res.user) setSession((s) => (s ? { ...s, user: res.user } : s));
        return true;
      } catch {
        return false;
      }
    },
    [session, supabase],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      configured: cloudConfigured,
      ready,
      user: session?.user ?? null,
      session,
      signIn,
      signUp,
      signInWithGoogle,
      googleStatus,
      oauthError,
      clearOAuthError,
      signOut,
      sendReset,
      changePassword,
      updateUsername,
      avatarUrl,
      setAvatar,
      updateMeta,
    }),
    [
      ready,
      session,
      signIn,
      signUp,
      signInWithGoogle,
      googleStatus,
      oauthError,
      clearOAuthError,
      signOut,
      sendReset,
      changePassword,
      updateUsername,
      avatarUrl,
      setAvatar,
      updateMeta,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
