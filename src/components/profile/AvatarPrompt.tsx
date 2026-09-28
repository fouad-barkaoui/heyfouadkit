import { Camera, X } from 'lucide-react';
import { useState } from 'react';
import { AvatarEditor } from '@/components/profile/AvatarEditor';
import { isProUser } from '@/lib/access';
import { getDisplayName, useAuth } from '@/state/authStore';

const DISMISS_KEY = 'heyfouad.avatarPrompt.dismissed.';

function readDismissed(id: string): boolean {
  try {
    return window.localStorage.getItem(DISMISS_KEY + id) === '1';
  } catch {
    return false;
  }
}

/**
 * Shown on Home until the person has a profile picture: explains why to add
 * one and lets them do it right there (pick → crop → save), no detour into
 * settings. "Later" hides it on this device for this account.
 */
export function AvatarPrompt(): JSX.Element | null {
  const { user, avatarUrl } = useAuth();
  const id = user?.id ?? 'guest';
  const [dismissed, setDismissed] = useState(() => readDismissed(id));

  if (avatarUrl || dismissed) return null;

  const later = (): void => {
    try {
      window.localStorage.setItem(DISMISS_KEY + id, '1');
    } catch {
      /* ignore — it just shows again next visit */
    }
    setDismissed(true);
  };

  return (
    <section data-stagger aria-label="Add your profile picture" className="avatar-prompt surface-card relative overflow-hidden p-4 md:p-5">
      <div className="avatar-prompt-glow pointer-events-none absolute inset-0" aria-hidden />
      <div className="relative flex items-start gap-3">
        <span className="avatar-prompt-icon flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px]" aria-hidden>
          <Camera size={17} strokeWidth={1.8} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-[15px] font-medium tracking-[-0.014em] text-paper">Add your profile picture</h2>
          <p className="mt-0.5 text-[12.5px] leading-[1.5] text-ash">
            {user
              ? 'Your picture shows on your profile, next to your name, and to everyone in your team — on every device you sign in to.'
              : 'Your picture shows on your profile and next to your name. Sign in to keep it on every device.'}
          </p>
        </div>
        <button type="button" onClick={later} className="btn-icon shrink-0" aria-label="Remind me later" title="Later">
          <X size={15} strokeWidth={1.8} />
        </button>
      </div>
      <div className="relative mt-3.5">
        <AvatarEditor name={user ? getDisplayName(user) : 'You'} pro={isProUser(user)} />
      </div>
    </section>
  );
}
