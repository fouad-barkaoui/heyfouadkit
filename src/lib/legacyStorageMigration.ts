/**
 * One-time migration, run once at app boot before anything else touches
 * storage. Earlier builds of this app stored every local/session key (the
 * workspace cache, theme, language, active team, auth session, onboarding
 * flags…) under a "nexus." and later a "heyfouad." prefix. The app is called
 * Kanz now and every key lives under "kanz.", so this moves any value still
 * sitting under an old name to its new one — which keeps an existing
 * signed-in session and everything saved on this device exactly as it was.
 *
 * A key that already exists under its new name is never overwritten (the
 * newer build wins), and an old key is only removed once its value has been
 * read back from the new name.
 */
const PREFIX = 'kanz.';
// Newest first: when both an old "heyfouad.x" and an older "nexus.x" exist,
// the "heyfouad." one is the more recent and takes the new name.
const LEGACY_PREFIXES = ['heyfouad.', 'nexus.'] as const;

export function migrateStorage(storage: Storage): void {
  const legacyKeys: string[] = [];
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i);
    if (key && LEGACY_PREFIXES.some((p) => key.startsWith(p))) legacyKeys.push(key);
  }
  legacyKeys.sort((a, b) => Number(b.startsWith('heyfouad.')) - Number(a.startsWith('heyfouad.')));
  for (const oldKey of legacyKeys) {
    const prefix = LEGACY_PREFIXES.find((p) => oldKey.startsWith(p));
    if (!prefix) continue;
    const newKey = `${PREFIX}${oldKey.slice(prefix.length)}`;
    const value = storage.getItem(oldKey);
    if (value === null) continue;
    if (storage.getItem(newKey) === null) storage.setItem(newKey, value);
    if (storage.getItem(newKey) !== null) storage.removeItem(oldKey);
  }
}

for (const area of ['localStorage', 'sessionStorage'] as const) {
  try {
    migrateStorage(window[area]);
  } catch {
    /* private mode / storage unavailable — nothing to migrate */
  }
}
