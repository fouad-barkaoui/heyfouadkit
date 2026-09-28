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
import { countRecords, deleteRow, fetchTeamWorkspace, patchRow, subscribeTeam, writeRow } from '@/data/cloudSync';
import { markTouched, resetLocalWorkspace } from '@/data/localRepository';
import { emptyWorkspace } from '@/data/normalize';
import { getSupabase } from '@/data/supabaseClient';
import type { Attachment, CollectionKey, Workspace } from '@/lib/types';
import { nowISO } from '@/lib/utils';
import { useAuth } from './authStore';
import { useTeam } from './teamStore';

type Item<K extends CollectionKey> = Workspace[K][number];

export type SyncState = 'offline' | 'idle' | 'syncing' | 'synced' | 'error';

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
        reject(err instanceof Error ? err : new Error('Request failed'));
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
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load workspace');
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

  /* ── Live team mode: initial load + realtime subscription ──────────── */
  useEffect(() => {
    if (!live || !supabase || !activeTeamId) return;
    let cancelled = false;
    let channel: RealtimeChannel | null = null;

    setReady(false);
    setSyncState('syncing');
    setSyncMessage(null);

    void (async () => {
      try {
        const { workspace: remote, failed } = await withTimeout(
          fetchTeamWorkspace(supabase, activeTeamId),
          20000,
          'Timed out reaching the cloud — check your connection and try again.',
        );
        if (cancelled) return;
        setWorkspace(remote);
        setReady(true);
        if (failed.length) {
          setSyncState('error');
          setSyncMessage(
            `Synced, except ${failed.map((f) => f.table.replace('_', ' ')).join(', ')} — ${friendlyCloudError(failed[0]!.message)}`,
          );
        } else {
          setSyncState('synced');
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
          setSyncState('error');
          setSyncMessage(friendlyCloudError(e));
          setReady(true);
        }
      }
    })();

    return () => {
      cancelled = true;
      if (channel) void supabase.removeChannel(channel);
    };
  }, [live, supabase, activeTeamId, syncAttempt]);

  // Coming back online, or back to the tab after a failure, retries quietly.
  useEffect(() => {
    if (!live || syncState !== 'error') return;
    const onOnline = (): void => retrySync();
    const onVisible = (): void => {
      if (document.visibilityState === 'visible') retrySync();
    };
    window.addEventListener('online', onOnline);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.removeEventListener('online', onOnline);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [live, syncState, retrySync]);

  const touch = useCallback(() => {
    dirty.current = true;
    markTouched();
  }, []);

  const reportWriteError = useCallback((e: unknown) => {
    setSyncState('error');
    setSyncMessage(`A change could not be saved to the cloud — ${friendlyCloudError(e)}`);
  }, []);

  /* ── Mutations — optimistic locally, mirrored to the team live ──────── */
  const createRecord = useCallback(
    <K extends CollectionKey>(key: K, record: Item<K>) => {
      touch();
      setWorkspace((prev) => ({ ...prev, [key]: [record, ...prev[key]] }) as Workspace);
      if (live && supabase && user && activeTeamId) {
        void writeRow(supabase, key, user.id, activeTeamId, record as unknown as Record<string, unknown>).catch(
          reportWriteError,
        );
      }
    },
    [touch, live, supabase, user, activeTeamId, reportWriteError],
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
      if (live && supabase) {
        void patchRow(supabase, key, id, stamped as unknown as Record<string, unknown>).catch(reportWriteError);
      }
    },
    [touch, live, supabase, reportWriteError],
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
      if (live && supabase) {
        void deleteRow(supabase, key, id).catch(reportWriteError);
      }
    },
    [touch, live, supabase, reportWriteError],
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
      if (live && supabase) {
        void patchRow(supabase, key, id, { isInteresting: nextValue }).catch(reportWriteError);
      }
    },
    [touch, live, supabase, reportWriteError],
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
      if (live && supabase && user && activeTeamId) {
        void writeRow(
          supabase,
          'attachments',
          user.id,
          activeTeamId,
          attachment as unknown as Record<string, unknown>,
        ).catch(reportWriteError);
      }
    },
    [touch, live, supabase, user, activeTeamId, reportWriteError],
  );

  const removeAttachment = useCallback(
    (id: string) => {
      touch();
      setWorkspace((prev) => {
        const target = prev.attachments.find((a) => a.id === id);
        if (target) void deleteAttachmentFile(target);
        return { ...prev, attachments: prev.attachments.filter((a) => a.id !== id) };
      });
      if (live && supabase) {
        void deleteRow(supabase, 'attachments', id).catch(reportWriteError);
      }
    },
    [touch, live, supabase, reportWriteError],
  );

  const reparentAttachments = useCallback(
    (fromOwnerId: string, toOwnerId: string) => {
      touch();
      setWorkspace((prev) => ({
        ...prev,
        attachments: prev.attachments.map((a) => (a.ownerId === fromOwnerId ? { ...a, ownerId: toOwnerId } : a)),
      }));
      if (live && supabase) {
        void patchRow(supabase, 'attachments', fromOwnerId, { ownerId: toOwnerId }).catch(reportWriteError);
      }
    },
    [touch, live, supabase, reportWriteError],
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
    ],
  );

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace(): WorkspaceContextValue {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error('useWorkspace must be used inside <WorkspaceProvider>');
  return ctx;
}
