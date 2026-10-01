import { Cookie } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useAuth } from '@/state/authStore';
import {
  consentDecision,
  consentMetaPatch,
  rememberConsentLocally,
  unsyncedLocalConsents,
} from '@/state/onboarding';
import { ConsentSheet } from './ConsentSheet';

/**
 * The one-time "we keep your data on this device" notice. Asked once per
 * person for life: the answer is kept on this device and, once signed in,
 * on the account — so a returning person on a new device is never asked
 * again (and anyone who already agreed to the cloud terms has, by
 * definition, agreed to this too).
 */
export function CookieConsentModal(): JSX.Element {
  const { user, ready, updateMeta } = useAuth();
  const [answered, setAnswered] = useState(false);

  const decided =
    consentDecision('cookies', user) !== null || (user !== null && consentDecision('terms', user) !== null);
  const open = ready && !answered && !decided;

  // A choice made before signing in is carried up to the account once.
  useEffect(() => {
    if (!user) return;
    const pending = unsyncedLocalConsents(user);
    if (pending.cookies) void updateMeta(consentMetaPatch(user, 'cookies', pending.cookies));
  }, [user, updateMeta]);

  const choose = (value: 'accepted' | 'declined'): void => {
    rememberConsentLocally('cookies', value, user);
    setAnswered(true);
    if (user) void updateMeta(consentMetaPatch(user, 'cookies', value));
  };

  return (
    <ConsentSheet
      open={open}
      tone="gold"
      partner="THIS DEVICE"
      zIndex={85}
      title="Keep Your Workspace"
      body={<p>Kanz saves your work in this browser, so everything is exactly how you left it next time.</p>}
      boxIcon={Cookie}
      box={(link) => (
        <p>
          By continuing, you accept that Kanz {link('stores your data locally')} in this browser and reuses it on your
          next visit.
        </p>
      )}
      details={
        <p className="text-[#6b6a66]">
          Notes, tasks, docs and preferences live in this browser’s local storage — and, if you sign in, in your own private
          cloud copy. Nothing is used for tracking or ads. Declining only hides this notice; the app still needs local
          storage to remember your work.
        </p>
      }
      acceptLabel="Accept and Continue"
      cancelLabel="Decline"
      onAccept={() => choose('accepted')}
      onCancel={() => choose('declined')}
    />
  );
}
