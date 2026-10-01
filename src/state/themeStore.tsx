import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { flushSync } from 'react-dom';

/** What the person picked. "system" follows the device's light/dark setting. */
export type ThemePreference = 'light' | 'dark' | 'system';
/** What is actually painted. */
export type ResolvedTheme = 'light' | 'dark';

/** Where the switch was pressed — the new theme spreads out from here. */
export interface ThemeOrigin {
  x: number;
  y: number;
}

interface ThemeContextValue {
  /** What the person chose. */
  preference: ThemePreference;
  /** The theme on screen right now (system resolved against the device). */
  resolved: ResolvedTheme;
  setPreference: (next: ThemePreference, origin?: ThemeOrigin) => void;
  /** Flips between light and dark (an explicit choice, overriding the device). */
  toggle: (origin?: ThemeOrigin) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const STORAGE_KEY = 'kanz.theme.v1';

const isPreference = (v: unknown): v is ThemePreference => v === 'light' || v === 'dark' || v === 'system';

function readStored(): ThemePreference {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return isPreference(raw) ? raw : 'dark';
  } catch {
    return 'dark';
  }
}

const DARK_QUERY = '(prefers-color-scheme: dark)';
function deviceTheme(): ResolvedTheme {
  return typeof window !== 'undefined' && window.matchMedia?.(DARK_QUERY).matches === false ? 'light' : 'dark';
}
export function resolveTheme(preference: ThemePreference, device: ResolvedTheme = deviceTheme()): ResolvedTheme {
  return preference === 'system' ? device : preference;
}

/**
 * Paints a theme onto the whole document — every page, panel and portal
 * reads its colours from these root attributes, so this is the one switch
 * for the entire platform.
 */
function applyTheme(preference: ResolvedTheme): void {
  const root = document.documentElement;
  root.dataset.theme = preference;
  root.classList.toggle('dark', preference === 'dark');
  // Lets native form controls (scrollbars, checkboxes) pick the right chrome.
  // "only" forbids the browser's own auto-dark from repainting the page on
  // top of our theme (phones with "dark theme for sites" switched on).
  root.style.colorScheme = `only ${preference}`;
  document.querySelector('meta[name="color-scheme"]')?.setAttribute('content', `only ${preference}`);
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', preference === 'light' ? '#fbfbfa' : '#06070b');
}

function store(preference: ThemePreference): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, preference);
  } catch {
    /* private mode — the choice just won't survive a reload */
  }
}

interface ViewTransitionLike {
  ready: Promise<void>;
  skipTransition: () => void;
}
type ViewTransitionDoc = Document & {
  startViewTransition?: (cb: () => void) => ViewTransitionLike;
};

export function ThemeProvider({ children }: { children: ReactNode }): JSX.Element {
  const [preference, setPreferenceState] = useState<ThemePreference>(() =>
    typeof window === 'undefined' ? 'dark' : readStored(),
  );
  const [device, setDevice] = useState<ResolvedTheme>(() => (typeof window === 'undefined' ? 'dark' : deviceTheme()));
  const resolved = resolveTheme(preference, device);
  // What the theme is (or is about to be) — updated on click, before the
  // reveal animation has painted, so quick double-taps stay in step.
  const current = useRef(preference);
  const running = useRef<ViewTransitionLike | null>(null);

  useEffect(() => {
    current.current = preference;
    applyTheme(resolved);
  }, [preference, resolved]);

  // The device flipped light/dark — only matters while following the system.
  useEffect(() => {
    const mq = window.matchMedia?.(DARK_QUERY);
    if (!mq) return;
    const onChange = (): void => setDevice(mq.matches ? 'dark' : 'light');
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  // Another tab (or the installed app) switched theme — follow it.
  useEffect(() => {
    const onStorage = (e: StorageEvent): void => {
      if (e.key !== STORAGE_KEY) return;
      if (isPreference(e.newValue)) setPreferenceState(e.newValue);
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const setPreference = useCallback((next: ThemePreference, origin?: ThemeOrigin) => {
    if (next === current.current) return;
    const before = resolveTheme(current.current);
    current.current = next;
    store(next);
    const commit = (): void => {
      flushSync(() => setPreferenceState(next));
      applyTheme(resolveTheme(next));
    };
    // Same colours either way (e.g. dark → system on a dark device): no reveal.
    if (resolveTheme(next) === before) {
      commit();
      return;
    }
    // A second tap while the reveal is still starting: jump straight there.
    if (running.current) {
      running.current.skipTransition();
      running.current = null;
      commit();
      return;
    }

    const doc = document as ViewTransitionDoc;
    const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!doc.startViewTransition || calm) {
      commit();
      return;
    }
    // The new theme washes over the entire app in a circle that grows from
    // the button that was pressed, so it's obvious everything changed.
    const x = origin?.x ?? window.innerWidth - 40;
    const y = origin?.y ?? 40;
    const r = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
    const root = document.documentElement;
    root.classList.add('theme-switching');
    try {
      const vt = doc.startViewTransition(commit);
      running.current = vt;
      vt.ready
        .then(() => {
          const anim = root.animate(
            { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${r}px at ${x}px ${y}px)`] },
            { duration: 620, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', pseudoElement: '::view-transition-new(root)' },
          );
          anim.finished.finally(() => {
            root.classList.remove('theme-switching');
            if (running.current === vt) running.current = null;
          });
        })
        .catch(() => {
          root.classList.remove('theme-switching');
          if (running.current === vt) running.current = null;
        });
    } catch {
      root.classList.remove('theme-switching');
      commit();
    }
  }, []);

  const toggle = useCallback(
    (origin?: ThemeOrigin) => setPreference(resolveTheme(current.current) === 'light' ? 'dark' : 'light', origin),
    [setPreference],
  );

  const value = useMemo<ThemeContextValue>(
    () => ({ preference, resolved, setPreference, toggle }),
    [preference, resolved, setPreference, toggle],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside <ThemeProvider>');
  return ctx;
}

/** Centre of the element that was clicked — handy origin for the reveal. */
export function originOf(el: Element | null): ThemeOrigin | undefined {
  if (!el) return undefined;
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}
