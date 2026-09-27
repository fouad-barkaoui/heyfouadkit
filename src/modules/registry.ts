import {
  BarChart3,
  BookMarked,
  CalendarDays,
  FileText,
  FolderTree,
  GraduationCap,
  LayoutDashboard,
  ListChecks,
  Newspaper,
  NotebookPen,
  Pill,
  Sparkles,
  Trash2,
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
  { id: 'team', label: 'Team', short: 'Team', icon: Users },
  { id: 'news', label: 'News', short: 'News', icon: Newspaper },
  { id: 'medications', label: 'Medications Catalog', short: 'Medications', icon: Pill },
  { id: 'notebook', label: 'Notebook', short: 'Notes', icon: NotebookPen },
  { id: 'articles', label: 'Articles & Media', short: 'Articles', icon: FileText },
  { id: 'courses', label: 'Course Hub', short: 'Courses', icon: GraduationCap },
  { id: 'docs', label: 'Docs Storage', short: 'Docs', icon: FolderTree },
  { id: 'vault', label: 'Vault', short: 'Vault', icon: BookMarked },
  { id: 'reporting', label: 'Reporting', short: 'Reporting', icon: LayoutDashboard },
  { id: 'analytics', label: 'Analytics', short: 'Analytics', icon: BarChart3 },
  { id: 'trash', label: 'Trash', short: 'Trash', icon: Trash2 },
];

export const MODULE_MAP: Record<ModuleId, ModuleMeta> = Object.fromEntries(
  MODULES.map((m) => [m.id, m]),
) as Record<ModuleId, ModuleMeta>;

/**
 * Sidebar structure, matching the reference layout: a flat "Essentials" list,
 * a single collapsible "Docs" group bundling the original document modules
 * (an open/close sub-list, same idea as the reference's collapsible
 * "Projects" group), then an "Insight" group. "Automations" was intentionally
 * left out per instruction — it is not a module and never will be.
 */
export const ESSENTIALS: ModuleId[] = ['home', 'todo', 'calendar', 'team', 'news', 'medications'];

export const DOCS_GROUP = {
  label: 'Docs',
  icon: FolderTree,
  children: ['notebook', 'articles', 'courses', 'docs', 'vault'] as ModuleId[],
};

export const INSIGHT: ModuleId[] = ['reporting', 'analytics', 'trash'];
