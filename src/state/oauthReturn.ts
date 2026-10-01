/**
 * Bookkeeping for the Google (OAuth) round-trip.
 *
 * Signing in with Google leaves the app entirely: the page goes to Google,
 * then to Supabase, then back to `/`. Two things have to survive that trip:
 *
 *   1. Where the person was (the app routes with `#/module`, and the return
 *      URL can't carry a hash of its own because Supabase puts the session
 *      tokens in the hash). It's parked in sessionStorage, which outlives the
 *      redirect in the same tab, and put back once the session lands.
 *   2. Why it failed, when it does. Supabase reports a failed round-trip as
 *      `error` / `error_code` / `error_description` in the query or hash. We
 *      read that once at startup, strip it from the address bar, and hand it
 *      to the sign-in screen as a plain sentence.
 */

const RETURN_KEY = 'kanz.oauth.return.v1';
/** A parked route older than this belongs to an abandoned attempt. */
const RETURN_TTL_MS = 15 * 60 * 1000;

const ERROR_KEYS = ['error', 'error_code', 'error_description'] as const;

/** Turn Supabase's terse OAuth error into something the person can act on. */
export function friendlyOAuthError(code: string, description: string): string {
  const c = code.toLowerCase();
  const d = description.toLowerCase();
  if (c === 'access_denied' || d.includes('denied') || d.includes('cancel')) {
    return 'Google sign-in was cancelled. Try again whenever you are ready.';
  }
  if (d.includes('not enabled') || d.includes('unsupported provider')) {
    return 'Google sign-in is not switched on for this app yet. Use your email and password for now.';
  }
  if (d.includes('database error')) {
    return 'Google approved the sign-in, but your account could not be set up. Try again in a moment.';
  }
  if (c.includes('flow_state') || d.includes('expired') || d.includes('flow state')) {
    return 'That sign-in attempt expired. Press Continue with Google to start again.';
  }
  if (d.includes('signups not allowed') || d.includes('signup is disabled')) {
    return 'New accounts are closed right now. If you already have one, sign in with your email.';
  }
  return description ? `Google sign-in did not finish: ${description}` : 'Google sign-in did not finish. Try again.';
}

/**
 * If `href` is a failed OAuth return, the message to show and the same URL
 * with the error parameters removed. `null` for any other URL.
 */
export function parseOAuthRedirectError(href: string): { message: string; cleanedUrl: string } | null {
  let u: URL;
  try {
    u = new URL(href);
  } catch {
    return null;
  }
  const query = u.searchParams;
  const hash = new URLSearchParams(u.hash.startsWith('#') ? u.hash.slice(1) : u.hash);
  const has = (p: URLSearchParams): boolean => ERROR_KEYS.some((k) => p.has(k));
  const source = has(hash) ? hash : has(query) ? query : null;
  if (!source) return null;

  const code = source.get('error_code') || source.get('error') || '';
  const description = source.get('error_description') || '';
  for (const k of ERROR_KEYS) {
    query.delete(k);
    hash.delete(k);
  }
  const search = query.toString();
  const rest = hash.toString();
  return {
    message: friendlyOAuthError(code, description),
    cleanedUrl: `${u.pathname}${search ? `?${search}` : ''}${rest ? `#${rest}` : ''}`,
  };
}

/** Park the current `#/module` route before leaving for Google. */
export function rememberReturnRoute(hash: string): void {
  try {
    sessionStorage.setItem(RETURN_KEY, JSON.stringify({ hash, at: Date.now() }));
  } catch {
    /* private mode — the person just lands on Home afterwards */
  }
}

/** The parked route, if a recent one exists. Reading it clears it. */
export function takeReturnRoute(now = Date.now()): string | null {
  try {
    const raw = sessionStorage.getItem(RETURN_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(RETURN_KEY);
    const parsed = JSON.parse(raw) as { hash?: unknown; at?: unknown };
    if (typeof parsed.hash !== 'string' || typeof parsed.at !== 'number') return null;
    if (now - parsed.at > RETURN_TTL_MS) return null;
    // Only ever restore an in-app route, never anything else that got in there.
    return /^#\/[a-z]+$/.test(parsed.hash) ? parsed.hash : null;
  } catch {
    return null;
  }
}
