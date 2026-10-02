import {
  BarChart3,
  Briefcase,
  CalendarCheck2,
  Flame,
  Inbox,
  LibraryBig,
  BookmarkPlus,
  BookMarked,
  CalendarDays,
  FileText,
  FolderTree,
  GraduationCap,
  IdCard,
  LayoutDashboard,
  ListChecks,
  Newspaper,
  NotebookPen,
  Pill,
  Sparkles,
  Trash2,
  MessageSquareHeart,
  Users,
  type LucideIcon,
} from 'lucide-react';
import type { ModuleId } from '@/lib/types';
import { translate } from '@/state/languageStore';

export interface ModuleMeta {
  id: ModuleId;
  label: string;
  short: string;
  icon: LucideIcon;
}

/** A module entry whose `label` / `short` are read in the current language. */
function mod(id: ModuleId, icon: LucideIcon): ModuleMeta {
  return {
    id,
    icon,
    get label() {
      return translate(`core.module.${id}`);
    },
    get short() {
      return translate(`core.moduleShort.${id}`);
    },
  };
}

/** Every routable pane — order here is display order within its nav group. */
export const MODULES: ModuleMeta[] = [
  mod('home', Sparkles),
  mod('todo', ListChecks),
  mod('calendar', CalendarDays),
  mod('habits', Flame),
  mod('team', Users),
  mod('news', Newspaper),
  mod('saveit', BookmarkPlus),
  mod('medications', Pill),
  mod('notebook', NotebookPen),
  mod('articles', FileText),
  mod('courses', GraduationCap),
  mod('docs', FolderTree),
  mod('vault', BookMarked),
  mod('reporting', LayoutDashboard),
  mod('analytics', BarChart3),
  mod('trash', Trash2),
  mod('portfolio', IdCard),
  mod('contact', MessageSquareHeart),
  mod('inbox', Inbox),
];

export const MODULE_MAP: Record<ModuleId, ModuleMeta> = Object.fromEntries(
  MODULES.map((m) => [m.id, m]),
) as Record<ModuleId, ModuleMeta>;

export interface NavGroup {
  id: 'plan' | 'library' | 'workspace' | 'insight';
  labelKey: string;
  icon: LucideIcon;
  children: ModuleId[];
}

/** Home sits on its own; everything else folds into four master sections,
 * so the sidebar stays short however many tools the app grows. */
export const HOME_ID: ModuleId = 'home';

export const NAV_GROUPS: NavGroup[] = [
  { id: 'plan', labelKey: 'nav.group.plan', icon: CalendarCheck2, children: ['todo', 'calendar', 'habits'] },
  {
    id: 'library',
    labelKey: 'nav.group.library',
    icon: LibraryBig,
    children: ['saveit', 'notebook', 'articles', 'courses', 'docs', 'vault'],
  },
  { id: 'workspace', labelKey: 'nav.group.workspace', icon: Briefcase, children: ['team', 'medications'] },
  { id: 'insight', labelKey: 'nav.group.insight', icon: BarChart3, children: ['reporting', 'analytics', 'trash'] },
];

export function groupOf(id: ModuleId): NavGroup | undefined {
  return NAV_GROUPS.find((g) => g.children.includes(id));
}
