import type { ModuleId } from '@/lib/types';

/**
 * One loader per module chunk. AppShell's lazy() components use these same
 * functions, so hovering a sidebar row downloads that module's code before
 * the click — navigation feels instant instead of waiting on the network.
 */
export const MODULE_LOADERS: Record<ModuleId, () => Promise<unknown>> = {
  home: () => import('@/modules/home/HomeModule'),
  saveit: () => import('@/modules/saveit/SaveItModule'),
  todo: () => import('@/modules/todo/TodoModule'),
  calendar: () => import('@/modules/calendar/CalendarModule'),
  habits: () => import('@/modules/habits/HabitsModule'),
  team: () => import('@/modules/team/TeamModule'),
  news: () => import('@/modules/news/NewsModule'),
  medications: () => import('@/modules/medications/MedicationsModule'),
  notebook: () => import('@/modules/notebook/NotebookModule'),
  articles: () => import('@/modules/articles/ArticlesModule'),
  courses: () => import('@/modules/courses/CoursesModule'),
  docs: () => import('@/modules/docs/DocsModule'),
  vault: () => import('@/modules/vault/VaultModule'),
  reporting: () => import('@/modules/reporting/ReportingModule'),
  analytics: () => import('@/modules/analytics/AnalyticsModule'),
  trash: () => import('@/modules/trash/TrashPage'),
  portfolio: () => import('@/modules/portfolio/PortfolioModule'),
  contact: () => import('@/modules/contact/ContactModule'),
  inbox: () => import('@/modules/inbox/InboxModule'),
};

const warmed = new Set<ModuleId>();

/** Fire-and-forget: start downloading a module's chunk (once). */
export function prefetchModule(id: ModuleId): void {
  if (warmed.has(id)) return;
  warmed.add(id);
  void MODULE_LOADERS[id]().catch(() => warmed.delete(id));
}

/** After first paint, quietly warm the modules people open most. */
export function prefetchLikelyModules(ids: ModuleId[]): void {
  const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number };
  const run = (): void => ids.forEach(prefetchModule);
  if (w.requestIdleCallback) w.requestIdleCallback(run, { timeout: 4000 });
  else window.setTimeout(run, 2500);
}
