import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { CircularLoader } from '@/components/motion/CircularLoader';
import { ViewTransition } from '@/components/motion/ViewTransition';
import { CookieConsentModal } from '@/components/onboarding/CookieConsentModal';
import { OnboardingFlow } from '@/components/onboarding/OnboardingFlow';
import { hasMedicationsAccess } from '@/lib/access';
import { useAuth } from '@/state/authStore';
import { useUI } from '@/state/uiStore';
import { useWorkspace } from '@/state/workspaceStore';
import { AccountPanel } from './AccountPanel';
import { AuthOverlay } from './AuthOverlay';
import { CommandPalette } from './CommandPalette';
import { IconRail } from './IconRail';
import { MobileMenu } from './MobileMenu';
import { useMediaQuery } from './navShared';
import { SettingsModal } from './SettingsModal';

/**
 * Every module — and the WebGL field — is code-split, so a session only ever
 * downloads the panes it actually opens.
 */
const SpatialField = lazy(async () => ({ default: (await import('@/three/SpatialField')).SpatialField }));
const HomeModule = lazy(async () => ({ default: (await import('@/modules/home/HomeModule')).HomeModule }));
const NotebookModule = lazy(async () => ({
  default: (await import('@/modules/notebook/NotebookModule')).NotebookModule,
}));
const TodoModule = lazy(async () => ({ default: (await import('@/modules/todo/TodoModule')).TodoModule }));
const CalendarModule = lazy(async () => ({
  default: (await import('@/modules/calendar/CalendarModule')).CalendarModule,
}));
const TeamModule = lazy(async () => ({ default: (await import('@/modules/team/TeamModule')).TeamModule }));
const ArticlesModule = lazy(async () => ({
  default: (await import('@/modules/articles/ArticlesModule')).ArticlesModule,
}));
const CoursesModule = lazy(async () => ({
  default: (await import('@/modules/courses/CoursesModule')).CoursesModule,
}));
const DocsModule = lazy(async () => ({ default: (await import('@/modules/docs/DocsModule')).DocsModule }));
const ReportingModule = lazy(async () => ({
  default: (await import('@/modules/reporting/ReportingModule')).ReportingModule,
}));
const AnalyticsModule = lazy(async () => ({
  default: (await import('@/modules/analytics/AnalyticsModule')).AnalyticsModule,
}));
const VaultModule = lazy(async () => ({ default: (await import('@/modules/vault/VaultModule')).VaultModule }));
const TrashPage = lazy(async () => ({ default: (await import('@/modules/trash/TrashPage')).TrashPage }));
const SaveItModule = lazy(async () => ({
  default: (await import('@/modules/saveit/SaveItModule')).SaveItModule,
}));
const NewsModule = lazy(async () => ({ default: (await import('@/modules/news/NewsModule')).NewsModule }));
const MedicationsModule = lazy(async () => ({
  default: (await import('@/modules/medications/MedicationsModule')).MedicationsModule,
}));
const MedicationsPaywall = lazy(async () => ({
  default: (await import('@/modules/medications/MedicationsPaywall')).MedicationsPaywall,
}));

function PaneFallback(): JSX.Element {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <CircularLoader />
    </div>
  );
}

export function AppShell(): JSX.Element {
  const {
    module,
    mobileNavOpen,
    paletteOpen,
    railExpanded,
    setRailExpanded,
    accountOpen,
    setAccountOpen,
    settingsOpen,
    setSettingsOpen,
    bgStyle,
  } = useUI();

  // Wide screens dock the labelled sidebar beside the content; laptops and
  // tablets keep the icon rail and float the sidebar over the content when
  // it's opened, so the panes never get squeezed.
  const docked = useMediaQuery('(min-width: 1180px)');
  const firstDock = useRef(true);
  useEffect(() => {
    if (firstDock.current) {
      firstDock.current = false;
      return;
    }
    setRailExpanded(docked);
  }, [docked, setRailExpanded]);
  const railOverlay = railExpanded && !docked;
  const { ready, error } = useWorkspace();
  const { user, configured } = useAuth();
  const needsAuth = configured && !user;
  const canOpenMedications = hasMedicationsAccess(user);

  // The WebGL field is the single heaviest chunk in the app (three.js) and
  // is purely decorative, so it shouldn't compete for bandwidth/CPU with
  // the workspace's first load. Mount it only once the workspace is ready
  // and the browser has a spare moment — that's most of what "the app
  // feels slow to load" was actually about.
  const [fieldReady, setFieldReady] = useState(false);
  useEffect(() => {
    if (!ready) return;
    const w = window as Window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    };
    if (w.requestIdleCallback) {
      const id = w.requestIdleCallback(() => setFieldReady(true), { timeout: 1500 });
      return () => w.cancelIdleCallback?.(id);
    }
    const t = window.setTimeout(() => setFieldReady(true), 250);
    return () => window.clearTimeout(t);
  }, [ready]);

  // Pointer-tracked light on cards: one delegated listener for the whole app,
  // throttled to a frame, so hundreds of cards cost nothing extra.
  useEffect(() => {
    if (window.matchMedia('(hover: none)').matches) return;
    let lit: HTMLElement | null = null;
    let raf = 0;
    let last: PointerEvent | null = null;
    const apply = (): void => {
      raf = 0;
      const e = last;
      if (!e) return;
      const card = (e.target instanceof Element ? e.target.closest<HTMLElement>('.surface-card') : null) ?? null;
      if (card !== lit) {
        lit?.removeAttribute('data-lit');
        lit = card;
        card?.setAttribute('data-lit', 'true');
      }
      if (card) {
        const r = card.getBoundingClientRect();
        card.style.setProperty('--sx', `${e.clientX - r.left}px`);
        card.style.setProperty('--sy', `${e.clientY - r.top}px`);
      }
    };
    const onMove = (e: PointerEvent): void => {
      last = e;
      if (!raf) raf = requestAnimationFrame(apply);
    };
    const onLeave = (): void => {
      lit?.removeAttribute('data-lit');
      lit = null;
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    document.documentElement.addEventListener('pointerleave', onLeave);
    return () => {
      window.removeEventListener('pointermove', onMove);
      document.documentElement.removeEventListener('pointerleave', onLeave);
      if (raf) cancelAnimationFrame(raf);
      onLeave();
    };
  }, []);

  const view = useMemo(() => {
    switch (module) {
      case 'todo':
        return <TodoModule />;
      case 'calendar':
        return <CalendarModule />;
      case 'team':
        return <TeamModule />;
      case 'news':
        return <NewsModule />;
      case 'saveit':
        return <SaveItModule />;
      case 'medications':
        return canOpenMedications ? <MedicationsModule /> : <MedicationsPaywall />;
      case 'articles':
        return <ArticlesModule />;
      case 'courses':
        return <CoursesModule />;
      case 'docs':
        return <DocsModule />;
      case 'reporting':
        return <ReportingModule />;
      case 'analytics':
        return <AnalyticsModule />;
      case 'vault':
        return <VaultModule />;
      case 'notebook':
        return <NotebookModule />;
      case 'trash':
        return <TrashPage />;
      case 'home':
      default:
        return <HomeModule />;
    }
  }, [module, canOpenMedications]);

  return (
    <div className="app-shell relative flex h-[100dvh] w-full overflow-hidden bg-void">
      {fieldReady ? (
        <Suspense fallback={null}>
          <SpatialField module={module} energized={mobileNavOpen || paletteOpen} style={bgStyle} />
        </Suspense>
      ) : null}

      {/* Rail slot: reserves the docked width; the rail itself floats in it. */}
      <div
        className="relative z-20 hidden h-full shrink-0 md:block"
        style={{ width: railExpanded && docked ? 240 : 64, transition: 'width 300ms var(--ease-snap)' }}
      >
        <div className="absolute inset-y-0 start-0 h-full">
          <IconRail overlay={railOverlay} />
        </div>
      </div>
      {railOverlay ? (
        <div
          className="rail-scrim fixed inset-0 z-[15] hidden md:block"
          aria-hidden
          onClick={() => setRailExpanded(false)}
        />
      ) : null}

      <main className="relative z-10 flex h-full min-w-0 flex-1 flex-col">
        {!ready ? (
          <div className="flex h-full items-center justify-center">
            <CircularLoader title="Loading your workspace" subtitle="This won't take long" />
          </div>
        ) : error ? (
          <div className="flex h-full items-center justify-center p-6">
            <div className="surface-card max-w-[420px] p-5">
              <h1 className="text-[15px] font-medium text-paper">The workspace could not be loaded</h1>
              <p className="mt-2 text-[13px] leading-[1.6] text-ash">{error}</p>
              <p className="mt-3 text-[12.5px] leading-[1.6] text-ash/80">
                With Supabase configured, check that the tables in <span className="mono">supabase/schema.sql</span>{' '}
                exist and that row-level security allows the signed-in user to read them.
              </p>
            </div>
          </div>
        ) : (
          <ErrorBoundary key={module}>
            <Suspense fallback={<PaneFallback />}>
              <ViewTransition id={module}>{view}</ViewTransition>
            </Suspense>
          </ErrorBoundary>
        )}
      </main>

      <MobileMenu />
      <CommandPalette />
      {needsAuth ? (
        <AuthOverlay open={accountOpen} onOpenChange={setAccountOpen} />
      ) : (
        <AccountPanel open={accountOpen} onOpenChange={setAccountOpen} />
      )}
      <SettingsModal open={settingsOpen} onOpenChange={setSettingsOpen} />
      <OnboardingFlow />
      <CookieConsentModal />
    </div>
  );
}
