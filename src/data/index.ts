import { LocalRepository } from './localRepository';
import type { Repository } from './repository';

let cached: Repository | null = null;

/**
 * Always local. Cloud storage is layered on top through `cloudSync.ts` so the
 * UI stays instant and keeps working with no network at all.
 */
export function getRepository(): Repository {
  if (!cached) cached = new LocalRepository();
  return cached;
}

export type { Repository } from './repository';
