import './lib/legacyStorageMigration';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles/index.css';
import './styles/premium.css';
import './styles/saveit.css';
import './styles/whatsnew.css';
import './styles/theme.css';
import './styles/nav.css';
import './styles/habits.css';
import './styles/notifications.css';
import './styles/contact.css';

/** Warm the connection to the cloud project as early as possible — a
 * preconnect here shaves the DNS + TLS handshake off whichever request
 * (auth check, first workspace fetch) hits Supabase first. */
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
if (supabaseUrl) {
  try {
    const link = document.createElement('link');
    link.rel = 'preconnect';
    link.href = new URL(supabaseUrl).origin;
    link.crossOrigin = 'anonymous';
    document.head.appendChild(link);
  } catch {
    /* malformed URL — skip the hint, the app still works without it */
  }
}

/* Links arriving from the phone's share sheet (PWA share_target) or the
 * "Save to SaveIt" bookmarklet land as ?url= / ?text=. Stash them, clean the
 * address bar, and open SaveIt — the module saves them on mount. */
try {
  const params = new URLSearchParams(window.location.search);
  const shared = [params.get('url'), params.get('text'), params.get('title')].filter(Boolean).join(' ');
  if (shared && /https?:\/\/|\w\.\w/.test(shared)) {
    sessionStorage.setItem('heyfouad.saveit.incoming', shared.slice(0, 8000));
    window.history.replaceState(null, '', `${window.location.pathname}#/saveit`);
  }
} catch {
  /* private mode — sharing just won't prefill */
}

// Track the *visible* viewport (what's left after mobile browser bars and
// the on-screen keyboard) so dialogs can size themselves to it.
try {
  const vv = window.visualViewport;
  if (vv) {
    const rootStyle = document.documentElement.style;
    let frame = 0;
    const sync = (): void => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        rootStyle.setProperty('--vvh', `${Math.round(vv.height)}px`);
        rootStyle.setProperty('--vv-top', `${Math.round(vv.offsetTop)}px`);
      });
    };
    sync();
    vv.addEventListener('resize', sync);
    vv.addEventListener('scroll', sync);
  }
} catch {
  /* older browsers fall back to dvh/vh */
}

const root = document.getElementById('root');
if (!root) throw new Error('Root element #root is missing from index.html');

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Offline: cache the app so it opens with no connection. Registered after
// load so it never competes with the first paint.
if (import.meta.env.PROD && 'serviceWorker' in navigator && window.isSecureContext) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => undefined);
    // A tapped reminder alert asks the open tab to jump to its page.
    navigator.serviceWorker.addEventListener('message', (event: MessageEvent<{ type?: string; url?: string }>) => {
      const url = event.data?.url;
      if (event.data?.type === 'heyfouad:navigate' && url?.startsWith('/#/')) window.location.hash = url.slice(2);
    });
  });
}
