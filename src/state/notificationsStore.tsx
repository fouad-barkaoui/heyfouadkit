import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { isAdminUser } from '@/lib/access';
import { collectReminders, type Reminder } from '@/lib/reminders';
import {
  CONTACT_CHANGED_EVENT,
  listNewContactMessages,
  watchContactInserts,
  type ContactMessage,
} from '@/data/contact';
import { TOPIC_LABEL } from '@/modules/contact/topics';
import { useAuth } from './authStore';
import { useWorkspace } from './workspaceStore';

/**
 * Notification centre state. Reminders themselves are derived from the
 * workspace (see lib/reminders.ts) — only the person's reactions to them are
 * stored here, on this device:
 *
 *   read       — seen in the bell panel (clears the badge, keeps the item)
 *   dismissed  — cleared from the list
 *   alerted    — already shown as a phone/desktop alert (never alert twice)
 *
 * Keys carry the date they're about, so state for reminders that no longer
 * exist (task done, day moved on) is pruned automatically.
 */

const STORAGE_KEY = 'kanz.notifications.v1';
const TICK_MS = 60_000;

interface Persisted {
  read: string[];
  dismissed: string[];
  alerted: string[];
  alerts: boolean;
}

const EMPTY: Persisted = { read: [], dismissed: [], alerted: [], alerts: false };

function load(): Persisted {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY;
    const p = JSON.parse(raw) as Partial<Persisted>;
    const arr = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []);
    return { read: arr(p.read), dismissed: arr(p.dismissed), alerted: arr(p.alerted), alerts: p.alerts === true };
  } catch {
    return EMPTY;
  }
}

function relativeTime(iso: string, now: Date): string {
  const mins = Math.max(0, Math.round((now.getTime() - new Date(iso).getTime()) / 60_000));
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

function save(p: Persisted): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
  } catch {
    /* private mode — reactions just won't survive a reload */
  }
}

export type AlertSupport = 'unsupported' | 'default' | 'granted' | 'denied';

function alertSupport(): AlertSupport {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
  return Notification.permission as AlertSupport;
}

async function showSystemAlert(title: string, body: string, module: string, tag: string): Promise<void> {
  const options: NotificationOptions & { renotify?: boolean } = {
    body,
    tag,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    data: { url: `/#/${module}` },
  };
  try {
    // Android Chrome only allows notifications through the service worker.
    const reg = 'serviceWorker' in navigator ? await navigator.serviceWorker.getRegistration() : undefined;
    if (reg) {
      await reg.showNotification(title, options);
      return;
    }
    const n = new Notification(title, options);
    n.onclick = () => {
      window.focus();
      window.location.hash = `/${module}`;
      n.close();
    };
  } catch {
    /* blocked or unsupported — the bell still shows it */
  }
}

interface NotificationsValue {
  /** Everything currently worth reminding about, minus what was cleared. */
  items: Reminder[];
  /** Not yet seen in the panel — drives the badge. */
  unread: number;
  isRead: (key: string) => boolean;
  markAllRead: () => void;
  dismiss: (key: string) => void;
  dismissAll: () => void;
  /** Phone / desktop alerts while the app is open or in the background. */
  alertsOn: boolean;
  alertSupport: AlertSupport;
  setAlertsOn: (on: boolean) => Promise<void>;
}

const NotificationsContext = createContext<NotificationsValue | null>(null);

export function NotificationsProvider({ children }: { children: ReactNode }): JSX.Element {
  const { workspace, ready } = useWorkspace();
  const [now, setNow] = useState(() => new Date());
  const [state, setState] = useState<Persisted>(() => (typeof window === 'undefined' ? EMPTY : load()));
  const [support, setSupport] = useState<AlertSupport>(() => alertSupport());

  // Time passing is what turns "due today" into "missed" — re-check every
  // minute, and immediately when the app comes back to the foreground.
  useEffect(() => {
    const tick = (): void => setNow(new Date());
    const id = window.setInterval(tick, TICK_MS);
    const onVisible = (): void => {
      if (document.visibilityState === 'visible') {
        tick();
        setSupport(alertSupport());
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', tick);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', tick);
    };
  }, []);

  /* ── Admin only: new contact messages show up in the bell ───────────── */
  const { user } = useAuth();
  const admin = isAdminUser(user);
  const [inbox, setInbox] = useState<ContactMessage[]>([]);
  useEffect(() => {
    if (!admin) {
      setInbox([]);
      return;
    }
    let alive = true;
    const pull = (): void => {
      void listNewContactMessages().then((list) => {
        if (alive) setInbox(list);
      });
    };
    pull();
    const id = window.setInterval(pull, 45_000);
    window.addEventListener(CONTACT_CHANGED_EVENT, pull);
    window.addEventListener('focus', pull);
    const stop = watchContactInserts(pull);
    return () => {
      alive = false;
      window.clearInterval(id);
      window.removeEventListener(CONTACT_CHANGED_EVENT, pull);
      window.removeEventListener('focus', pull);
      stop();
    };
  }, [admin]);

  const all = useMemo(() => {
    const base = ready ? collectReminders(workspace, now) : [];
    const messages: Reminder[] = inbox.map((m) => ({
      key: `msg:${m.id}`,
      kind: 'message-new',
      title: `${m.name} · ${TOPIC_LABEL[m.topic]}`,
      detail: m.subject,
      module: 'inbox',
      recordId: m.id,
      at: m.createdAt,
      missed: false,
      when: relativeTime(m.createdAt, now),
    }));
    return [...messages, ...base];
  }, [ready, workspace, now, inbox]);

  const update = useCallback((fn: (p: Persisted) => Persisted) => {
    setState((prev) => {
      const next = fn(prev);
      save(next);
      return next;
    });
  }, []);

  // Forget reactions to reminders that no longer exist, so storage stays tiny.
  useEffect(() => {
    if (!ready) return;
    const live = new Set(all.map((r) => r.key));
    update((p) => {
      const keep = (list: string[]): string[] => list.filter((k) => live.has(k));
      const next = { ...p, read: keep(p.read), dismissed: keep(p.dismissed), alerted: keep(p.alerted) };
      const same =
        next.read.length === p.read.length &&
        next.dismissed.length === p.dismissed.length &&
        next.alerted.length === p.alerted.length;
      return same ? p : next;
    });
  }, [all, ready, update]);

  const items = useMemo(() => {
    const dismissed = new Set(state.dismissed);
    return all.filter((r) => !dismissed.has(r.key));
  }, [all, state.dismissed]);

  const readSet = useMemo(() => new Set(state.read), [state.read]);
  const unread = useMemo(() => items.filter((r) => !readSet.has(r.key)).length, [items, readSet]);

  /* ── Device alerts for newly missed things ──────────────────────────── */
  const alerting = useRef(false);
  useEffect(() => {
    if (!ready || !state.alerts || support !== 'granted' || alerting.current) return;
    const seen = new Set(state.alerted);
    const fresh = items.filter((r) => (r.missed || r.kind === 'message-new') && !seen.has(r.key) && !readSet.has(r.key));
    if (!fresh.length) return;
    alerting.current = true;
    const first = fresh[0]!;
    const allMessages = fresh.every((r) => r.kind === 'message-new');
    const run =
      allMessages && fresh.length > 1
        ? showSystemAlert(
            `${fresh.length} new messages`,
            fresh
              .slice(0, 3)
              .map((r) => `• ${r.title}`)
              .join('\n'),
            'inbox',
            'kanz-messages-summary',
          )
        : fresh.length === 1
        ? showSystemAlert(first.title, first.detail, first.module, first.key)
        : showSystemAlert(
            `You missed ${fresh.length} things`,
            fresh
              .slice(0, 3)
              .map((r) => `• ${r.title}`)
              .join('\n') + (fresh.length > 3 ? `\n+${fresh.length - 3} more` : ''),
            first.module,
            'kanz-missed-summary',
          );
    void run.finally(() => {
      alerting.current = false;
      update((p) => ({ ...p, alerted: [...new Set([...p.alerted, ...fresh.map((r) => r.key)])] }));
    });
  }, [items, ready, readSet, state.alerts, state.alerted, support, update]);

  const markAllRead = useCallback(() => {
    update((p) => ({ ...p, read: [...new Set([...p.read, ...items.map((r) => r.key)])] }));
  }, [items, update]);

  const dismiss = useCallback(
    (key: string) => update((p) => ({ ...p, dismissed: [...new Set([...p.dismissed, key])] })),
    [update],
  );

  const dismissAll = useCallback(() => {
    update((p) => ({ ...p, dismissed: [...new Set([...p.dismissed, ...items.map((r) => r.key)])] }));
  }, [items, update]);

  const setAlertsOn = useCallback(
    async (on: boolean) => {
      if (!on) {
        update((p) => ({ ...p, alerts: false }));
        return;
      }
      if (!('Notification' in window)) {
        setSupport('unsupported');
        return;
      }
      let perm = Notification.permission;
      if (perm === 'default') {
        try {
          perm = await Notification.requestPermission();
        } catch {
          perm = 'denied';
        }
      }
      setSupport(perm as AlertSupport);
      if (perm !== 'granted') return;
      update((p) => ({ ...p, alerts: true }));
      void showSystemAlert('Reminders are on', "We'll alert you here when something is missed.", 'home', 'kanz-alerts-on');
    },
    [update],
  );

  const value = useMemo<NotificationsValue>(
    () => ({
      items,
      unread,
      isRead: (key: string) => readSet.has(key),
      markAllRead,
      dismiss,
      dismissAll,
      alertsOn: state.alerts && support === 'granted',
      alertSupport: support,
      setAlertsOn,
    }),
    [items, unread, readSet, markAllRead, dismiss, dismissAll, state.alerts, support, setAlertsOn],
  );

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}

export function useNotifications(): NotificationsValue {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error('useNotifications must be used inside <NotificationsProvider>');
  return ctx;
}
