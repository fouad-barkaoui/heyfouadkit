import './lib/legacyStorageMigration';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles/index.css';
import './styles/premium.css';

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

const root = document.getElementById('root');
if (!root) throw new Error('Root element #root is missing from index.html');

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
