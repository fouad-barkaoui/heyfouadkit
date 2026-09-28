import type { SupabaseClient } from '@supabase/supabase-js';
import type { CollectionKey, Workspace } from '@/lib/types';
import { isTransientError } from './cloudErrors';
import { deleteRow, patchRow, writeRow } from './cloudSync';

/**
 * The offline outbox. Every cloud write is queued here first (synchronously,
 * in localStorage, so a closed tab never loses it) and then sent in order.
 * If the network is down the ops simply wait; they're retried when the
 * browser comes back online, when the tab regains focus, and on next boot.
 *
 * Ops on the same record are coalesced — ten edits to one note offline go
 * out as a single request — while their first position in the queue is
 * kept, so a parent row is always written before rows that point at it.
 */

type Base = { seq: number; teamId: string; userId: string; key: CollectionKey; id: string; tries?: number };
export type OutboxOp =
  | (Base & { kind: 'upsert'; record: Record<string, unknown> })
  | (Base & { kind: 'patch'; patch: Record<string, unknown> })
  | (Base & { kind: 'delete' });

export type NewOp =
  | Omit<Extract<OutboxOp, { kind: 'upsert' }>, 'seq'>
  | Omit<Extract<OutboxOp, { kind: 'patch' }>, 'seq'>
  | Omit<Extract<OutboxOp, { kind: 'delete' }>, 'seq'>;

/** An op before the store stamps who/where it belongs to. */
export type OpInput = NewOp extends infer T ? (T extends unknown ? Omit<T, 'teamId' | 'userId'> : never) : never;

const KEY = 'heyfouad.outbox.v1';

/* ── Pure queue logic (unit-tested) ─────────────────────────────────────── */

export function coalesce(queue: OutboxOp[], op: NewOp, seq: number): OutboxOp[] {
  const idx = queue.findIndex(
    (q) => q.teamId === op.teamId && q.key === op.key && q.id === op.id && q.kind !== 'delete',
  );
  const fresh = { ...op, seq } as OutboxOp;
  if (idx === -1) return [...queue, fresh];
  const prev = queue[idx]!;
  let merged: OutboxOp;
  if (op.kind === 'delete') {
    merged = { ...fresh, seq: prev.seq };
  } else if (op.kind === 'upsert') {
    merged = { ...fresh, seq: prev.seq };
  } else if (prev.kind === 'upsert') {
    merged = { ...prev, record: { ...prev.record, ...op.patch } };
  } else if (prev.kind === 'patch') {
    merged = { ...prev, patch: { ...prev.patch, ...op.patch } };
  } else {
    return [...queue, fresh];
  }
  const next = queue.slice();
  next[idx] = merged;
  return next;
}

/** Lay queued-but-unsent changes over a snapshot so the UI shows them. */
export function applyOutbox(ws: Workspace, queue: OutboxOp[], teamId: string): Workspace {
  let out = ws;
  for (const op of queue) {
    if (op.teamId !== teamId) continue;
    const list = out[op.key] as { id: string }[];
    const at = list.findIndex((r) => r.id === op.id);
    let next: { id: string }[];
    if (op.kind === 'delete') {
      if (at === -1) continue;
      next = list.filter((r) => r.id !== op.id);
    } else if (op.kind === 'upsert') {
      const rec = op.record as { id: string };
      next = at === -1 ? [rec, ...list] : list.map((r, i) => (i === at ? { ...r, ...rec } : r));
    } else {
      if (at === -1) continue;
      next = list.map((r, i) => (i === at ? { ...r, ...op.patch } : r));
    }
    out = { ...out, [op.key]: next } as Workspace;
  }
  return out;
}

/* ── Persistence ────────────────────────────────────────────────────────── */

export function readOutbox(): OutboxOp[] {
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed) ? (parsed as OutboxOp[]) : [];
  } catch {
    return [];
  }
}

const listeners = new Set<() => void>();

function writeOutbox(queue: OutboxOp[]): void {
  try {
    if (queue.length) window.localStorage.setItem(KEY, JSON.stringify(queue));
    else window.localStorage.removeItem(KEY);
  } catch {
    /* quota: the op still goes out live if we're online */
  }
  listeners.forEach((fn) => fn());
}

export function subscribeOutbox(fn: () => void): () => void {
  listeners.add(fn);
  const onStorage = (e: StorageEvent): void => {
    if (e.key === KEY) fn();
  };
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(fn);
    window.removeEventListener('storage', onStorage);
  };
}

export function pendingCount(teamId?: string | null): number {
  const q = readOutbox();
  return teamId ? q.filter((o) => o.teamId === teamId).length : q.length;
}

export function enqueue(op: NewOp): void {
  const queue = readOutbox();
  const seq = queue.reduce((m, o) => Math.max(m, o.seq), 0) + 1;
  writeOutbox(coalesce(queue, op, seq));
}

/* ── Sending ────────────────────────────────────────────────────────────── */

export interface FlushResult {
  sent: number;
  remaining: number;
  /** True when we stopped because the network (or session) isn't there. */
  blocked: boolean;
  dropped: { op: OutboxOp; message: string }[];
}

function isRetryable(message: string): boolean {
  const m = message.toLowerCase();
  return isTransientError(message) || m.includes('jwt') || m.includes('token') || m.includes('not authenticated');
}

async function send(client: SupabaseClient, op: OutboxOp): Promise<void> {
  if (op.kind === 'upsert') return writeRow(client, op.key, op.userId, op.teamId, op.record);
  if (op.kind === 'patch') return patchRow(client, op.key, op.id, op.patch);
  return deleteRow(client, op.key, op.id);
}

let running: Promise<FlushResult> | null = null;

/**
 * Send the queue in order. Stops at the first network failure (everything
 * behind it waits for the next attempt); a change the server refuses
 * outright — permissions, a bad value — is dropped and reported so it can't
 * wedge the queue forever.
 */
export function flushOutbox(client: SupabaseClient, userId: string): Promise<FlushResult> {
  if (running) return running.then(() => flushOutbox(client, userId));
  running = (async () => {
    const result: FlushResult = { sent: 0, remaining: 0, blocked: false, dropped: [] };
    // Never send without a live session: an anonymous request would be
    // refused by row-level security and the change mistaken for a bad one.
    if (readOutbox().some((o) => o.userId === userId)) {
      const { data } = await client.auth.getSession().catch(() => ({ data: { session: null } }));
      if (!data.session || data.session.user.id !== userId) {
        result.blocked = true;
        result.remaining = readOutbox().filter((o) => o.userId === userId).length;
        return result;
      }
    }
    for (let guard = 0; guard < 5000; guard++) {
      if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        result.blocked = true;
        break;
      }
      const head = readOutbox().find((o) => o.userId === userId);
      if (!head) break;
      try {
        await send(client, head);
        writeOutbox(readOutbox().filter((o) => o.seq !== head.seq));
        result.sent++;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        const tries = (head.tries ?? 0) + 1;
        if (isRetryable(message) && tries < 50) {
          writeOutbox(readOutbox().map((o) => (o.seq === head.seq ? { ...o, tries } : o)));
          result.blocked = true;
          break;
        }
        writeOutbox(readOutbox().filter((o) => o.seq !== head.seq));
        result.dropped.push({ op: head, message });
      }
    }
    result.remaining = readOutbox().filter((o) => o.userId === userId).length;
    return result;
  })().finally(() => {
    running = null;
  });
  return running;
}
