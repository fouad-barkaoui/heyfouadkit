import { Cookie } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useAuth } from '@/state/authStore';
import { useLanguage } from '@/state/languageStore';
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
  const { t } = useLanguage();
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
      partner={t('ob.cookie.partner')}
      zIndex={85}
      title={t('ob.cookie.title')}
      body={<p>{t('ob.cookie.body')}</p>}
      boxIcon={Cookie}
      box={(link) => (
        <p>
          {t('ob.cookie.boxBefore')}
          {link(t('ob.cookie.boxLink'))}
          {t('ob.cookie.boxAfter')}
        </p>
      )}
      details={
        <p className="text-[#6b6a66]">
          {t('ob.cookie.details')}
        </p>
      }
      acceptLabel={t('ob.cookie.accept')}
      cancelLabel={t('ob.decline')}
      onAccept={() => choose('accepted')}
      onCancel={() => choose('declined')}
    />
  );
}
