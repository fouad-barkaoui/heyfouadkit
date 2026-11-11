import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { ModuleId } from '@/lib/types';

interface UIContextValue {
  module: ModuleId;
  setModule: (next: ModuleId) => void;
  paletteOpen: boolean;
  setPaletteOpen: (open: boolean) => void;
  /** The list column inside ModuleLayout. */
  panelExpanded: boolean;
  togglePanel: () => void;
  /** The sign-in screen. Any component can open it, e.g. a creation guard. */
  accountOpen: boolean;
  setAccountOpen: (open: boolean) => void;
  /** Cross-module deep link: set by search, consumed by the target module. */
  focusRequest: { module: ModuleId; id: string } | null;
  requestFocus: (module: ModuleId, id: string) => void;
  clearFocus: () => void;
}

const UIContext = createContext<UIContextValue | null>(null);

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
  'salary',
  'articles',
  'courses',
  'docs',
  'analytics',
  'vault',
  'reporting',
  'trash',
  'settings',
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
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [panelExpanded, setPanelExpanded] = useState(true);
  const [accountOpen, setAccountOpen] = useState(false);
  const [focusRequest, setFocusRequest] = useState<{ module: ModuleId; id: string } | null>(null);

  const setModule = useCallback((next: ModuleId) => {
    setModuleState(next);
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
      setModule,
      paletteOpen,
      setPaletteOpen,
      panelExpanded,
      togglePanel: () => setPanelExpanded((v) => !v),
      accountOpen,
      setAccountOpen,
      focusRequest,
      requestFocus,
      clearFocus: () => setFocusRequest(null),
    }),
    [module, setModule, paletteOpen, panelExpanded, accountOpen, focusRequest, requestFocus],
  );

  return <UIContext.Provider value={value}>{children}</UIContext.Provider>;
}

export function useUI(): UIContextValue {
  const ctx = useContext(UIContext);
  if (!ctx) throw new Error('useUI must be used inside <UIProvider>');
  return ctx;
}
