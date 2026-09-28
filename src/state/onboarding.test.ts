import type { User } from '@supabase/supabase-js';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  consentDecision,
  consentMetaPatch,
  hasSeenWhatsNew,
  rememberConsentLocally,
  rememberWhatsNewLocally,
  unsyncedLocalConsents,
  WHATS_NEW_RELEASE,
} from './onboarding';

const user = (meta: Record<string, unknown> = {}): User =>
  ({ id: 'u1', user_metadata: meta, app_metadata: {}, aud: 'authenticated', created_at: '' }) as unknown as User;

describe('lifetime consents', () => {
  beforeEach(() => localStorage.clear());

  it('reads the account decision first, so a new device never asks again', () => {
    expect(consentDecision('terms', user({ consents: { terms: { v: 'declined', at: 'x' } } }))).toBe('declined');
    expect(consentDecision('terms', user())).toBeNull();
  });

  it('honours decisions made on this device, including the old "1" format', () => {
    localStorage.setItem('heyfouad.cloudTerms.u1', '1');
    expect(consentDecision('terms', user())).toBe('accepted');
    rememberConsentLocally('cookies', 'declined', null);
    expect(consentDecision('cookies', user())).toBe('declined');
  });

  it('lists local decisions the account does not know yet, and merges patches', () => {
    rememberConsentLocally('terms', 'accepted', user());
    expect(unsyncedLocalConsents(user())).toEqual({ terms: 'accepted' });
    const patch = consentMetaPatch(user({ consents: { cookies: { v: 'accepted', at: 'a' } } }), 'terms', 'declined') as {
      consents: Record<string, { v: string }>;
    };
    expect(patch.consents.cookies?.v).toBe('accepted');
    expect(patch.consents.terms?.v).toBe('declined');
  });

  it("shows what's new once per release", () => {
    expect(hasSeenWhatsNew(user())).toBe(false);
    expect(hasSeenWhatsNew(user({ whats_new_seen: WHATS_NEW_RELEASE }))).toBe(true);
    rememberWhatsNewLocally(user());
    expect(hasSeenWhatsNew(user())).toBe(true);
  });
});
