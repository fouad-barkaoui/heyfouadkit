import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import * as Tooltip from '@radix-ui/react-tooltip';
import { Check, ChevronDown, ChevronLeft, Search, UserRound } from 'lucide-react';
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type PointerEvent, type ReactNode } from 'react';
import { Avatar } from '@/components/ui/Avatar';
import { PlanChip } from '@/components/ui/PlanChip';
import { isAdminUser, isProUser } from '@/lib/access';
import type { ModuleId } from '@/lib/types';
import { cn } from '@/lib/utils';
import { groupOf, HOME_ID, MODULE_MAP, NAV_GROUPS, type ModuleMeta, type NavGroup } from '@/modules/registry';
import { prefetchModule } from '@/modules/prefetch';
import { getDisplayName, useAuth } from '@/state/authStore';
import { useLanguage } from '@/state/languageStore';
import { useUI } from '@/state/uiStore';
import { useWorkspace } from '@/state/workspaceStore';
import {
  FLAG_LOOK,
  FLAG_TOOLTIP,
  FlagDot,
  FlagPill,
  NAV_KEY,
  SYNC_LOOK_KEY,
  TeamSwitcher,
  useRowFlag,
  type RowFlag,
} from './navShared';
import { AccountMenu } from './AccountMenu';
import { NotificationBell } from './NotificationBell';
import { useNotifications } from '@/state/notificationsStore';

const TIP_CLASS =
  'z-[60] rounded-[7px] bg-obsidian px-2 py-1 text-[12px] text-mist shadow-[inset_0_0_0_1px_var(--color-graphite),0_4px_14px_rgba(0,0,0,0.45)] data-[state=delayed-open]:animate-[nx-fade_120ms_var(--ease-out-quint)_both]';

/** Right-side tooltip, only used while the rail is icon-only. */
function RailTip({ label, children, enabled }: { label: ReactNode; children: JSX.Element; enabled: boolean }): JSX.Element {
  if (!enabled) return children;
  return (
    <Tooltip.Root delayDuration={200}>
      <Tooltip.Trigger asChild>{children}</Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content side="right" sideOffset={10} className={TIP_CLASS}>
          {label}
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}

function RailRow({
  meta,
  label,
  active,
  expanded,
  onSelect,
  indent = false,
  flag,
  count = 0,
}: {
  meta: ModuleMeta;
  label: string;
  active: boolean;
  expanded: boolean;
  onSelect: () => void;
  indent?: boolean;
  flag?: RowFlag;
  /** Unread count shown as a badge (e.g. new messages). */
  count?: number;
}): JSX.Element {
  const Icon = meta.icon;
  const countLabel = count > 99 ? '99+' : String(count);
  return (
    <RailTip
      enabled={!expanded}
      label={
        <>
          {label}
          {flag ? (
            <span style={{ color: FLAG_LOOK[flag].color }} className="ms-1.5">
              · {FLAG_TOOLTIP[flag]}
            </span>
          ) : null}
        </>
      }
    >
      <button
        type="button"
        onClick={onSelect}
        data-active={active}
        aria-label={flag ? `${label} — ${FLAG_TOOLTIP[flag]}` : count ? `${label} (${count} new)` : label}
        aria-current={active ? 'page' : undefined}
        onPointerEnter={() => prefetchModule(meta.id)}
        onFocus={() => prefetchModule(meta.id)}
        className={cn('nav-row', !expanded && 'is-compact', indent && expanded && 'is-child ps-8')}
      >
        <span className="relative inline-flex shrink-0">
          <Icon size={indent && expanded ? 14 : 16} strokeWidth={1.6} aria-hidden />
          {count && !expanded ? <span className="notif-badge is-dot" aria-hidden /> : null}
        </span>
        {expanded ? <span className="flex-1 truncate text-start">{label}</span> : null}
        {count && expanded ? (
          <span className="notif-badge mono" aria-hidden>
            {countLabel}
          </span>
        ) : null}
        {flag ? expanded ? <FlagPill flag={flag} className="ms-auto" /> : <FlagDot flag={flag} /> : null}
      </button>
    </RailTip>
  );
}

/** Collapsed rail: each master section is one chip that opens a labelled
 * flyout of its tools — the rail stays short enough to never scroll. */
function GroupFlyout({
  group,
  label,
  labelFor,
  module,
  onSelect,
}: {
  group: NavGroup;
  label: string;
  labelFor: (id: ModuleId) => string;
  module: ModuleId;
  onSelect: (id: ModuleId) => void;
}): JSX.Element {
  const active = group.children.includes(module);
  const ActiveIcon = active ? MODULE_MAP[module].icon : group.icon;
  const [open, setOpen] = useState(false);
  const [tip, setTip] = useState(false);

  return (
    <DropdownMenu.Root open={open} onOpenChange={setOpen}>
      <Tooltip.Root delayDuration={200} open={tip && !open} onOpenChange={setTip}>
        <Tooltip.Trigger asChild>
          <DropdownMenu.Trigger asChild>
            <button
              type="button"
              data-active={active}
              data-open={open}
              data-nav-group={group.id}
              aria-label={label}
              className="nav-row is-compact"
              onPointerEnter={() => group.children.forEach(prefetchModule)}
            >
              <ActiveIcon size={16} strokeWidth={1.6} aria-hidden />
              <span className="rail-flyout-caret" aria-hidden />
            </button>
          </DropdownMenu.Trigger>
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content side="right" sideOffset={10} className={TIP_CLASS}>
            {label}
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          side="right"
          align="start"
          sideOffset={12}
          collisionPadding={12}
          className="rail-flyout z-[60] w-[224px] rounded-[14px] p-1.5"
        >
          <DropdownMenu.Label className="px-2.5 pb-1.5 pt-1 text-[10.5px] font-medium uppercase tracking-[0.08em] text-ash">
            {label}
          </DropdownMenu.Label>
          {group.children.map((id, i) => {
            const Icon = MODULE_MAP[id].icon;
            const isActive = module === id;
            return (
              <DropdownMenu.Item
                key={id}
                onSelect={() => onSelect(id)}
                aria-label={labelFor(id)}
                style={{ ['--i' as string]: i }}
                className="rail-flyout-item flex cursor-pointer items-center gap-2.5 rounded-[9px] px-2.5 py-2 text-[13px] text-mist outline-none data-[highlighted]:bg-[rgb(var(--tint-rgb)/0.06)] data-[highlighted]:text-paper"
              >
                <span
                  className={cn(
                    'flex h-7 w-7 shrink-0 items-center justify-center rounded-[8px]',
                    isActive ? 'bg-acid text-[#08090a]' : 'bg-[rgb(var(--tint-rgb)/0.05)] text-fog',
                  )}
                >
                  <Icon size={14} strokeWidth={1.7} aria-hidden />
                </span>
                <span className="min-w-0 flex-1 truncate">{labelFor(id)}</span>
                {isActive ? <Check size={13} strokeWidth={2.2} className="text-accent" aria-hidden /> : null}
              </DropdownMenu.Item>
            );
          })}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

/** Walk offsetParents up to `root`, so transforms mid-animation don't skew the result. */
function offsetWithin(el: HTMLElement, root: HTMLElement): { x: number; y: number } {
  let x = 0;
  let y = 0;
  let node: HTMLElement | null = el;
  while (node && node !== root) {
    x += node.offsetLeft;
    y += node.offsetTop;
    node = node.offsetParent as HTMLElement | null;
  }
  return { x, y };
}

const GROUP_OPEN_KEY = 'kanz.navGroupOpen.v1';

/**
 * Desktop / tablet navigation rail. Two states:
 *  - collapsed: a 64px icon rail that always fits every destination (docs
 *    fold into a flyout, rows compress on short screens, no visible scrollbar);
 *  - expanded: a 240px labelled sidebar — docked beside the content on wide
 *    screens, floating over it (with a scrim) on laptops and tablets.
 * A single glossy chip slides between rows to mark the active module.
 */
export function IconRail({ overlay = false }: { overlay?: boolean }): JSX.Element {
  const { module, setModule, railExpanded, toggleRail, setRailExpanded, setPaletteOpen, } =
    useUI();
  const { live, syncState } = useWorkspace();
  const { user, configured, avatarUrl } = useAuth();
  const { inboxNew } = useNotifications();
  const pro = isProUser(user);
  const { t } = useLanguage();
  const flagFor = useRowFlag();
  const expanded = railExpanded;
  const listRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const labelFor = useCallback((id: ModuleId) => t(NAV_KEY[id] ?? MODULE_MAP[id].label), [t]);

  // Accordion: one master section open at a time (the active module's),
  // so the sidebar never grows tall. Remembered between visits.
  const activeGroup = groupOf(module)?.id ?? null;
  const [openGroup, setOpenGroup] = useState<string | null>(() => {
    if (activeGroup) return activeGroup;
    try {
      return window.localStorage.getItem(GROUP_OPEN_KEY);
    } catch {
      return null;
    }
  });
  useEffect(() => {
    if (activeGroup) setOpenGroup(activeGroup);
  }, [activeGroup]);

  const toggleGroup = (id: string): void => {
    setOpenGroup((cur) => {
      const next = cur === id ? null : id;
      try {
        if (next) window.localStorage.setItem(GROUP_OPEN_KEY, next);
        else window.localStorage.removeItem(GROUP_OPEN_KEY);
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  const go = useCallback(
    (id: ModuleId) => {
      setModule(id);
      // Floating sidebar gets out of the way once a destination is picked.
      if (overlay) setRailExpanded(false);
    },
    [setModule, overlay, setRailExpanded],
  );

  // Escape closes the floating sidebar.
  useEffect(() => {
    if (!overlay) return;
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') setRailExpanded(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [overlay, setRailExpanded]);

  /* ── Sliding active indicator ──────────────────────────────────────── */
  const [ind, setInd] = useState<{ x: number; y: number; w: number; h: number; on: boolean; ready: boolean }>({
    x: 0,
    y: 0,
    w: 0,
    h: 0,
    on: false,
    ready: false,
  });
  /* Hover glider: one highlight that slides between rows under the pointer. */
  const [hov, setHov] = useState<{ x: number; y: number; w: number; h: number; on: boolean; fresh: boolean }>({
    x: 0,
    y: 0,
    w: 0,
    h: 0,
    on: false,
    fresh: true,
  });
  const onListPointer = useCallback((e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'touch') return;
    const list = listRef.current;
    const row = (e.target as HTMLElement).closest<HTMLElement>('.nav-row, .rail-group-head');
    if (!list || !row || !list.contains(row)) {
      setHov((p) => (p.on ? { ...p, on: false } : p));
      return;
    }
    const { x, y } = offsetWithin(row, list);
    const w = row.offsetWidth;
    const h = row.offsetHeight;
    setHov((p) =>
      p.on && p.x === x && p.y === y && p.w === w && p.h === h
        ? p
        : { x, y, w, h, on: true, fresh: !p.on },
    );
  }, []);
  const onListLeave = useCallback(() => setHov((p) => (p.on ? { ...p, on: false } : p)), []);

  const measure = useCallback(() => {
    const list = listRef.current;
    if (!list) return;
    const el = list.querySelector<HTMLElement>('[data-active="true"]');
    if (!el) {
      setInd((p) => (p.on ? { ...p, on: false } : p));
      return;
    }
    const { x, y } = offsetWithin(el, list);
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    setInd((p) =>
      p.on && p.x === x && p.y === y && p.w === w && p.h === h ? p : { x, y, w, h, on: true, ready: p.ready },
    );
  }, []);

  useLayoutEffect(() => {
    measure();
  }, [measure, module, expanded, openGroup, user]);

  useEffect(() => {
    // first measurement lands without a slide, later ones animate
    const id = requestAnimationFrame(() => setInd((p) => ({ ...p, ready: true })));
    const list = listRef.current;
    if (!list || typeof ResizeObserver === 'undefined') return () => cancelAnimationFrame(id);
    const ro = new ResizeObserver(() => measure());
    ro.observe(list);
    return () => {
      cancelAnimationFrame(id);
      ro.disconnect();
    };
  }, [measure]);

  // Keep the active row in view if the list ever does have to scroll.
  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>('[data-active="true"]');
    el?.scrollIntoView({ block: 'nearest' });
  }, [module, expanded]);

  /* ── Scroll affordance (only when the list genuinely overflows) ───── */
  const [edges, setEdges] = useState({ top: false, bottom: false });
  const updateEdges = useCallback(() => {
    const s = scrollRef.current;
    if (!s) return;
    const top = s.scrollTop > 2;
    const bottom = s.scrollTop + s.clientHeight < s.scrollHeight - 2;
    setEdges((p) => (p.top === top && p.bottom === bottom ? p : { top, bottom }));
  }, []);
  useEffect(() => {
    updateEdges();
    const s = scrollRef.current;
    if (!s || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(updateEdges);
    ro.observe(s);
    if (listRef.current) ro.observe(listRef.current);
    return () => ro.disconnect();
  }, [updateEdges, expanded, openGroup]);

  const sync = SYNC_LOOK_KEY[live ? syncState : 'offline'];
  const SyncIcon = sync.icon;
  const syncLabel = t(sync.key);
  const accountName = user ? getDisplayName(user) : configured ? t('shell.signIn') : t('shell.localOnly');

  const rows = (ids: ModuleId[], indent = false): JSX.Element[] =>
    ids.map((id) => (
      <RailRow
        key={id}
        meta={MODULE_MAP[id]}
        label={labelFor(id)}
        active={module === id}
        expanded={expanded}
        indent={indent}
        onSelect={() => go(id)}
        flag={flagFor(id)}
      />
    ));

  return (
    <Tooltip.Provider>
      <nav
        aria-label="Modules"
        data-expanded={expanded}
        data-overlay={overlay}
        className={cn('rail relative flex h-full shrink-0 flex-col', expanded ? 'w-[240px] px-3' : 'w-[64px] px-[13px]')}
      >
        {/* Edge toggle — straddles the rail's inner edge in both states */}
        <RailTip enabled label={<>{expanded ? 'Collapse' : 'Expand'} <kbd className="rail-kbd">[</kbd></>}>
          <button
            type="button"
            onClick={toggleRail}
            aria-label={expanded ? 'Collapse navigation' : 'Expand navigation'}
            aria-expanded={expanded}
            className="rail-edge-toggle"
          >
            <ChevronLeft
              size={13}
              strokeWidth={2.2}
              aria-hidden
              className={cn('transition-transform duration-300 rtl:-scale-x-100', !expanded && 'rotate-180')}
            />
          </button>
        </RailTip>

        <div className="rail-top" aria-hidden />

        {user ? <TeamSwitcher expanded={expanded} /> : null}

        <RailTip enabled={!expanded} label={t('shell.search')}>
          <button
            type="button"
            onClick={() => setPaletteOpen(true)}
            aria-label={expanded ? undefined : t('shell.search')}
            className={cn('rail-search', expanded ? 'w-full px-2.5' : 'is-compact')}
          >
            <Search size={15} strokeWidth={1.7} className="shrink-0" aria-hidden />
            {expanded ? (
              <>
                <span className="flex-1 text-start">{t('shell.search')}</span>
                <kbd className="rail-kbd">Ctrl K</kbd>
              </>
            ) : null}
          </button>
        </RailTip>

        <NotificationBell variant="rail" expanded={expanded} />
        {isAdminUser(user) ? (
          <RailRow
            meta={MODULE_MAP.inbox}
            label={labelFor('inbox')}
            active={module === 'inbox'}
            expanded={expanded}
            onSelect={() => go('inbox')}
            count={inboxNew}
          />
        ) : null}

        <div
          ref={scrollRef}
          onScroll={updateEdges}
          className={cn('rail-scroll -mx-2 min-h-0 flex-1 px-2', edges.top && 'fade-top', edges.bottom && 'fade-bottom')}
        >
          <div
            ref={listRef}
            className={cn('rail-list relative', ind.on && 'has-indicator')}
            onPointerMove={onListPointer}
            onPointerLeave={onListLeave}
          >
            <span
              className="rail-hover"
              aria-hidden
              data-on={hov.on}
              data-fresh={hov.fresh}
              style={{ transform: `translate3d(${hov.x}px, ${hov.y}px, 0)`, width: hov.w, height: hov.h }}
            />
            <span
              className="rail-indicator"
              aria-hidden
              style={{
                transform: `translate3d(${ind.x}px, ${ind.y}px, 0)`,
                width: ind.w,
                height: ind.h,
                opacity: ind.on ? 1 : 0,
                transitionDuration: ind.ready ? undefined : '0ms',
              }}
            />

            <section className="rail-section">
              <div className="rail-stack">{rows([HOME_ID, 'portfolio'])}</div>
            </section>

            {NAV_GROUPS.map((g) => {
              const label = t(g.labelKey);
              const GroupIcon = g.icon;
              const isOpen = openGroup === g.id;
              const holdsActive = g.children.includes(module);
              if (!expanded) {
                return (
                  <section key={g.id} className="rail-section">
                    <div className="rail-divider" aria-hidden />
                    <div className="rail-stack">
                      <GroupFlyout group={g} label={label} labelFor={labelFor} module={module} onSelect={go} />
                    </div>
                  </section>
                );
              }
              return (
                <section key={g.id} className="rail-section">
                  <button
                    type="button"
                    onClick={() => toggleGroup(g.id)}
                    onPointerEnter={() => g.children.forEach(prefetchModule)}
                    aria-expanded={isOpen}
                    data-nav-group={g.id}
                    data-contains={g.children.map(labelFor).join('|')}
                    className={cn('rail-group-head', holdsActive && !isOpen && 'holds-active')}
                  >
                    <GroupIcon size={15} strokeWidth={1.7} className="shrink-0" aria-hidden />
                    <span className="flex-1 truncate text-start">{label}</span>
                    {!isOpen ? <span className="rail-group-count mono">{g.children.length}</span> : null}
                    <ChevronDown
                      size={13}
                      strokeWidth={2}
                      className={cn('shrink-0 transition-transform duration-200', isOpen ? 'rotate-0' : '-rotate-90')}
                      aria-hidden
                    />
                  </button>
                  <div className={cn('rail-group-body grid', isOpen && 'is-open')}>
                    <div className="min-h-0 overflow-hidden">
                      <div className="rail-stack is-tree pb-1 pt-0.5">{isOpen ? rows(g.children, true) : null}</div>
                    </div>
                  </div>
                </section>
              );
            })}
          </div>
        </div>

        <div className="rail-foot">
          <RailRow
            meta={MODULE_MAP.contact}
            label={labelFor('contact')}
            active={module === 'contact'}
            expanded={expanded}
            onSelect={() => go('contact')}
          />

          <AccountMenu side="right" align="end">
            <button
              type="button"
              aria-label={`${t('shell.account')} — ${accountName}`}
              className={cn('nav-row', expanded ? 'rail-account' : 'is-compact')}
            >
              <span className="relative shrink-0">
                <Avatar src={avatarUrl} name={user ? accountName : 'Guest'} size={expanded ? 28 : 24} pro={pro} />
                {configured ? (
                  <span
                    className="rail-sync-dot absolute -bottom-0.5 -end-0.5 flex h-[13px] w-[13px] items-center justify-center rounded-full bg-void"
                    aria-hidden
                  >
                    <SyncIcon
                      size={9}
                      strokeWidth={2.4}
                      className={cn(syncState === 'syncing' && live && 'animate-spin')}
                      style={{ color: sync.color }}
                    />
                  </span>
                ) : null}
              </span>
              {expanded ? (
                <>
                  <span className="min-w-0 flex-1 text-start">
                    <span className="flex items-center gap-1.5">
                      <span className="block truncate text-[12.5px] text-mist">{accountName}</span>
                      <PlanChip user={user} />
                    </span>
                    <span className="mono block truncate text-[10px] uppercase tracking-[0.07em] text-ash">
                      {user ? syncLabel : t('shell.thisDevice')}
                    </span>
                  </span>
                  <UserRound size={13} strokeWidth={1.7} className="shrink-0 text-ash" aria-hidden />
                </>
              ) : null}
            </button>
          </AccountMenu>
        </div>
      </nav>
    </Tooltip.Provider>
  );
}
