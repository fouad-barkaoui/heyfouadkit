import { useCallback, useSyncExternalStore } from 'react';

/**
 * Full-screen mode for the whole app, across browsers.
 *
 * - Chrome, Edge, Firefox, Android and desktop Safari: the Fullscreen API
 *   (webkit-prefixed on older Safari / iPadOS).
 * - iPhone Safari has no Fullscreen API for web pages; the only way to get
 *   the browser bars out of the way is to add the app to the Home Screen,
 *   where it opens standalone (see manifest.webmanifest). We report that as
 *   `'install'` so the button can explain it instead of doing nothing.
 * - Already running as an installed app: `'standalone'` — nothing to do.
 */

type FsDoc = Document & {
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void> | void;
  webkitFullscreenEnabled?: boolean;
};
type FsEl = HTMLElement & { webkitRequestFullscreen?: () => Promise<void> | void };

export type FullscreenSupport = 'api' | 'install' | 'standalone';

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  const nav = navigator as Navigator & { standalone?: boolean };
  return (
    nav.standalone === true ||
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches
  );
}

export function fullscreenSupport(): FullscreenSupport {
  if (typeof document === 'undefined') return 'api';
  const d = document as FsDoc;
  const el = document.documentElement as FsEl;
  const api =
    (d.fullscreenEnabled !== false && typeof el.requestFullscreen === 'function') ||
    (d.webkitFullscreenEnabled !== false && typeof el.webkitRequestFullscreen === 'function');
  if (api) return 'api';
  return isStandalone() ? 'standalone' : 'install';
}

function activeElement(): Element | null {
  const d = document as FsDoc;
  return d.fullscreenElement ?? d.webkitFullscreenElement ?? null;
}

function subscribe(cb: () => void): () => void {
  document.addEventListener('fullscreenchange', cb);
  document.addEventListener('webkitfullscreenchange', cb);
  return () => {
    document.removeEventListener('fullscreenchange', cb);
    document.removeEventListener('webkitfullscreenchange', cb);
  };
}

export async function enterFullscreen(): Promise<boolean> {
  const el = document.documentElement as FsEl;
  try {
    if (el.requestFullscreen) await el.requestFullscreen({ navigationUI: 'hide' });
    else if (el.webkitRequestFullscreen) await el.webkitRequestFullscreen();
    else return false;
    return true;
  } catch {
    return false;
  }
}

export async function exitFullscreen(): Promise<void> {
  const d = document as FsDoc;
  try {
    if (d.exitFullscreen) await d.exitFullscreen();
    else if (d.webkitExitFullscreen) await d.webkitExitFullscreen();
  } catch {
    /* already out */
  }
}

export function useFullscreen(): {
  active: boolean;
  support: FullscreenSupport;
  toggle: () => Promise<boolean>;
} {
  const active = useSyncExternalStore(
    subscribe,
    () => activeElement() !== null,
    () => false,
  );
  const support = fullscreenSupport();
  const toggle = useCallback(async (): Promise<boolean> => {
    if (activeElement()) {
      await exitFullscreen();
      return true;
    }
    return enterFullscreen();
  }, []);
  return { active, support, toggle };
}
