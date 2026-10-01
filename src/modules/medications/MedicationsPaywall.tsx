import { Lock } from 'lucide-react';
import { MenuButton } from '@/components/shell/MenuButton';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/state/authStore';
import { useLanguage } from '@/state/languageStore';
import { useUI } from '@/state/uiStore';

/**
 * Shown instead of MedicationsModule when the signed-in account isn't an
 * admin and has no active subscription (see `hasMedicationsAccess` in
 * lib/access.ts). The module still appears in the nav — with a small
 * "locked" tag — so people know it exists, they just can't open it yet.
 */
export function MedicationsPaywall(): JSX.Element {
  const { user, configured } = useAuth();
  const { setAccountOpen } = useUI();
  const { t } = useLanguage();

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center gap-3 border-b border-graphite px-4 py-3.5 md:px-7 md:py-4">
        <MenuButton className="md:hidden" />
        <div className="min-w-0">
          <h1 className="text-[19px] font-medium leading-tight tracking-[-0.016em] text-paper">{t('nav.medications')}</h1>
          <p className="mt-1 text-[12.5px] text-ash">{t('med.paywall.subtitle')}</p>
        </div>
      </header>

      <div className="scroll-y flex min-h-0 flex-1 items-center justify-center px-6 py-10">
        <div className="anim-rise flex max-w-[380px] flex-col items-center text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-[11px] bg-lavender/12 text-lavender shadow-[inset_0_0_0_1px_rgba(139,92,246,0.28)]">
            <Lock size={20} strokeWidth={1.7} />
          </div>
          <p className="text-[15px] text-mist">{t('med.paywall.title')}</p>
          <p className="mt-2 max-w-[320px] text-[12.5px] leading-[1.6] text-ash">
            {t('med.paywall.body')}
          </p>
          {configured && !user ? (
            <Button variant="primary" className="mt-5" onClick={() => setAccountOpen(true)}>
              {t('shell.signIn')}
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
