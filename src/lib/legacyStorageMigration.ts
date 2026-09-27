/**
 * One-time migration, run once at app boot before anything else touches
 * storage. Earlier builds of this app used a "nexus." prefix for every
 * local/session storage key (workspace cache, theme, language, active team,
 * auth session, onboarding flags…). The app is branded "heyfouad" now, so
 * every one of those keys has moved to a "heyfouad." prefix — this copies
 * any value still sitting under an old nexus.* key over to its new name,
 * once, so nothing already saved on this device quietly resets after the
 * rename (including an existing signed-in session). Old keys are left in
 * place untouched; this only ever adds a key, never removes one.
 */
function migrate(storage: Storage): void {
  const legacyKeys: string[] = [];
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i);
    if (key && key.startsWith('nexus.')) legacyKeys.push(key);
  }
  for (const oldKey of legacyKeys) {
    const newKey = `heyfouad.${oldKey.slice('nexus.'.length)}`;
    if (storage.getItem(newKey) !== null) continue;
    const value = storage.getItem(oldKey);
    if (value !== null) storage.setItem(newKey, value);
  }
}

try {
  migrate(window.localStorage);
} catch {
  /* private mode / storage unavailable — nothing to migrate */
}

try {
  migrate(window.sessionStorage);
} catch {
  /* private mode / storage unavailable — nothing to migrate */
}
