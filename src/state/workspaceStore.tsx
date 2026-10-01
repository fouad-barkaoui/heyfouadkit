import type { RealtimeChannel } from '@supabase/supabase-js';
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
import { getRepository } from '@/data';
import { deleteAttachmentFile } from '@/data/attachments';
import { friendlyCloudError } from '@/data/cloudErrors';
import { countRecords, fetchTeamWorkspace, subscribeTeam } from '@/data/cloudSync';
import { kvGet, kvSet } from '@/data/kvStore';
import { applyOutbox, enqueue, flushOutbox, pendingCount, readOutbox, subscribeOutbox, type NewOp, type OpInput } from '@/data/outbox';
import { markTouched, resetLocalWorkspace } from '@/data/localRepository';
import { emptyWorkspace, normalizeWorkspace } from '@/data/normalize';
import { getSupabase } from '@/data/supabaseClient';
import type { Attachment, CollectionKey, Workspace } from '@/lib/types';
import { nowISO } from '@/lib/utils';
import { useAuth } from './authStore';
import { useTeam } from './teamStore';
import { translate } from './languageStore';

type Item<K extends CollectionKey> = Workspace[K][number];

export type SyncState = 'offline' | 'idle' | 'syncing' | 'synced' | 'queued' | 'error';

/** Bounds a promise so a stalled connection can't leave the loader spinning
 * forever — a flaky link fails outright in a few seconds; it's slow requests
 * that hang indefinitely, and this is what actually shows up as "the app
 * never finishes loading." */
function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error(message)), ms);
    promise.then(
      (value) => {
        window.clearTimeout(timer);
        resolve(value);
      },
      (err: unknown) => {
        window.clearTimeout(timer);
        reject(err instanceof Error ? err : new Error(translate('core.ws.requestFailed')));
      },
    );
  });
}

interface WorkspaceContextValue {
  ready: boolean;
  error: string | null;
  workspace: Workspace;
  createRecord: <K extends CollectionKey>(key: K, record: Item<K>) => void;
  updateRecord: <K extends CollectionKey>(key: K, id: string, patch: Partial<Item<K>>) => void;
  removeRecord: (key: CollectionKey, id: string) => void;
  toggleInteresting: (key: CollectionKey, id: string) => void;
  resetWorkspace: () => void;

  /* attachments */
  attachmentsFor: (ownerId: string) => Attachment[];
  addAttachment: (attachment: Attachment) => void;
  removeAttachment: (id: string) => void;
  reparentAttachments: (fromOwnerId: string, toOwnerId: string) => void;

  /* live team sync */
  live: boolean;
  syncState: SyncState;
  syncMessage: string | null;
  recordCount: number;
  /** Re-run the cloud load (after an error, or on demand). */
  retrySync: () => void;
  /** Changes made offline that are waiting to reach the cloud. */
  pendingChanges: number;
  /** The browser's view of the network. */
  online: boolean;
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

const HAS_UPDATED_AT: CollectionKey[] = [
  'notes',
  'todos',
  'articles',
  'courses',
  'docs',
  'news',
  'medicines',
  'treatmentPlans',
  'links',
  'habits',
  'goals',
];

export function WorkspaceProvider({ children }: { children: ReactNode }): JSX.Element {
  const repo = useMemo(() => getRepository(), []);
  const supabase = useMemo(() => getSupabase(), []);
  const { user } = useAuth();
  const { activeTeamId, ready: teamReady } = useTeam();

  const [workspace, setWorkspace] = useState<Workspace>(emptyWorkspace);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [syncState, setSyncState] = useState<SyncState>('offline');
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [syncAttempt, setSyncAttempt] = useState(0);
  const retrySync = useCallback(() => setSyncAttempt((n) => n + 1), []);

  const dirty = useRef(false);
  const live = Boolean(supabase && user && activeTeamId);
  // Profile edits hand us a new user object; only a different account matters.
  const userId = user?.id ?? null;

  const [online, setOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine !== false));
  const [pendingChanges, setPendingChanges] = useState(() => pendingCount(activeTeamId));
  useEffect(() => {
    const sync = (): void => setPendingChanges(pendingCount(activeTeamId));
    sync();
    const up = (): void => setOnline(true);
    const down = (): void => setOnline(false);
    window.addEventListener('online', up);
    window.addEventListener('offline', down);
    const unsub = subscribeOutbox(sync);
    return () => {
      window.removeEventListener('online', up);
      window.removeEventListener('offline', down);
      unsub();
    };
  }, [activeTeamId]);

  /* ── Local-first fallback: no cloud project, signed out, or no team yet ── */
  useEffect(() => {
    if (live) return;
    let cancelled = false;
    setReady(false);
    repo
      .load()
      .then((data) => {
        if (!cancelled) setWorkspace(data);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : translate('core.ws.loadFailed'));
      })
      .finally(() => {
        if (!cancelled) setReady(true);
      });
    setSyncState('offline');
    return () => {
      cancelled = true;
    };
  }, [live, repo]);

  useEffect(() => {
    if (live || !ready || !dirty.current) return;
    const handle = window.setTimeout(() => {
      void repo.save(workspace);
    }, 200);
    return () => window.clearTimeout(handle);
  }, [workspace, ready, repo, live]);

  /* ── Sending queued changes ──────────────────────────────────────────── */
  const flushing = useRef(false);
  const flush = useCallback(async (): Promise<void> => {
    if (!supabase || !userId) return;
    if (flushing.current) return;
    flushing.current = true;
    try {
      const res = await flushOutbox(supabase, userId);
      if (res.dropped.length) {
        setSyncState('error');
        setSyncMessage(translate('core.ws.changeNotSaved', { error: friendlyCloudError(res.dropped[0]!.message) }));
      } else if (res.remaining > 0 && res.blocked) {
        setSyncState('queued');
        setSyncMessage(null);
      } else if (res.remaining === 0) {
        setSyncState((s) => (s === 'queued' || s === 'syncing' ? 'synced' : s));
      }
    } finally {
      flushing.current = false;
    }
  }, [supabase, userId]);

  /* ── Live team mode: cached boot, then cloud load + realtime ─────────── */
  useEffect(() => {
    if (!live || !supabase || !activeTeamId || !userId) return;
    let cancelled = false;
    let channel: RealtimeChannel | null = null;
    const cacheKey = `ws.${userId}.${activeTeamId}`;

    setSyncState('syncing');
    setSyncMessage(null);

    void (async () => {
      // 1. Paint instantly from the last snapshot on this device (and work
      //    fully offline from it), with any unsent changes laid on top.
      let painted = false;
      try {
        const cached = await kvGet<Workspace>(cacheKey);
        if (cached && !cancelled) {
          setWorkspace(applyOutbox(normalizeWorkspace(cached), readOutbox(), activeTeamId));
          setReady(true);
          painted = true;
        }
      } catch {
        /* no cache — fall through to the network */
      }
      if (!painted && !cancelled) setReady(false);

      if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        if (cancelled) return;
        setReady(true);
        setSyncState(pendingCount(activeTeamId) ? 'queued' : painted ? 'queued' : 'error');
        if (!painted) setSyncMessage(translate('core.ws.offlineUnopened'));
        return;
      }

      try {
        // 2. Send anything that was waiting, so the fresh load includes it.
        await withTimeout(flushOutbox(supabase, userId), 15000, 'Timed out sending queued changes.').catch(() => undefined);
        const { workspace: remote, failed } = await withTimeout(
          fetchTeamWorkspace(supabase, activeTeamId),
          20000,
          'Timed out reaching the cloud — check your connection and try again.',
        );
        if (cancelled) return;
        const pending = readOutbox();
        setWorkspace(applyOutbox(remote, pending, activeTeamId));
        setReady(true);
        void kvSet(cacheKey, remote);
        if (failed.length) {
          setSyncState('error');
          setSyncMessage(
            translate('core.ws.syncedExcept', {
              tables: failed
                .map((f) => {
                  const key = `core.table.${f.table}`;
                  const label = translate(key);
                  return label === key ? f.table.replace('_', ' ') : label;
                })
                .join(translate('core.listSeparator')),
              error: friendlyCloudError(failed[0]!.message),
            }),
          );
        } else {
          setSyncState(pending.some((o) => o.teamId === activeTeamId) ? 'queued' : 'synced');
        }

        channel = subscribeTeam(supabase, activeTeamId, (change) => {
          setWorkspace((prev) => {
            const list = prev[change.key] as { id: string }[];
            if (change.eventType === 'DELETE') {
              if (!change.id) return prev;
              return { ...prev, [change.key]: list.filter((item) => item.id !== change.id) } as Workspace;
            }
            if (!change.record) return prev;
            const record = change.record;
            const idx = list.findIndex((item) => item.id === change.id);
            if (idx === -1) return { ...prev, [change.key]: [change.record, ...list] } as Workspace;
            const next = list.map((item, i) => (i === idx ? { ...item, ...record } : item));
            return { ...prev, [change.key]: next } as Workspace;
          });
        });
      } catch (e) {
        if (!cancelled) {
          // With a snapshot on screen a failed load isn't an error for the
          // person — they keep working and it catches up when it can.
          if (painted) {
            setSyncState('queued');
            setSyncMessage(null);
          } else {
            setSyncState('error');
            setSyncMessage(friendlyCloudError(e));
          }
          setReady(true);
        }
      }
    })();

    return () => {
      cancelled = true;
      if (channel) void supabase.removeChannel(channel);
    };
  }, [live, supabase, activeTeamId, userId, syncAttempt]);

  // Keep this device's snapshot fresh (debounced, off the typing path).
  useEffect(() => {
    if (!live || !ready || !userId || !activeTeamId || !dirty.current) return;
    const cacheKey = `ws.${userId}.${activeTeamId}`;
    const handle = window.setTimeout(() => void kvSet(cacheKey, workspace), 1200);
    return () => window.clearTimeout(handle);
  }, [workspace, live, ready, userId, activeTeamId]);

  // Back online, back to the tab, or every 30s while something waits: retry.
  useEffect(() => {
    if (!live || (syncState !== 'error' && syncState !== 'queued')) return;
    const kick = (): void => {
      if (navigator.onLine === false) return;
      retrySync();
    };
    const onVisible = (): void => {
      if (document.visibilityState === 'visible') kick();
    };
    window.addEventListener('online', kick);
    document.addEventListener('visibilitychange', onVisible);
    const timer = window.setInterval(kick, 30000);
    return () => {
      window.removeEventListener('online', kick);
      document.removeEventListener('visibilitychange', onVisible);
      window.clearInterval(timer);
    };
  }, [live, syncState, retrySync]);

  const touch = useCallback(() => {
    dirty.current = true;
    markTouched();
  }, []);

  /** Queue a cloud write and try to send it right away. */
  const push = useCallback(
    (op: OpInput) => {
      if (!live || !userId || !activeTeamId) return;
      enqueue({ ...op, teamId: activeTeamId, userId } as NewOp);
      void flush();
    },
    [live, userId, activeTeamId, flush],
  );

  /* ── Mutations — optimistic locally, mirrored to the team live ──────── */
  const createRecord = useCallback(
    <K extends CollectionKey>(key: K, record: Item<K>) => {
      touch();
      setWorkspace((prev) => ({ ...prev, [key]: [record, ...prev[key]] }) as Workspace);
      push({ kind: 'upsert', key, id: record.id, record: record as unknown as Record<string, unknown> });
    },
    [touch, push],
  );

  const updateRecord = useCallback(
    <K extends CollectionKey>(key: K, id: string, patch: Partial<Item<K>>) => {
      touch();
      const stamped = HAS_UPDATED_AT.includes(key) ? { ...patch, updatedAt: nowISO() } : patch;
      setWorkspace(
        (prev) =>
          ({
            ...prev,
            [key]: (prev[key] as Item<K>[]).map((item) => (item.id === id ? { ...item, ...stamped } : item)),
          }) as Workspace,
      );
      push({ kind: 'patch', key, id, patch: stamped as unknown as Record<string, unknown> });
    },
    [touch, push],
  );

  const removeRecord = useCallback(
    (key: CollectionKey, id: string) => {
      touch();
      setWorkspace((prev) => {
        const orphaned = key === 'attachments' ? [] : prev.attachments.filter((a) => a.ownerId === id);
        for (const attachment of orphaned) void deleteAttachmentFile(attachment);
        return {
          ...prev,
          [key]: (prev[key] as { id: string }[]).filter((item) => item.id !== id),
          attachments:
            key === 'attachments'
              ? prev.attachments.filter((a) => a.id !== id)
              : prev.attachments.filter((a) => a.ownerId !== id),
        } as Workspace;
      });
      push({ kind: 'delete', key, id });
    },
    [touch, push],
  );

  const toggleInteresting = useCallback(
    (key: CollectionKey, id: string) => {
      if (key === 'badges' || key === 'attachments') return;
      touch();
      let nextValue = false;
      setWorkspace((prev) => {
        const list = prev[key] as { id: string; isInteresting: boolean }[];
        return {
          ...prev,
          [key]: list.map((item) => {
            if (item.id !== id) return item;
            nextValue = !item.isInteresting;
            return { ...item, isInteresting: nextValue };
          }),
        } as Workspace;
      });
      push({ kind: 'patch', key, id, patch: { isInteresting: nextValue } });
    },
    [touch, push],
  );

  const resetWorkspace = useCallback(() => {
    resetLocalWorkspace();
    window.location.reload();
  }, []);

  /* ── Attachments ─────────────────────────────────────────────────────── */
  const attachmentsFor = useCallback(
    (ownerId: string) => workspace.attachments.filter((a) => a.ownerId === ownerId),
    [workspace.attachments],
  );

  const addAttachment = useCallback(
    (attachment: Attachment) => {
      touch();
      setWorkspace((prev) => ({ ...prev, attachments: [...prev.attachments, attachment] }));
      push({ kind: 'upsert', key: 'attachments', id: attachment.id, record: attachment as unknown as Record<string, unknown> });
    },
    [touch, push],
  );

  const removeAttachment = useCallback(
    (id: string) => {
      touch();
      setWorkspace((prev) => {
        const target = prev.attachments.find((a) => a.id === id);
        if (target) void deleteAttachmentFile(target);
        return { ...prev, attachments: prev.attachments.filter((a) => a.id !== id) };
      });
      push({ kind: 'delete', key: 'attachments', id });
    },
    [touch, push],
  );

  const reparentAttachments = useCallback(
    (fromOwnerId: string, toOwnerId: string) => {
      touch();
      setWorkspace((prev) => {
        for (const a of prev.attachments) {
          if (a.ownerId === fromOwnerId) push({ kind: 'patch', key: 'attachments', id: a.id, patch: { ownerId: toOwnerId } });
        }
        return {
          ...prev,
          attachments: prev.attachments.map((a) => (a.ownerId === fromOwnerId ? { ...a, ownerId: toOwnerId } : a)),
        };
      });
    },
    [touch, push],
  );

  const value = useMemo<WorkspaceContextValue>(
    () => ({
      ready: ready && teamReady,
      error,
      workspace,
      createRecord,
      updateRecord,
      removeRecord,
      toggleInteresting,
      resetWorkspace,
      attachmentsFor,
      addAttachment,
      removeAttachment,
      reparentAttachments,
      live,
      syncState,
      syncMessage,
      retrySync,
      pendingChanges,
      online,
      recordCount: countRecords(workspace),
    }),
    [
      ready,
      teamReady,
      error,
      workspace,
      createRecord,
      updateRecord,
      removeRecord,
      toggleInteresting,
      resetWorkspace,
      attachmentsFor,
      addAttachment,
      removeAttachment,
      reparentAttachments,
      live,
      syncState,
      syncMessage,
      retrySync,
      pendingChanges,
      online,
    ],
  );

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace(): WorkspaceContextValue {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error('useWorkspace must be used inside <WorkspaceProvider>');
  return ctx;
}
