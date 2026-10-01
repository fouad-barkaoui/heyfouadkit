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

export interface ModuleMeta {
  id: ModuleId;
  label: string;
  short: string;
  icon: LucideIcon;
}

/** Every routable pane — order here is display order within its nav group. */
export const MODULES: ModuleMeta[] = [
  { id: 'home', label: 'Home', short: 'Home', icon: Sparkles },
  { id: 'todo', label: 'Tasks', short: 'Tasks', icon: ListChecks },
  { id: 'calendar', label: 'Calendar', short: 'Calendar', icon: CalendarDays },
  { id: 'habits', label: 'Habits & Goals', short: 'Habits', icon: Flame },
  { id: 'team', label: 'Team', short: 'Team', icon: Users },
  { id: 'news', label: 'News', short: 'News', icon: Newspaper },
  { id: 'saveit', label: 'SaveIt', short: 'SaveIt', icon: BookmarkPlus },
  { id: 'medications', label: 'Medications Catalog', short: 'Medications', icon: Pill },
  { id: 'notebook', label: 'Notebook', short: 'Notes', icon: NotebookPen },
  { id: 'articles', label: 'Articles & Media', short: 'Articles', icon: FileText },
  { id: 'courses', label: 'Course Hub', short: 'Courses', icon: GraduationCap },
  { id: 'docs', label: 'Docs Storage', short: 'Docs', icon: FolderTree },
  { id: 'vault', label: 'Vault', short: 'Vault', icon: BookMarked },
  { id: 'reporting', label: 'Reporting', short: 'Reporting', icon: LayoutDashboard },
  { id: 'analytics', label: 'Analytics', short: 'Analytics', icon: BarChart3 },
  { id: 'trash', label: 'Trash', short: 'Trash', icon: Trash2 },
  { id: 'portfolio', label: 'Portfolio', short: 'Portfolio', icon: IdCard },
  { id: 'contact', label: 'Contact', short: 'Contact', icon: MessageSquareHeart },
  { id: 'inbox', label: 'Inbox', short: 'Inbox', icon: Inbox },
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
  { id: 'workspace', labelKey: 'nav.group.workspace', icon: Briefcase, children: ['team', 'news', 'medications'] },
  { id: 'insight', labelKey: 'nav.group.insight', icon: BarChart3, children: ['reporting', 'analytics', 'trash'] },
];

export function groupOf(id: ModuleId): NavGroup | undefined {
  return NAV_GROUPS.find((g) => g.children.includes(id));
}
