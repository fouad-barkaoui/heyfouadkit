import './lib/legacyStorageMigration';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles/index.css';
import './styles/premium.css';
import './styles/saveit.css';
import './styles/whatsnew.css';
import './styles/theme.css';

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

const root = document.getElementById('root');
if (!root) throw new Error('Root element #root is missing from index.html');

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
