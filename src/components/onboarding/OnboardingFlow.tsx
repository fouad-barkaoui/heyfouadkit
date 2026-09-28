import { useEffect, useState } from 'react';
import { useAuth } from '@/state/authStore';
import {
  consentDecision,
  consentMetaPatch,
  hasSeenWhatsNew,
  rememberConsentLocally,
  rememberWhatsNewLocally,
  unsyncedLocalConsents,
  WHATS_NEW_RELEASE,
  type ConsentValue,
} from '@/state/onboarding';
import { useUI } from '@/state/uiStore';
import { CloudTermsModal } from './CloudTermsModal';
import { WhatsNewModal, type WhatsNewAction } from './WhatsNewModal';

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
  const { setModule, setAccountOpen } = useUI();
  // Bumped after a local decision so the derived stage re-reads storage.
  const [tick, setTick] = useState(0);

  // Carry decisions made on this device (before signing in / before this
  // version) up to the account once.
  useEffect(() => {
    if (!user) return;
    const pending = unsyncedLocalConsents(user);
    if (pending.terms) void updateMeta(consentMetaPatch(user, 'terms', pending.terms));
  }, [user, updateMeta]);

  void tick;
  const stage: 'none' | 'terms' | 'whatsnew' =
    !ready || !user
      ? 'none'
      : consentDecision('terms', user) === null
        ? 'terms'
        : !hasSeenWhatsNew(user)
          ? 'whatsnew'
          : 'none';

  const decideTerms = (value: ConsentValue): void => {
    if (!user) return;
    rememberConsentLocally('terms', value, user);
    setTick((t) => t + 1);
    void updateMeta(consentMetaPatch(user, 'terms', value));
  };

  const closeWhatsNew = (action: WhatsNewAction): void => {
    if (!user) return;
    rememberWhatsNewLocally(user);
    setTick((t) => t + 1);
    void updateMeta({ whats_new_seen: WHATS_NEW_RELEASE });
    if (action === 'saveit') setModule('saveit');
    if (action === 'account') setAccountOpen(true);
  };

  return (
    <>
      <CloudTermsModal
        open={stage === 'terms'}
        onAccept={() => decideTerms('accepted')}
        onCancel={() => decideTerms('declined')}
      />
      <WhatsNewModal open={stage === 'whatsnew'} onClose={closeWhatsNew} />
    </>
  );
}
