import * as Dialog from '@radix-ui/react-dialog';
import { Cookie, HardDrive } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useAuth } from '@/state/authStore';
import { useLanguage } from '@/state/languageStore';
import {
  consentDecision,
  consentMetaPatch,
  rememberConsentLocally,
  unsyncedLocalConsents,
} from '@/state/onboarding';
import { KanzWordmark } from '@/components/ui/KanzWordmark';

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
    <Dialog.Root open={open} onOpenChange={(o) => (o ? undefined : choose('declined'))}>
      <Dialog.Portal>
        <Dialog.Overlay className="ck-overlay" />
        <Dialog.Content className="ck-ticket" aria-describedby="ck-body">
          {/* The card: glowing art, then a frosted strip with the title. */}
          <div className="ck-card">
            <div className="ck-art" aria-hidden>
              <span className="ck-orb" />
              <KanzWordmark height={22} gem="#ffffff" title="" className="ck-mark" />
            </div>
            <div className="ck-head">
              <div className="min-w-0">
                <Dialog.Title className="ck-title">{t('ob.cookie.title')}</Dialog.Title>
                <p className="ck-sub">{t('ob.cookie.body')}</p>
              </div>
              <Cookie size={22} strokeWidth={1.6} className="ck-head-icon" aria-hidden />
            </div>
          </div>

          {/* The stub: where it is kept, why, and the two answers. */}
          <div className="ck-stub">
            <div className="ck-stub-row">
              <span className="ck-date" aria-hidden>
                <span>{t('ob.cookie.boxTop')}</span>
                <HardDrive size={20} strokeWidth={1.8} />
              </span>
              <p id="ck-body" className="ck-stub-text">
                <strong>{t('ob.cookie.partner')}</strong>
                <span>
                  {t('ob.cookie.boxBefore')}
                  {t('ob.cookie.boxLink')}
                  {t('ob.cookie.boxAfter')}
                </span>
              </p>
            </div>
            <div className="ck-actions">
              <button type="button" className="ck-btn" onClick={() => choose('declined')}>
                {t('ob.decline')}
              </button>
              <button type="button" className="ck-btn is-primary" onClick={() => choose('accepted')}>
                {t('ob.cookie.accept')}
              </button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
