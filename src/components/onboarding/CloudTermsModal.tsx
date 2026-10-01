import { HardDrive, Lock, RefreshCw, ShieldCheck } from 'lucide-react';
import { MAX_CLOUD_BYTES, MAX_TOTAL_CLOUD_BYTES, humanLimit } from '@/data/attachments';
import { ConsentSheet } from './ConsentSheet';

const RULES: { icon: typeof Lock; title: string; body: string }[] = [
  {
    icon: ShieldCheck,
    title: 'This space is only yours',
    body: 'Row-level security in the database enforces it — nobody else can read or write your rows or files.',
  },
  {
    icon: HardDrive,
    title: `Storage is limited to ${humanLimit(MAX_TOTAL_CLOUD_BYTES)}`,
    body: `Each file can be up to ${humanLimit(MAX_CLOUD_BYTES)}. Once you reach the total, remove something before adding more.`,
  },
  {
    icon: RefreshCw,
    title: 'You are always in control',
    body: 'Back up, restore, or wipe your cloud copy any time from the Account panel. Signing out never deletes this device’s copy.',
  },
];

/**
 * Asked once per account, for life — the answer (accept or decline) is
 * stored on the account, so no device ever asks again.
 */
export function CloudTermsModal({
  open,
  onAccept,
  onCancel,
}: {
  open: boolean;
  onAccept: () => void;
  onCancel: () => void;
}): JSX.Element {
  return (
    <ConsentSheet
      open={open}
      tone="green"
      partner="CLOUD"
      title="Turn On Cloud Sync"
      body={
        <p>
          Kanz uses a private cloud for your library, so your notes, tasks and files are on every device right away.
        </p>
      }
      boxIcon={Lock}
      box={(link) => (
        <p>
          By continuing, you accept {link('Kanz’s terms of use')} and agree to your cloud storage being limited to{' '}
          {humanLimit(MAX_TOTAL_CLOUD_BYTES)}, with each file up to {humanLimit(MAX_CLOUD_BYTES)}.
        </p>
      )}
      details={
        <ul className="space-y-2.5">
          {RULES.map(({ icon: Icon, title, body }) => (
            <li key={title} className="flex items-start gap-2.5">
              <Icon size={14} strokeWidth={1.9} className="mt-[2px] shrink-0 text-[#1d1c1a]" aria-hidden />
              <span>
                <span className="block font-medium text-[#1d1c1a]">{title}</span>
                <span className="block text-[#6b6a66]">{body}</span>
              </span>
            </li>
          ))}
        </ul>
      }
      acceptLabel="Accept Terms and Continue"
      cancelLabel="Decline"
      onAccept={onAccept}
      onCancel={onCancel}
    />
  );
}
