import type { Workspace } from '@/lib/types';

export type RepositoryMode = 'local';

/**
 * The app is local-first: this is the only store the running session reads and
 * writes. Supabase sits alongside it as backup / restore / cross-device sync
 * (see `cloudSync.ts`), never in the critical path of a keystroke.
 */
export interface Repository {
  readonly mode: RepositoryMode;
  load(): Promise<Workspace>;
  save(workspace: Workspace): Promise<void>;
}
