import { useEffect, useState } from 'react';
import { useAuth } from '@/state/authStore';
import { useLanguage } from '@/state/languageStore';
import {
  consentDecision,
  consentMetaPatch,
  rememberConsentLocally,
  unsyncedLocalConsents,
} from '@/state/onboarding';

/**
 * The one-time "we keep your data on this device" notice, as a small card in
 * the corner that never blocks the page. Asked once per
 * person for life: the answer is kept on this device and, once signed in,
 * on the account — so a returning person on a new device is never asked
 * again (and anyone who already agreed to the cloud terms has, by
 * definition, agreed to this too).
 */
export function CookieConsentModal(): JSX.Element | null {
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

  if (!open) return null;
  return (
    <aside className="cookie-card" role="dialog" aria-labelledby="cookie-title" aria-describedby="cookie-body">
      <h2 id="cookie-title">{t('ob.cookie.title')}</h2>
      <p id="cookie-body">
        {t('ob.cookie.body')} {t('ob.cookie.boxBefore')}
        {t('ob.cookie.boxLink')}
        {t('ob.cookie.boxAfter')}
      </p>
      <div className="cookie-actions">
        <button type="button" className="btn btn-ghost" onClick={() => choose('declined')}>
          {t('ob.decline')}
        </button>
        <button type="button" className="btn btn-primary" onClick={() => choose('accepted')}>
          {t('ob.cookie.accept')}
        </button>
      </div>
    </aside>
  );
}
