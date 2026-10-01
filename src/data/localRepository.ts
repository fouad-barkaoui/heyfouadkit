import type { Workspace } from '@/lib/types';
import { normalizeWorkspace } from './normalize';
import type { Repository } from './repository';

const STORAGE_KEY = 'kanz.workspace.v1';

function safeGet(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* private mode / quota — the session still works, it just won't persist */
  }
}

/** True while this device's workspace is still empty and untouched. */
export function isPristineSeed(): boolean {
  return safeGet(STORAGE_KEY) === null || safeGet('kanz.touched.v1') === null;
}

export function markTouched(): void {
  safeSet('kanz.touched.v1', '1');
}

export class LocalRepository implements Repository {
  readonly mode = 'local' as const;

  /** Every new workspace starts as a blank slate — nothing is preinstalled. */
  async load(): Promise<Workspace> {
    const raw = safeGet(STORAGE_KEY);
    if (!raw) return normalizeWorkspace(null);
    try {
      return normalizeWorkspace(JSON.parse(raw));
    } catch {
      return normalizeWorkspace(null);
    }
  }

  async save(workspace: Workspace): Promise<void> {
    safeSet(STORAGE_KEY, JSON.stringify(workspace));
  }
}

export function resetLocalWorkspace(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
    window.localStorage.removeItem('kanz.touched.v1');
  } catch {
    /* ignore */
  }
}
