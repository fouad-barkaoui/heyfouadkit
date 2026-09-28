/**
 * Tiny async key/value store on IndexedDB — room for a whole workspace
 * snapshot without the 5 MB ceiling (or the main-thread stall) of
 * localStorage. Falls back to localStorage where IndexedDB is missing
 * (old browsers, private modes that block it, the test runner).
 */

const DB_NAME = 'heyfouad';
const STORE = 'kv';

let dbPromise: Promise<IDBDatabase | null> | null = null;

function openDb(): Promise<IDBDatabase | null> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve) => {
    try {
      if (typeof indexedDB === 'undefined') return resolve(null);
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE);
      req.onsuccess = () => resolve(req.result);
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
    const raw = window.localStorage.getItem(`heyfouad.kv.${key}`);
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
    window.localStorage.setItem(`heyfouad.kv.${key}`, JSON.stringify(value));
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
    window.localStorage.removeItem(`heyfouad.kv.${key}`);
  } catch {
    /* ignore */
  }
}
