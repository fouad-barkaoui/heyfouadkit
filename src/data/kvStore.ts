/**
 * Tiny async key/value store on IndexedDB — room for a whole workspace
 * snapshot without the 5 MB ceiling (or the main-thread stall) of
 * localStorage. Falls back to localStorage where IndexedDB is missing
 * (old browsers, private modes that block it, the test runner).
 */

const DB_NAME = 'kanz';
const LEGACY_DB_NAME = 'heyfouad';
const STORE = 'kv';

let dbPromise: Promise<IDBDatabase | null> | null = null;

/**
 * Pulls everything out of the pre-rename "heyfouad" database into this one,
 * once, then deletes it. Never creates the old database when it is absent.
 */
function copyFromLegacyDb(target: IDBDatabase): Promise<void> {
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open(LEGACY_DB_NAME);
      let missing = false;
      req.onupgradeneeded = () => {
        // The database did not exist — opening just started creating it.
        missing = true;
        req.transaction?.abort();
      };
      req.onerror = () => resolve();
      req.onblocked = () => resolve();
      req.onsuccess = () => {
        const old = req.result;
        if (missing || !old.objectStoreNames.contains(STORE)) {
          old.close();
          resolve();
          return;
        }
        const read = old.transaction(STORE, 'readonly').objectStore(STORE);
        const keysReq = read.getAllKeys();
        const valuesReq = read.getAll();
        valuesReq.onerror = () => {
          old.close();
          resolve();
        };
        valuesReq.onsuccess = () => {
          const keys = keysReq.result;
          const values = valuesReq.result;
          old.close();
          if (!keys.length) {
            indexedDB.deleteDatabase(LEGACY_DB_NAME);
            resolve();
            return;
          }
          const write = target.transaction(STORE, 'readwrite');
          const store = write.objectStore(STORE);
          keys.forEach((k, i) => {
            // A value already saved under the new name is newer — keep it.
            const exists = store.count(k);
            exists.onsuccess = () => {
              if (exists.result === 0) store.put(values[i], k);
            };
          });
          write.oncomplete = () => {
            indexedDB.deleteDatabase(LEGACY_DB_NAME);
            resolve();
          };
          write.onerror = () => resolve();
          write.onabort = () => resolve();
        };
      };
    } catch {
      resolve();
    }
  });
}

function openDb(): Promise<IDBDatabase | null> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve) => {
    try {
      if (typeof indexedDB === 'undefined') return resolve(null);
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE);
      req.onsuccess = () => {
        const db = req.result;
        void copyFromLegacyDb(db).then(() => resolve(db));
      };
      req.onerror = () => resolve(null);
      req.onblocked = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
  return dbPromise;
}

function tx<T>(db: IDBDatabase, mode: IDBTransactionMode, run: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const req = run(t.objectStore(STORE));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('IndexedDB request failed'));
  });
}

export async function kvGet<T>(key: string): Promise<T | undefined> {
  const db = await openDb();
  if (db) {
    try {
      return (await tx(db, 'readonly', (s) => s.get(key))) as T | undefined;
    } catch {
      return undefined;
    }
  }
  try {
    const raw = window.localStorage.getItem(`kanz.kv.${key}`);
    return raw ? (JSON.parse(raw) as T) : undefined;
  } catch {
    return undefined;
  }
}

export async function kvSet(key: string, value: unknown): Promise<void> {
  const db = await openDb();
  if (db) {
    try {
      await tx(db, 'readwrite', (s) => s.put(value, key));
      return;
    } catch {
      /* fall through to localStorage */
    }
  }
  try {
    window.localStorage.setItem(`kanz.kv.${key}`, JSON.stringify(value));
  } catch {
    /* quota — the cache is an optimisation, never a requirement */
  }
}

export async function kvDel(key: string): Promise<void> {
  const db = await openDb();
  if (db) {
    try {
      await tx(db, 'readwrite', (s) => s.delete(key));
    } catch {
      /* ignore */
    }
  }
  try {
    window.localStorage.removeItem(`kanz.kv.${key}`);
  } catch {
    /* ignore */
  }
}
