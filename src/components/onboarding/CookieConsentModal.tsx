import { Cookie } from 'lucide-react';
import { useEffect, useState } from 'react';
import { ConsentSheet } from './ConsentSheet';

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
    <ConsentSheet
      open={open}
      tone="gold"
      partner="THIS DEVICE"
      zIndex={85}
      title="Keep Your Workspace"
      body={<p>Heyfouad saves your work in this browser, so everything is exactly how you left it next time.</p>}
      boxIcon={Cookie}
      box={(link) => (
        <p>
          By continuing, you accept that Heyfouad {link('stores your data locally')} in this browser and reuses it on your
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
