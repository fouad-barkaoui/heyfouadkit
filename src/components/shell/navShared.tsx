import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { AlertTriangle, Check, ChevronsUpDown, Cloud, CloudOff, Loader2, Lock, Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { hasMedicationsAccess } from '@/lib/access';
import type { ModuleId } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useAuth } from '@/state/authStore';
import { useTeam } from '@/state/teamStore';
import { useUI } from '@/state/uiStore';
import type { SyncState } from '@/state/workspaceStore';

/** Module id → translation key. 'docs' is special-cased since the module's
 * own label ("Docs Storage") differs from the group header ("Docs"). */
export const NAV_KEY: Record<string, string> = {
  home: 'nav.home',
  todo: 'nav.todo',
  calendar: 'nav.calendar',
  habits: 'nav.habits',
  team: 'nav.team',
  news: 'nav.news',
  saveit: 'nav.saveit',
  medications: 'nav.medications',
  notebook: 'nav.notebook',
  articles: 'nav.articles',
  courses: 'nav.courses',
  docs: 'nav.docsStorage',
  vault: 'nav.vault',
  reporting: 'nav.reporting',
  analytics: 'nav.analytics',
  trash: 'nav.trash',
  portfolio: 'nav.portfolio',
  contact: 'nav.contact',
  inbox: 'nav.inbox',
};

export const SYNC_LOOK_KEY: Record<SyncState, { icon: typeof Cloud; color: string; key: string }> = {
  offline: { icon: CloudOff, color: '#8a8f98', key: 'shell.onThisDevice' },
  idle: { icon: Cloud, color: '#8a8f98', key: 'shell.cloudReady' },
  syncing: { icon: Loader2, color: '#e4f222', key: 'shell.syncing' },
  synced: { icon: Cloud, color: '#27a644', key: 'shell.live' },
  queued: { icon: CloudOff, color: '#f5a524', key: 'shell.queued' },
  error: { icon: AlertTriangle, color: '#eb5757', key: 'shell.syncFailed' },
};

export type RowFlag = 'soon' | 'locked';

export const FLAG_LOOK: Record<RowFlag, { color: string; label: string; icon?: typeof Lock }> = {
  soon: { color: '#eab308', label: 'Soon' },
  locked: { color: '#8b5cf6', label: 'Pro', icon: Lock },
};

export const FLAG_TOOLTIP: Record<RowFlag, string> = {
  soon: 'Coming soon',
  locked: 'Subscriber feature',
};

/** Which status flag (if any) a module's nav entry carries. */
export function useRowFlag(): (id: ModuleId) => RowFlag | undefined {
  const { user } = useAuth();
  const medicationsLocked = !hasMedicationsAccess(user);
  return (id) => (id === 'team' ? 'soon' : id === 'medications' && medicationsLocked ? 'locked' : undefined);
}

/** Small pill shown next to a label. */
export function FlagPill({ flag, className }: { flag: RowFlag; className?: string }): JSX.Element {
  const look = FLAG_LOOK[flag];
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
      {look.label}
    </span>
  );
}

/** Tiny glowing dot for icon-only surfaces. */
export function FlagDot({ flag }: { flag: RowFlag }): JSX.Element {
  const look = FLAG_LOOK[flag];
  return (
    <span
      className="absolute right-[5px] top-[5px] h-[6px] w-[6px] rounded-full"
      style={{ backgroundColor: look.color, boxShadow: `0 0 6px ${look.color}bf` }}
      aria-hidden
    />
  );
}

/** Avatar-ish initial disc — no photo storage, so the initial carries it. */
export function Avatar({ name, size = 30 }: { name: string; size?: number }): JSX.Element {
  const letter = (name.trim()[0] ?? '?').toUpperCase();
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#e4f222] to-[#9db300] text-[12px] font-semibold text-[#08090a]"
      style={{ width: size, height: size }}
      aria-hidden
    >
      {letter}
    </span>
  );
}

export function TeamSwitcher({ expanded }: { expanded: boolean }): JSX.Element | null {
  const { teams, activeTeam, switchTeam, ready } = useTeam();
  const { setModule } = useUI();

  if (!ready || teams.length === 0) return null;

  const trigger = (
    <button
      type="button"
      aria-label={`Team: ${activeTeam?.name ?? 'Personal'}`}
      className={cn(
        'flex items-center gap-2.5 rounded-[10px] bg-[rgb(var(--tint-rgb)/0.025)] text-left shadow-[inset_0_0_0_1px_var(--color-graphite)] transition-colors duration-150 hover:shadow-[inset_0_0_0_1px_var(--color-smoke)]',
        expanded ? 'w-full px-2.5 py-2' : 'mx-auto h-[38px] w-[38px] justify-center p-0',
      )}
    >
      <Avatar name={activeTeam?.name ?? '?'} size={expanded ? 26 : 22} />
      {expanded ? (
        <>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[12.5px] text-paper">{activeTeam?.name ?? 'Personal'}</span>
            <span className="block truncate text-[10.5px] capitalize text-ash">{activeTeam?.role ?? ''}</span>
          </span>
          <ChevronsUpDown size={13} strokeWidth={1.8} className="shrink-0 text-ash" aria-hidden />
        </>
      ) : null}
    </button>
  );

  return (
    <div className="mb-3">
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>{trigger}</DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content
            side={expanded ? 'bottom' : 'right'}
            align="start"
            sideOffset={8}
            className="z-[60] w-[220px] rounded-[12px] bg-carbon p-1.5 shadow-[inset_0_0_0_1px_var(--color-graphite),0_4px_24px_rgba(8,9,10,0.6)] data-[state=open]:animate-[nx-scale-in_160ms_var(--ease-out-quint)_both]"
          >
            <p className="px-2 py-1.5 text-[10.5px] font-medium uppercase tracking-[0.07em] text-ash">Your teams</p>
            {teams.map((t) => (
              <DropdownMenu.Item
                key={t.id}
                onSelect={() => switchTeam(t.id)}
                className="flex cursor-pointer items-center gap-2 rounded-[7px] px-2 py-1.5 text-[12.5px] text-mist outline-none data-[highlighted]:bg-[rgb(var(--tint-rgb)/0.05)] data-[highlighted]:text-paper"
              >
                <Avatar name={t.name} size={20} />
                <span className="min-w-0 flex-1 truncate">{t.name}</span>
                {t.id === activeTeam?.id ? <Check size={13} strokeWidth={2} className="text-acid" /> : null}
              </DropdownMenu.Item>
            ))}
            <DropdownMenu.Separator className="my-1.5 h-px bg-graphite" />
            <DropdownMenu.Item
              onSelect={() => setModule('team')}
              className="flex cursor-pointer items-center gap-2 rounded-[7px] px-2 py-1.5 text-[12.5px] text-ash outline-none data-[highlighted]:bg-[rgb(var(--tint-rgb)/0.05)] data-[highlighted]:text-paper"
            >
              <Plus size={13} strokeWidth={1.9} />
              Manage teams &amp; invites
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    </div>
  );
}

/** Live CSS media query. */
export function useMediaQuery(query: string): boolean {
  const get = (): boolean => typeof window !== 'undefined' && window.matchMedia(query).matches;
  const [matches, setMatches] = useState(get);
  useEffect(() => {
    const mql = window.matchMedia(query);
    const on = (): void => setMatches(mql.matches);
    on();
    mql.addEventListener('change', on);
    return () => mql.removeEventListener('change', on);
  }, [query]);
  return matches;
}
