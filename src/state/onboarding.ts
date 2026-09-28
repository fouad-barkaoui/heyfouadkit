import type { User } from '@supabase/supabase-js';

/**
 * Consent + "what's new" bookkeeping.
 *
 * Every decision is asked ONCE per person, for life: signed in, it is stored
 * on the account itself (Supabase user_metadata), so it follows the person
 * to every browser and device; a local mirror makes it apply instantly and
 * covers visitors who never sign in. Accepting and declining are both final.
 */

export type ConsentKey = 'cookies' | 'terms';
export type ConsentValue = 'accepted' | 'declined';

/** Bump when there is something new to announce — everyone sees it once. */
export const WHATS_NEW_RELEASE = '2026-09-saveit';

/** Kept for AuthOverlay, which still flags a fresh sign-in in this tab. */
export const JUST_AUTHED_KEY = 'heyfouad.justAuthed.v1';

const LEGACY_COOKIE_KEY = 'heyfouad.cookieConsent.v1';
const legacyTermsKey = (uid: string): string => `heyfouad.cloudTerms.${uid}`;
const localKey = (key: ConsentKey, uid: string | null): string =>
  key === 'cookies' ? LEGACY_COOKIE_KEY : legacyTermsKey(uid ?? 'guest');
const whatsNewKey = (uid: string): string => `heyfouad.whatsNew.${uid}`;

function safeGet(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}
function safeSet(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* private mode — the account copy still holds it */
  }
}

function asValue(raw: unknown): ConsentValue | null {
  if (raw === 'accepted' || raw === '1') return 'accepted';
  if (raw === 'declined') return 'declined';
  return null;
}

interface ConsentRecord {
  v: ConsentValue;
  at: string;
}
type ConsentMeta = Partial<Record<ConsentKey, ConsentRecord>>;

export function accountConsents(user: User | null): ConsentMeta {
  const raw = (user?.user_metadata as Record<string, unknown> | undefined)?.consents;
  if (!raw || typeof raw !== 'object') return {};
  const out: ConsentMeta = {};
  for (const k of ['cookies', 'terms'] as const) {
    const rec = (raw as Record<string, unknown>)[k] as Record<string, unknown> | undefined;
    const v = asValue(rec?.v);
    if (v) out[k] = { v, at: typeof rec?.at === 'string' ? rec.at : '' };
  }
  return out;
}

/** The standing decision, if one was ever made — account first, then this device. */
export function consentDecision(key: ConsentKey, user: User | null): ConsentValue | null {
  const acct = accountConsents(user)[key]?.v;
  if (acct) return acct;
  return asValue(safeGet(localKey(key, user?.id ?? null)));
}

export function rememberConsentLocally(key: ConsentKey, value: ConsentValue, user: User | null): void {
  safeSet(localKey(key, user?.id ?? null), value);
}

/** The metadata patch that records a decision on the account (merge with existing consents). */
export function consentMetaPatch(user: User | null, key: ConsentKey, value: ConsentValue): Record<string, unknown> {
  return { consents: { ...accountConsents(user), [key]: { v: value, at: new Date().toISOString() } } };
}

/** Decisions made on this device before signing in, that the account doesn't know yet. */
export function unsyncedLocalConsents(user: User | null): Partial<Record<ConsentKey, ConsentValue>> {
  if (!user) return {};
  const acct = accountConsents(user);
  const out: Partial<Record<ConsentKey, ConsentValue>> = {};
  for (const k of ['cookies', 'terms'] as const) {
    const local = asValue(safeGet(localKey(k, user.id)));
    if (local && !acct[k]) out[k] = local;
  }
  return out;
}

export function hasSeenWhatsNew(user: User | null): boolean {
  if (!user) return true;
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  return meta.whats_new_seen === WHATS_NEW_RELEASE || safeGet(whatsNewKey(user.id)) === WHATS_NEW_RELEASE;
}

export function rememberWhatsNewLocally(user: User): void {
  safeSet(whatsNewKey(user.id), WHATS_NEW_RELEASE);
}
