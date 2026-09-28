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
  const message = raw instanceof Error ? raw.message : typeof raw === 'string' ? raw : 'Something went wrong';
  const m = message.toLowerCase();
  if (isTransientError(message)) return 'No connection to the cloud right now — your changes stay saved on this device.';
  if (m.includes('infinite recursion') || m.includes('schema is invalid'))
    return 'The cloud rejected the request because of a server configuration problem. Please try again in a minute.';
  if (m.includes('could not find the table') || m.includes('does not exist'))
    return 'Part of the cloud database is missing. Your data is safe on this device.';
  if (m.includes('row-level security') || m.includes('permission denied') || m.includes('not authorized'))
    return "You don't have permission to change this in the current team.";
  if (m.includes('jwt') || m.includes('token') || m.includes('not authenticated'))
    return 'Your session expired — sign in again to keep syncing.';
  if (m.includes('payload too large') || m.includes('exceeded the maximum allowed size') || m.includes('413'))
    return 'That file is too large to upload.';
  if (m.includes('mime type') || m.includes('invalid_mime'))
    return 'That file type is not allowed here.';
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
