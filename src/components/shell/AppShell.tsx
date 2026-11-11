import { lazy, Suspense, useEffect, useMemo } from 'react';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { CircularLoader } from '@/components/motion/CircularLoader';
import { ViewTransition } from '@/components/motion/ViewTransition';
import { CookieConsentModal } from '@/components/onboarding/CookieConsentModal';
import { OnboardingFlow } from '@/components/onboarding/OnboardingFlow';
import { rich, useI18n } from '@/components/ui/useI18n';
import { hasMedicationsAccess, isAdminUser } from '@/lib/access';
import { useAuth } from '@/state/authStore';
import { prefetchLikelyModules } from '@/modules/prefetch';
import { useUI } from '@/state/uiStore';
import { useWorkspace } from '@/state/workspaceStore';
import { AuthOverlay } from './AuthOverlay';
import { CommandPalette } from './CommandPalette';
import { OfflinePill } from './OfflinePill';
import { TopBar } from './TopBar';

/** Every module is code-split, so a session only downloads the panes it opens. */
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
const InboxModule = lazy(async () => ({
  default: (await import('@/modules/inbox/InboxModule')).InboxModule,
}));
const SettingsModule = lazy(async () => ({
  default: (await import('@/modules/settings/SettingsModule')).SettingsModule,
}));
const ContactModule = lazy(async () => ({
  default: (await import('@/modules/contact/ContactModule')).ContactModule,
}));
const TrashPage = lazy(async () => ({ default: (await import('@/modules/trash/TrashPage')).TrashPage }));
const SaveItModule = lazy(async () => ({
  default: (await import('@/modules/saveit/SaveItModule')).SaveItModule,
}));
const HabitsModule = lazy(async () => ({
  default: (await import('@/modules/habits/HabitsModule')).HabitsModule,
}));
const NewsModule = lazy(async () => ({ default: (await import('@/modules/news/NewsModule')).NewsModule }));
const MedicationsModule = lazy(async () => ({
  default: (await import('@/modules/medications/MedicationsModule')).MedicationsModule,
}));
const SalaryModule = lazy(async () => ({
  default: (await import('@/modules/salary/SalaryModule')).SalaryModule,
}));
const SalaryPreview = lazy(async () => ({
  default: (await import('@/modules/salary/SalaryPreview')).SalaryPreview,
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
  const { module, accountOpen, setAccountOpen } = useUI();
  const { t } = useI18n();
  const { ready, error } = useWorkspace();
  const { user, configured } = useAuth();
  const canOpenMedications = hasMedicationsAccess(user);
  const isAdmin = isAdminUser(user);

  // Once the workspace is on screen, warm the most-used modules in the background.
  useEffect(() => {
    if (ready) prefetchLikelyModules(['saveit', 'todo', 'habits', 'notebook', 'calendar']);
  }, [ready]);

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
      case 'habits':
        return <HabitsModule />;
      case 'medications':
        return canOpenMedications ? <MedicationsModule /> : <MedicationsPaywall />;
      case 'salary':
        // In beta: the admin tests the real planner, everyone else sees a preview of it.
        return isAdmin ? <SalaryModule /> : <SalaryPreview />;
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
      case 'settings':
        return <SettingsModule />;
      case 'contact':
        return <ContactModule />;
      case 'inbox':
        return <InboxModule />;
      case 'home':
      default:
        return <HomeModule />;
    }
  }, [module, canOpenMedications, isAdmin]);

  return (
    <div className="app-shell flex h-[100dvh] w-full flex-col overflow-hidden bg-void">
      <TopBar />

      <main className="relative flex min-h-0 min-w-0 flex-1 flex-col">
        {!ready ? (
          <div className="flex h-full items-center justify-center">
            <CircularLoader title={t('sh.app.loading')} subtitle={t('sh.app.loadingHint')} />
          </div>
        ) : error ? (
          <div className="flex h-full items-center justify-center p-6">
            <div className="surface-card max-w-[420px] p-5">
              <h1 className="text-[15px] font-medium text-paper">{t('sh.app.loadFailed')}</h1>
              <p className="mt-2 text-[13px] leading-[1.6] text-ash">{error}</p>
              <p className="mt-3 text-[12.5px] leading-[1.6] text-ash/80">
                {rich(t('sh.app.loadFailedHint'), { file: <span className="mono">supabase/schema.sql</span> })}
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

      <CommandPalette />
      {configured && !user ? <AuthOverlay open={accountOpen} onOpenChange={setAccountOpen} /> : null}
      <OnboardingFlow />
      <OfflinePill />
      <CookieConsentModal />
    </div>
  );
}
