import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/state/authStore';
import { acceptCloudTerms, consumeJustAuthedFlag, hasAcceptedCloudTerms } from '@/state/onboarding';
import { CloudTermsModal } from './CloudTermsModal';
import { WelcomeModal } from './WelcomeModal';

type Stage = 'none' | 'welcome' | 'terms';

/**
 * Orchestrates the two-step onboarding popup: a welcome screen right after a
 * real sign-in/sign-up, then — once, per account, on this device — the cloud
 * terms and storage-limit screen. Mounted once at the shell level.
 */
export function OnboardingFlow(): JSX.Element {
  const { user, signOut } = useAuth();
  const [stage, setStage] = useState<Stage>('none');
  const seenUserId = useRef<string | null>(null);

  useEffect(() => {
    if (!user) {
      seenUserId.current = null;
      return;
    }
    if (seenUserId.current === user.id) return;
    seenUserId.current = user.id;

    if (consumeJustAuthedFlag()) {
      setStage('welcome');
    }
  }, [user]);

  const goToTermsOrClose = (): void => {
    if (!user || hasAcceptedCloudTerms(user.id)) {
      setStage('none');
      return;
    }
    setStage('terms');
  };

  const accept = (): void => {
    if (user) acceptCloudTerms(user.id);
    setStage('none');
  };

  return (
    <>
      <WelcomeModal open={stage === 'welcome'} onContinue={goToTermsOrClose} />
      <CloudTermsModal
        open={stage === 'terms'}
        onAccept={accept}
        onCancel={() => {
          setStage('none');
          void signOut();
        }}
      />
    </>
  );
}
