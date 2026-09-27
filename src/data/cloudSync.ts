import type { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';
import type { CollectionKey, Workspace } from '@/lib/types';
import { normalizeWorkspace } from './normalize';

export const TABLES: Record<CollectionKey, string> = {
  badges: 'badges',
  notes: 'notes',
  todos: 'todos',
  articles: 'articles',
  courses: 'courses',
  docs: 'docs',
  attachments: 'attachments',
  news: 'news',
  medicines: 'medicines',
  treatmentPlans: 'treatment_plans',
};

/** Badges are written before the rows that reference them; treatment plans
 * before the medicines that can reference one. */
export const WRITE_ORDER: CollectionKey[] = [
  'badges',
  'notes',
  'todos',
  'articles',
  'courses',
  'docs',
  'attachments',
  'news',
  'treatmentPlans',
  'medicines',
];

const toSnake = (key: string): string => key.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
const toCamel = (key: string): string => key.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());

function rowToRecord(row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) {
    if (k === 'user_id' || k === 'team_id') continue;
    out[toCamel(k)] = v;
  }
  return out;
}

function recordToRow(record: Record<string, unknown>, userId: string, teamId: string): Record<string, unknown> {
  const out: Record<string, unknown> = { user_id: userId, team_id: teamId };
  for (const [k, v] of Object.entries(record)) out[toSnake(k)] = v;
  return out;
}

/** Every row belonging to a team, shaped exactly like anything read from disk. */
export async function fetchTeamWorkspace(client: SupabaseClient, teamId: string): Promise<Workspace> {
  const entries = await Promise.all(
    WRITE_ORDER.map(async (key) => {
      const { data, error } = await client.from(TABLES[key]).select('*').eq('team_id', teamId);
      if (error) throw new Error(`${TABLES[key]}: ${error.message}`);
      return [key, (data ?? []).map((row) => rowToRecord(row as Record<string, unknown>))] as const;
    }),
  );
  return normalizeWorkspace(Object.fromEntries(entries));
}

/** Insert or update one record, scoped to the active team. */
export async function writeRow(
  client: SupabaseClient,
  key: CollectionKey,
  userId: string,
  teamId: string,
  record: Record<string, unknown>,
): Promise<void> {
  const row = recordToRow(record, userId, teamId);
  const { error } = await client.from(TABLES[key]).upsert(row, { onConflict: 'id' });
  if (error) throw new Error(`${TABLES[key]}: ${error.message}`);
}

/** Patch one record without touching fields the caller did not send. */
export async function patchRow(
  client: SupabaseClient,
  key: CollectionKey,
  id: string,
  patch: Record<string, unknown>,
): Promise<void> {
  const row: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(patch)) row[toSnake(k)] = v;
  const { error } = await client.from(TABLES[key]).update(row).eq('id', id);
  if (error) throw new Error(`${TABLES[key]}: ${error.message}`);
}

export async function deleteRow(client: SupabaseClient, key: CollectionKey, id: string): Promise<void> {
  const { error } = await client.from(TABLES[key]).delete().eq('id', id);
  if (error) throw new Error(`${TABLES[key]}: ${error.message}`);
}

export type RowChange = {
  key: CollectionKey;
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  record: Record<string, unknown> | null;
  id: string | null;
};

/**
 * One realtime channel, every content table, filtered to a single team —
 * every member watching the same team sees each other's changes live.
 */
export function subscribeTeam(
  client: SupabaseClient,
  teamId: string,
  onChange: (change: RowChange) => void,
): RealtimeChannel {
  const channel = client.channel(`team:${teamId}`);
  for (const key of WRITE_ORDER) {
    channel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: TABLES[key], filter: `team_id=eq.${teamId}` },
      (payload) => {
        const eventType = payload.eventType as RowChange['eventType'];
        if (eventType === 'DELETE') {
          const old = payload.old as Record<string, unknown> | null;
          onChange({ key, eventType, record: null, id: (old?.id as string | undefined) ?? null });
          return;
        }
        const row = payload.new as Record<string, unknown>;
        onChange({ key, eventType, record: rowToRecord(row), id: row.id as string });
      },
    );
  }
  channel.subscribe();
  return channel;
}

export function countRecords(workspace: Workspace): number {
  return WRITE_ORDER.reduce((sum, key) => sum + (workspace[key] as unknown[]).length, 0);
}
