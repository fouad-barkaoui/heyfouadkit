import { translate } from '@/state/languageStore';

/**
 * Supabase surfaces raw Postgres / PostgREST / Storage wording. These helpers
 * turn it into something a person can act on, and decide what is worth a
 * quiet retry (network blips) versus what needs to be reported.
 */

export function isTransientError(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes('failed to fetch') ||
    m.includes('network') ||
    m.includes('load failed') ||
    m.includes('timed out') ||
    m.includes('timeout') ||
    m.includes('fetch failed') ||
    m.includes('503') ||
    m.includes('502') ||
    m.includes('504') ||
    m.includes('connection')
  );
}

export function friendlyCloudError(raw: unknown): string {
  const message = raw instanceof Error ? raw.message : typeof raw === 'string' ? raw : translate('core.somethingWrong');
  const m = message.toLowerCase();
  if (isTransientError(message)) return translate('core.cloud.offline');
  if (m.includes('infinite recursion') || m.includes('schema is invalid'))
    return translate('core.cloud.serverConfig');
  if (m.includes('could not find the table') || m.includes('does not exist'))
    return translate('core.cloud.missingTable');
  if (m.includes('row-level security') || m.includes('permission denied') || m.includes('not authorized'))
    return translate('core.cloud.noPermission');
  if (m.includes('jwt') || m.includes('token') || m.includes('not authenticated'))
    return translate('core.cloud.sessionExpired');
  if (m.includes('payload too large') || m.includes('exceeded the maximum allowed size') || m.includes('413'))
    return translate('core.cloud.tooLarge');
  if (m.includes('mime type') || m.includes('invalid_mime'))
    return translate('core.cloud.badType');
  return message;
}

/** Run `fn`; if it fails with a transient error, wait briefly and try once more. */
export async function retryTransient<T>(fn: () => Promise<T>, delayMs = 700): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (!isTransientError(msg)) throw err;
    await new Promise((r) => setTimeout(r, delayMs));
    return fn();
  }
}
