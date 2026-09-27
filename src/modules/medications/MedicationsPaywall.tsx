import { Lock } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/state/authStore';
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

  return (
    <div className="flex h-full flex-col">
      <header className="border-b border-graphite px-4 py-3.5 md:px-7 md:py-4">
        <h1 className="text-[19px] font-medium leading-tight tracking-[-0.016em] text-paper">
          Medications Catalog
        </h1>
        <p className="mt-1 text-[12.5px] text-ash">Subscriber feature</p>
      </header>

      <div className="scroll-y flex min-h-0 flex-1 items-center justify-center px-6 py-10">
        <div className="anim-rise flex max-w-[380px] flex-col items-center text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-[11px] bg-lavender/12 text-lavender shadow-[inset_0_0_0_1px_rgba(139,92,246,0.28)]">
            <Lock size={20} strokeWidth={1.7} />
          </div>
          <p className="text-[15px] text-mist">Medications is a subscriber feature</p>
          <p className="mt-2 max-w-[320px] text-[12.5px] leading-[1.6] text-ash">
            Track medicines and treatment plans — dosing, schedules, and history — with an active subscription.
            Billing isn't set up yet, so this isn't purchasable from here just yet.
          </p>
          {configured && !user ? (
            <Button variant="primary" className="mt-5" onClick={() => setAccountOpen(true)}>
              Sign in
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
