import type { User } from '@supabase/supabase-js';

/**
 * Accounts that always have full access, regardless of subscription state.
 * There's no roles table (and no billing provider) yet, so this is a plain
 * allowlist by email — the simplest thing that works for a single-admin
 * app. Sign in with one of these addresses (via the normal sign-up flow —
 * Settings → Account lets you set the display name and change the password
 * afterward) to get admin access.
 */
const ADMIN_EMAILS = ['lmorfouad3@gmail.com'];

export function isAdminUser(user: User | null): boolean {
  if (!user?.email) return false;
  return ADMIN_EMAILS.includes(user.email.trim().toLowerCase());
}

/**
 * No payment provider is wired up yet, so nobody has a paid subscription
 * until that lands (Stripe, or a Supabase-stored plan on the profile).
 * This is the one place that will change when real billing arrives —
 * everything gating Medications reads through `hasMedicationsAccess`
 * below rather than checking subscription state directly.
 */
export function isSubscribed(_user: User | null): boolean {
  return false;
}

/** Gate for the Medications Catalog module: admins always pass; everyone
 * else needs an active subscription (none exist yet, so it's admin-only
 * for now). */
export function hasMedicationsAccess(user: User | null): boolean {
  return isAdminUser(user) || isSubscribed(user);
}
