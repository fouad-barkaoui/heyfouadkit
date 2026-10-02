import { useEffect, useState } from 'react';
import { useAuth } from '@/state/authStore';
import {
  CONSENT_EVENT,
  consentDecision,
  consentMetaPatch,
  guestHasSeenStartHere,
  hasSeenWhatsNew,
  rememberGuestStartHere,
  rememberConsentLocally,
  rememberWhatsNewLocally,
  unsyncedLocalConsents,
  WHATS_NEW_RELEASE,
  type ConsentValue,
} from '@/state/onboarding';
import { useUI } from '@/state/uiStore';
import { CloudTermsModal } from './CloudTermsModal';
import { StartHereModal } from './StartHereModal';

/**
 * What a signed-in person sees, at most once each, for life:
 *   1. the cloud terms — only if they have never answered (accept OR
 *      decline is final, stored on the account so no device asks again);
 *   2. "What's new" — once per release, also remembered on the account.
 * Everything is derived from the account + a local mirror, so re-renders,
 * reloads and other devices can never show a popup twice.
 */
export function OnboardingFlow(): JSX.Element {
  const { user, ready, updateMeta } = useAuth();
  const { setModule } = useUI();
  // Bumped after a local decision so the derived stage re-reads storage.
  const [tick, setTick] = useState(0);

  // Carry decisions made on this device (before signing in / before this
  // version) up to the account once.
  useEffect(() => {
    if (!user) return;
    const pending = unsyncedLocalConsents(user);
    if (pending.terms) void updateMeta(consentMetaPatch(user, 'terms', pending.terms));
  }, [user, updateMeta]);

  // A consent answered elsewhere (the cookie sheet) — re-check what's next.
  useEffect(() => {
    const bump = (): void => setTick((n) => n + 1);
    window.addEventListener(CONSENT_EVENT, bump);
    return () => window.removeEventListener(CONSENT_EVENT, bump);
  }, []);

  void tick;
  // Signed in: cloud terms first, then "Start here" once per account.
  // Visitors: "Start here" once per device, after the cookie question.
  const stage: 'none' | 'terms' | 'start' = !ready
    ? 'none'
    : !user
      ? consentDecision('cookies', null) !== null && !guestHasSeenStartHere()
        ? 'start'
        : 'none'
      : consentDecision('terms', user) === null
        ? 'terms'
        : !hasSeenWhatsNew(user)
          ? 'start'
          : 'none';

  const decideTerms = (value: ConsentValue): void => {
    if (!user) return;
    rememberConsentLocally('terms', value, user);
    setTick((t) => t + 1);
    void updateMeta(consentMetaPatch(user, 'terms', value));
  };

  const closeStart = (openNews: boolean): void => {
    if (user) {
      rememberWhatsNewLocally(user);
      void updateMeta({ whats_new_seen: WHATS_NEW_RELEASE });
    } else {
      rememberGuestStartHere();
    }
    setTick((t) => t + 1);
    if (openNews) setModule('news');
  };

  return (
    <>
      <CloudTermsModal
        open={stage === 'terms'}
        onAccept={() => decideTerms('accepted')}
        onCancel={() => decideTerms('declined')}
      />
      <StartHereModal open={stage === 'start'} onOpen={() => closeStart(true)} onLater={() => closeStart(false)} />
    </>
  );
}
