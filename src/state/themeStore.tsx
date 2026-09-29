import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export type ThemePreference = 'light' | 'dark';

interface ThemeContextValue {
  /** What the person chose. */
  preference: ThemePreference;
  setPreference: (next: ThemePreference) => void;
  /** Flips between the two. */
  toggle: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const STORAGE_KEY = 'heyfouad.theme.v1';

function readStored(): ThemePreference {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw === 'light' || raw === 'dark' ? raw : 'dark';
  } catch {
    return 'dark';
  }
}

export function ThemeProvider({ children }: { children: ReactNode }): JSX.Element {
  const [preference, setPreferenceState] = useState<ThemePreference>(() =>
    typeof window === 'undefined' ? 'dark' : readStored(),
  );

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = preference;
    // Lets native form controls (scrollbars, checkboxes) pick the right chrome.
    // "only" forbids the browser's own auto-dark from repainting the page on
    // top of our theme (phones with "dark theme for sites" switched on).
    root.style.colorScheme = `only ${preference}`;
    document.querySelector('meta[name="color-scheme"]')?.setAttribute('content', `only ${preference}`);
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', preference === 'light' ? '#fbfbfa' : '#06070b');
  }, [preference]);

  const setPreference = useCallback((next: ThemePreference) => {
    setPreferenceState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* private mode — the choice just won't survive a reload */
    }
  }, []);

  const toggle = useCallback(() => {
    setPreferenceState((current) => {
      const next: ThemePreference = current === 'light' ? 'dark' : 'light';
      try {
        window.localStorage.setItem(STORAGE_KEY, next);
      } catch {
        /* private mode — the choice just won't survive a reload */
      }
      return next;
    });
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({ preference, setPreference, toggle }),
    [preference, setPreference, toggle],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside <ThemeProvider>');
  return ctx;
}
