import * as Dialog from '@radix-ui/react-dialog';
import { Cookie } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';

const CONSENT_KEY = 'heyfouad.cookieConsent.v1';

function safeGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* private mode / quota — the notice just shows again next visit */
  }
}

/**
 * A one-time notice shown the very first time anyone opens heyfouad, before
 * they've decided whether to sign in or keep browsing as a guest. heyfouad
 * already has to store data in this browser to work at all — notes, tasks,
 * docs, and preferences all live in local storage, and sync to a private
 * cloud copy once signed in — so this makes that plain and asks for an
 * explicit acknowledgement before reusing it on the next visit. Declining
 * only dismisses the notice; it can't turn off the storage the app depends
 * on to remember your work, so the choice itself is what gets remembered
 * (recorded locally either way, so this never reappears after one answer).
 */
export function CookieConsentModal(): JSX.Element {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(safeGet(CONSENT_KEY) === null);
  }, []);

  const choose = (value: 'accepted' | 'declined'): void => {
    safeSet(CONSENT_KEY, value);
    setOpen(false);
  };

  return (
    <Dialog.Root open={open} onOpenChange={() => undefined}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[85] bg-void/82 backdrop-blur-[4px] data-[state=open]:animate-[nx-fade_220ms_var(--ease-out-quint)_both]" />
        <Dialog.Content
          onEscapeKeyDown={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
          className="fixed left-1/2 top-1/2 z-[85] w-[calc(100vw-24px)] max-w-[440px] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-[14px] bg-carbon shadow-[inset_0_0_0_1px_var(--color-graphite),0_8px_48px_rgba(8,9,10,0.8)] data-[state=open]:animate-[nx-scale-in_240ms_var(--ease-out-quint)_both]"
        >
          <div className="border-b border-graphite px-5 py-4">
            <span className="mb-3 flex h-9 w-9 items-center justify-center rounded-[9px] bg-[rgb(var(--tint-rgb)/0.04)] text-accent">
              <Cookie size={17} strokeWidth={1.8} aria-hidden />
            </span>
            <Dialog.Title className="text-[15px] font-medium tracking-[-0.012em] text-paper">
              We keep your data on this device
            </Dialog.Title>
            <Dialog.Description className="mt-1 text-[12.5px] text-fog">
              So heyfouad is exactly how you left it, next time.
            </Dialog.Description>
          </div>

          <div className="px-5 py-4">
            <p className="text-[12.5px] leading-[1.6] text-ash">
              heyfouad stores your notes, tasks, docs, and preferences locally in this browser — and, if you sign in, in your own
              private cloud copy — so everything is ready for you the next time you open the app. Accepting lets us reuse that
              saved data on your next visit.
            </p>
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-graphite bg-void/40 px-5 py-3.5">
            <Button variant="ghost" onClick={() => choose('declined')}>
              Decline
            </Button>
            <Button variant="primary" onClick={() => choose('accepted')}>
              Accept
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
