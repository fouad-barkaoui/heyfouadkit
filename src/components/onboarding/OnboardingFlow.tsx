import { useEffect, useState } from 'react';
import { useAuth } from '@/state/authStore';
import {
  CONSENT_EVENT,
  consentDecision,
  consentMetaPatch,
  rememberConsentLocally,
  unsyncedLocalConsents,
  type ConsentValue,
} from '@/state/onboarding';
import { CloudTermsModal } from './CloudTermsModal';

/**
 * The one thing a signed-in person is asked, once for life: the cloud terms.
 * Accept or decline is final and stored on the account, so no other device
 * asks again.
 */
export function OnboardingFlow(): JSX.Element {
  const { user, ready, updateMeta } = useAuth();
  // Bumped after a local decision so the derived stage re-reads storage.
  const [tick, setTick] = useState(0);

  // Carry a decision made on this device before signing in up to the account.
  useEffect(() => {
    if (!user) return;
    const pending = unsyncedLocalConsents(user);
    if (pending.terms) void updateMeta(consentMetaPatch(user, 'terms', pending.terms));
  }, [user, updateMeta]);

  // A consent answered elsewhere (the cookie sheet): re-check what's next.
  useEffect(() => {
    const bump = (): void => setTick((n) => n + 1);
    window.addEventListener(CONSENT_EVENT, bump);
    return () => window.removeEventListener(CONSENT_EVENT, bump);
  }, []);

  void tick;
  const askTerms = ready && !!user && consentDecision('terms', user) === null;

  const decideTerms = (value: ConsentValue): void => {
    if (!user) return;
    rememberConsentLocally('terms', value, user);
    setTick((n) => n + 1);
    void updateMeta(consentMetaPatch(user, 'terms', value));
  };

  return (
    <CloudTermsModal open={askTerms} onAccept={() => decideTerms('accepted')} onCancel={() => decideTerms('declined')} />
  );
}
