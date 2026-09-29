/* heyfouadkit service worker — generated at build time (see vite.config.ts).
 *
 * - App shell + every hashed bundle are cached on install, so the app opens
 *   with no network at all.
 * - Page loads are network-first (a new deploy shows up immediately) and fall
 *   back to the cached shell when offline.
 * - Hashed /assets/* are immutable: served from cache, fetched once.
 * - Google Fonts are cached after first use.
 * - Supabase and /api/* are never touched here — data goes through the app's
 *   own offline queue instead.
 */
const VERSION = '__VERSION__';
const PRECACHE = __PRECACHE__;
const SHELL = `hf-shell-${VERSION}`;
const RUNTIME = 'hf-runtime-v1';

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL);
      // Best effort per file — one 404 must not abort the whole install.
      await Promise.all(
        PRECACHE.map((url) =>
          cache.add(new Request(url, { cache: 'reload' })).catch(() => undefined),
        ),
      );
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Keep this version and the one before it: a tab still running the old
      // build can lazy-load its chunks until it reloads.
      const keys = (await caches.keys()).filter((k) => k.startsWith('hf-shell-'));
      const stale = keys.filter((k) => k !== SHELL).slice(0, -1);
      await Promise.all(stale.map((k) => caches.delete(k)));
      if (self.registration.navigationPreload) await self.registration.navigationPreload.enable().catch(() => {});
      await self.clients.claim();
    })(),
  );
});

async function fromCache(request) {
  return caches.match(request, { ignoreVary: true });
}

async function networkFirstPage(event) {
  try {
    const preloaded = await event.preloadResponse;
    if (preloaded) return preloaded;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(event.request, { signal: controller.signal });
    clearTimeout(timer);
    if (res.ok) {
      const cache = await caches.open(SHELL);
      cache.put('/index.html', res.clone()).catch(() => {});
    }
    return res;
  } catch {
    return (await fromCache('/index.html')) || (await fromCache('/')) || Response.error();
  }
}

async function cacheFirst(request, cacheName) {
  const hit = await fromCache(request);
  if (hit) return hit;
  const res = await fetch(request);
  if (res.ok || res.type === 'opaque') {
    const cache = await caches.open(cacheName);
    cache.put(request, res.clone()).catch(() => {});
  }
  return res;
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(RUNTIME);
  const hit = await caches.match(request, { ignoreVary: true });
  const network = fetch(request)
    .then((res) => {
      if (res.ok || res.type === 'opaque') cache.put(request, res.clone()).catch(() => {});
      return res;
    })
    .catch(() => hit || offlineFallback(request));
  return hit || network;
}

// Offline with nothing cached: an empty stylesheet (the system font stack
// takes over) or an empty 504, rather than a hard network error.
function offlineFallback(request) {
  const url = new URL(request.url);
  if (url.hostname === 'fonts.googleapis.com') {
    return new Response('', { status: 200, headers: { 'Content-Type': 'text/css' } });
  }
  return new Response('', { status: 504, statusText: 'Offline' });
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  if (url.origin === self.location.origin) {
    if (url.pathname.startsWith('/api/')) return;
    if (request.mode === 'navigate') {
      event.respondWith(networkFirstPage(event));
      return;
    }
    if (url.pathname.startsWith('/assets/')) {
      event.respondWith(cacheFirst(request, SHELL));
      return;
    }
    if (PRECACHE.includes(url.pathname)) {
      event.respondWith(staleWhileRevalidate(request));
    }
    return;
  }

  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(staleWhileRevalidate(request));
  }
});

self.addEventListener('message', (event) => {
  if (event.data === 'skip-waiting') self.skipWaiting();
});

// Reminder alerts from the notification bell: tapping one brings the app to
// the front (or opens it) on the page the reminder is about.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil(
    (async () => {
      const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      const client = all.find((c) => new URL(c.url).origin === self.location.origin);
      if (client) {
        await client.focus();
        client.postMessage({ type: 'heyfouad:navigate', url: target });
        return;
      }
      await self.clients.openWindow(target);
    })(),
  );
});
