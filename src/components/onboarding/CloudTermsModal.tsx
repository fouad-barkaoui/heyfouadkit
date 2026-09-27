import * as Dialog from '@radix-ui/react-dialog';
import { Cloud, HardDrive, RefreshCw, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { MAX_CLOUD_BYTES, MAX_TOTAL_CLOUD_BYTES, humanLimit } from '@/data/attachments';

const TERMS: { icon: typeof Cloud; title: string; body: string }[] = [
  {
    icon: ShieldCheck,
    title: 'This space is only yours',
    body: 'Row-level security in the database enforces it, not just the app — nobody else can read or write your rows or files.',
  },
  {
    icon: HardDrive,
    title: `Your cloud storage is limited to ${humanLimit(MAX_TOTAL_CLOUD_BYTES)}`,
    body: `Each file can be up to ${humanLimit(MAX_CLOUD_BYTES)}. Once you reach the total, remove something before adding more.`,
  },
  {
    icon: RefreshCw,
    title: 'You are always in control',
    body: 'Back up, restore, or wipe your cloud copy at any time from the Account panel. Signing out never deletes what is on this device.',
  },
];

/**
 * Shown once per account, right after the welcome popup on first sign-in.
 * Requires an explicit checkbox before "Accept" is enabled — this is the
 * moment the person agrees to how cloud storage is limited and governed.
 */
export function CloudTermsModal({ open, onAccept }: { open: boolean; onAccept: () => void }): JSX.Element {
  const [checked, setChecked] = useState(false);

  return (
    <Dialog.Root open={open} onOpenChange={() => undefined}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[70] bg-void/82 backdrop-blur-[4px] data-[state=open]:animate-[nx-fade_220ms_var(--ease-out-quint)_both]" />
        <Dialog.Content
          onEscapeKeyDown={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
          className="fixed left-1/2 top-1/2 z-[70] w-[calc(100vw-24px)] max-w-[480px] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-[14px] bg-carbon shadow-[inset_0_0_0_1px_var(--color-graphite),0_8px_48px_rgba(8,9,10,0.8)] data-[state=open]:animate-[nx-scale-in_240ms_var(--ease-out-quint)_both]"
        >
          <div className="border-b border-graphite px-5 py-4">
            <Dialog.Title className="text-[15px] font-medium tracking-[-0.012em] text-paper">
              Your cloud, on your terms
            </Dialog.Title>
            <Dialog.Description className="mt-1 text-[12.5px] text-fog">
              Quick rules before your data starts syncing.
            </Dialog.Description>
          </div>

          <div className="space-y-3 px-5 py-4">
            {TERMS.map(({ icon: Icon, title, body }) => (
              <div key={title} className="flex items-start gap-3">
                <span className="mt-[1px] flex h-7 w-7 shrink-0 items-center justify-center rounded-[7px] bg-[rgb(var(--tint-rgb)/0.04)] text-fog">
                  <Icon size={14} strokeWidth={1.8} aria-hidden />
                </span>
                <div className="min-w-0">
                  <p className="text-[13px] text-paper">{title}</p>
                  <p className="mt-0.5 text-[12px] leading-[1.55] text-ash">{body}</p>
                </div>
              </div>
            ))}

            <label className="mt-1 flex cursor-pointer items-start gap-2.5 rounded-[8px] bg-[rgb(var(--tint-rgb)/0.03)] p-3 shadow-[inset_0_0_0_1px_var(--color-graphite)]">
              <input
                type="checkbox"
                checked={checked}
                onChange={(e) => setChecked(e.target.checked)}
                className="mt-[2px] h-[15px] w-[15px] accent-[#e4f222]"
              />
              <span className="text-[12.5px] leading-[1.55] text-mist">
                I understand my cloud storage is limited and I agree to these terms.
              </span>
            </label>
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-graphite bg-void/40 px-5 py-3.5">
            <Button variant="primary" disabled={!checked} onClick={onAccept}>
              Accept &amp; continue
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
