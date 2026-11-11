import { AlertTriangle, Cloud, CloudOff, Loader2, Lock } from 'lucide-react';
import { useI18n } from '@/components/ui/useI18n';
import { hasMedicationsAccess } from '@/lib/access';
import type { ModuleId } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useAuth } from '@/state/authStore';
import type { SyncState } from '@/state/workspaceStore';

/** Module id to translation key. */
export const NAV_KEY: Record<ModuleId, string> = {
  home: 'nav.home',
  todo: 'nav.todo',
  calendar: 'nav.calendar',
  habits: 'nav.habits',
  team: 'nav.team',
  news: 'nav.news',
  saveit: 'nav.saveit',
  medications: 'nav.medications',
  salary: 'nav.salary',
  notebook: 'nav.notebook',
  articles: 'nav.articles',
  courses: 'nav.courses',
  docs: 'nav.docsStorage',
  vault: 'nav.vault',
  reporting: 'nav.reporting',
  analytics: 'nav.analytics',
  trash: 'nav.trash',
  settings: 'nav.settings',
  contact: 'nav.contact',
  inbox: 'nav.inbox',
};

export const SYNC_LOOK: Record<SyncState, { icon: typeof Cloud; color: string; key: string }> = {
  offline: { icon: CloudOff, color: '#8a8a8a', key: 'shell.onThisDevice' },
  idle: { icon: Cloud, color: '#8a8a8a', key: 'shell.cloudReady' },
  syncing: { icon: Loader2, color: '#a1a1a1', key: 'shell.syncing' },
  synced: { icon: Cloud, color: '#27a644', key: 'shell.live' },
  queued: { icon: CloudOff, color: '#f5a524', key: 'shell.queued' },
  error: { icon: AlertTriangle, color: '#eb5757', key: 'shell.syncFailed' },
};

export type RowFlag = 'soon' | 'locked' | 'beta';

/** `label` is a translation key. */
const FLAG_LOOK: Record<RowFlag, { color: string; label: string; icon?: typeof Lock }> = {
  soon: { color: '#eab308', label: 'sh.flag.soon' },
  locked: { color: '#8b5cf6', label: 'sh.flag.pro', icon: Lock },
  beta: { color: '#22b8cf', label: 'sh.flag.beta' },
};

/** Which status flag (if any) a module's nav entry carries. */
export function useRowFlag(): (id: ModuleId) => RowFlag | undefined {
  const { user } = useAuth();
  const medicationsLocked = !hasMedicationsAccess(user);
  return (id) =>
    id === 'team' ? 'soon' : id === 'medications' && medicationsLocked ? 'locked' : id === 'salary' ? 'beta' : undefined;
}

/** Small pill shown next to a label. */
export function FlagPill({ flag, className }: { flag: RowFlag; className?: string }): JSX.Element {
  const look = FLAG_LOOK[flag];
  const { t } = useI18n();
  return (
    <span
      className={cn(
        'flex shrink-0 items-center gap-1 rounded-full px-1.5 py-[1px] text-[9.5px] font-medium uppercase tracking-[0.04em]',
        className,
      )}
      style={{
        backgroundColor: `${look.color}26`,
        color: look.color,
        boxShadow: `inset 0 0 0 1px ${look.color}59`,
      }}
    >
      {look.icon ? <look.icon size={9} strokeWidth={2.2} aria-hidden /> : null}
      {t(look.label)}
    </span>
  );
}
