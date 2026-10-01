import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { ModuleId } from '@/lib/types';

interface UIContextValue {
  module: ModuleId;
  previousModule: ModuleId | null;
  setModule: (next: ModuleId) => void;
  paletteOpen: boolean;
  setPaletteOpen: (open: boolean) => void;
  railExpanded: boolean;
  toggleRail: () => void;
  setRailExpanded: (expanded: boolean) => void;
  /** The context panel inside ModuleLayout (the list column between the
   * icon rail and the content pane) — collapsible the same way the rail is. */
  panelExpanded: boolean;
  togglePanel: () => void;
  mobileNavOpen: boolean;
  setMobileNavOpen: (open: boolean) => void;
  /** One account panel for the whole app, so any component — including a
   * creation guard deep in a module — can open it, not just the sidebar. */
  accountOpen: boolean;
  setAccountOpen: (open: boolean) => void;
  /** Theme / language / storage / contact panel, opened from the rail's gear icon. */
  settingsOpen: boolean;
  bgStyle: BgStyle;
  setBgStyle: (style: BgStyle) => void;
  setSettingsOpen: (open: boolean) => void;
  /** Cross-module deep link: set by search, consumed by the target module. */
  focusRequest: { module: ModuleId; id: string } | null;
  requestFocus: (module: ModuleId, id: string) => void;
  clearFocus: () => void;
}

const UIContext = createContext<UIContextValue | null>(null);

/** Full-screen background styles for the WebGL field. */
export type BgStyle = 'waves' | 'starfield' | 'flow' | 'orbit';
export const BG_STYLES: BgStyle[] = ['waves', 'starfield', 'flow', 'orbit'];
const BG_KEY = 'kanz.bgStyle.v1';
function readBgStyle(): BgStyle {
  try {
    const raw = window.localStorage.getItem(BG_KEY);
    return (BG_STYLES as string[]).includes(raw ?? '') ? (raw as BgStyle) : 'waves';
  } catch {
    return 'waves';
  }
}

const VALID: ModuleId[] = [
  'home',
  'notebook',
  'todo',
  'calendar',
  'habits',
  'team',
  'news',
  'saveit',
  'medications',
  'articles',
  'courses',
  'docs',
  'analytics',
  'vault',
  'reporting',
  'trash',
  'portfolio',
  'contact',
  'inbox',
];

function moduleFromHash(): ModuleId {
  const raw = window.location.hash.replace('#/', '').replace('#', '');
  return (VALID as string[]).includes(raw) ? (raw as ModuleId) : 'home';
}

export function UIProvider({ children }: { children: ReactNode }): JSX.Element {
  const [module, setModuleState] = useState<ModuleId>(() =>
    typeof window === 'undefined' ? 'home' : moduleFromHash(),
  );
  const [previousModule, setPreviousModule] = useState<ModuleId | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  // Labelled rail on a roomy screen; icon rail on a laptop or tablet, where the
  // three panes would otherwise leave the content pane too narrow to work in.
  const [railExpanded, setRailExpanded] = useState(
    () => typeof window === 'undefined' || window.innerWidth >= 1180,
  );
  const [panelExpanded, setPanelExpanded] = useState(true);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [bgStyle, setBgStyleState] = useState<BgStyle>(() => (typeof window === 'undefined' ? 'waves' : readBgStyle()));
  const setBgStyle = useCallback((next: BgStyle) => {
    setBgStyleState(next);
    try {
      window.localStorage.setItem(BG_KEY, next);
    } catch {
      /* ignore */
    }
  }, []);
  const [focusRequest, setFocusRequest] = useState<{ module: ModuleId; id: string } | null>(null);

  const setModule = useCallback((next: ModuleId) => {
    setModuleState((current) => {
      if (current === next) return current;
      setPreviousModule(current);
      return next;
    });
    setMobileNavOpen(false);
    if (typeof window !== 'undefined') window.location.hash = `/${next}`;
  }, []);

  useEffect(() => {
    const onHash = (): void => setModuleState(moduleFromHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setPaletteOpen((open) => !open);
        return;
      }
      // "[" toggles the sidebar, Linear-style — but never while typing.
      if (event.key === '[' && !event.metaKey && !event.ctrlKey && !event.altKey) {
        const el = event.target as HTMLElement | null;
        const typing =
          !!el && (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName));
        if (!typing && window.innerWidth >= 768) {
          event.preventDefault();
          setRailExpanded((v) => !v);
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const requestFocus = useCallback(
    (target: ModuleId, id: string) => {
      setFocusRequest({ module: target, id });
      setModule(target);
      setPaletteOpen(false);
    },
    [setModule],
  );

  const value = useMemo<UIContextValue>(
    () => ({
      module,
      previousModule,
      setModule,
      paletteOpen,
      setPaletteOpen,
      railExpanded,
      toggleRail: () => setRailExpanded((v) => !v),
      setRailExpanded,
      panelExpanded,
      togglePanel: () => setPanelExpanded((v) => !v),
      mobileNavOpen,
      setMobileNavOpen,
      accountOpen,
      setAccountOpen,
      settingsOpen,
      setSettingsOpen,
      bgStyle,
      setBgStyle,
      focusRequest,
      requestFocus,
      clearFocus: () => setFocusRequest(null),
    }),
    [
      module,
      previousModule,
      setModule,
      paletteOpen,
      railExpanded,
      panelExpanded,
      mobileNavOpen,
      accountOpen,
      settingsOpen,
      bgStyle,
      setBgStyle,
      focusRequest,
      requestFocus,
    ],
  );

  return <UIContext.Provider value={value}>{children}</UIContext.Provider>;
}

export function useUI(): UIContextValue {
  const ctx = useContext(UIContext);
  if (!ctx) throw new Error('useUI must be used inside <UIProvider>');
  return ctx;
}
