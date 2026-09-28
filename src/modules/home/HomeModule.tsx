import {
  ArrowRight,
  BookmarkPlus,
  CalendarDays,
  ListChecks,
  Newspaper,
  NotebookPen,
  Pill,
  Sparkles,
  Users,
} from 'lucide-react';
import { useMemo } from 'react';
import { useStagger } from '@/components/motion/ViewTransition';
import { StatTile } from '@/components/charts/StatTile';
import { AvatarPrompt } from '@/components/profile/AvatarPrompt';
import { ProSpotlight } from '@/components/profile/ProSpotlight';
import { Avatar } from '@/components/ui/Avatar';
import { PlanChip } from '@/components/ui/PlanChip';
import { isProUser } from '@/lib/access';
import { Timeline, type TimelineEntry } from '@/components/ui/Timeline';
import type { ModuleId, Workspace } from '@/lib/types';
import { formatDateTime } from '@/lib/utils';
import { getDisplayName, useAuth } from '@/state/authStore';
import { useLanguage } from '@/state/languageStore';
import { useTeam } from '@/state/teamStore';
import { useUI } from '@/state/uiStore';
import { useWorkspace } from '@/state/workspaceStore';
import { dueInfo } from '@/modules/todo/taskMeta';
import { MenuButton } from '@/components/shell/MenuButton';
import { ScrollIndex } from '@/components/motion/ScrollIndex';

function collectTimestamps(ws: Workspace): { id: string; title: string; when: string; kind: string; module: ModuleId }[] {
  return [
    ...ws.notes.map((n) => ({ id: n.id, title: n.title || 'Untitled note', when: n.updatedAt, kind: 'Note', module: 'notebook' as ModuleId })),
    ...ws.todos.map((t) => ({ id: t.id, title: t.title, when: t.updatedAt, kind: 'Task', module: 'todo' as ModuleId })),
    ...ws.articles.map((a) => ({ id: a.id, title: a.title || 'Untitled article', when: a.updatedAt, kind: 'Article', module: 'articles' as ModuleId })),
    ...ws.docs.map((d) => ({ id: d.id, title: d.title || 'Untitled document', when: d.updatedAt, kind: 'Document', module: 'docs' as ModuleId })),
    ...ws.courses.map((c) => ({ id: c.id, title: c.title || 'Untitled course', when: c.updatedAt, kind: 'Course', module: 'courses' as ModuleId })),
    ...ws.news.map((n) => ({ id: n.id, title: n.title || 'Untitled story', when: n.updatedAt, kind: 'News', module: 'news' as ModuleId })),
    ...ws.medicines.map((m) => ({ id: m.id, title: m.name || 'Untitled medicine', when: m.updatedAt, kind: 'Medicine', module: 'medications' as ModuleId })),
  ];
}

function greetingKey(): string {
  const hour = new Date().getHours();
  if (hour < 5) return 'home.greeting.lateNight';
  if (hour < 12) return 'home.greeting.morning';
  if (hour < 18) return 'home.greeting.afternoon';
  return 'home.greeting.evening';
}

export function HomeModule(): JSX.Element {
  const { workspace, live } = useWorkspace();
  const { user, avatarUrl } = useAuth();
  const pro = isProUser(user);
  const { activeTeam, members } = useTeam();
  const { setModule, setAccountOpen } = useUI();
  const { t } = useLanguage();

  const QUICK_LINKS: { id: ModuleId; labelKey: string; hintKey: string; icon: typeof ListChecks }[] = [
    { id: 'saveit', labelKey: 'home.link.saveit.label', hintKey: 'home.link.saveit.hint', icon: BookmarkPlus },
    { id: 'todo', labelKey: 'home.link.tasks.label', hintKey: 'home.link.tasks.hint', icon: ListChecks },
    { id: 'calendar', labelKey: 'home.link.calendar.label', hintKey: 'home.link.calendar.hint', icon: CalendarDays },
    { id: 'team', labelKey: 'home.link.team.label', hintKey: 'home.link.team.hint', icon: Users },
    { id: 'news', labelKey: 'home.link.news.label', hintKey: 'home.link.news.hint', icon: Newspaper },
    { id: 'medications', labelKey: 'home.link.medications.label', hintKey: 'home.link.medications.hint', icon: Pill },
    { id: 'notebook', labelKey: 'home.link.notebook.label', hintKey: 'home.link.notebook.hint', icon: NotebookPen },
  ];

  const stats = useMemo(() => {
    const openTasks = workspace.todos.filter((t) => t.status !== 'completed' && t.status !== 'archived');
    const dueSoon = openTasks.filter((t) => {
      const info = dueInfo(t);
      return info ? info.overdue || /today|tomorrow/.test(info.label) : false;
    });
    const overdue = openTasks.filter((t) => dueInfo(t)?.overdue);
    return {
      open: openTasks.length,
      dueSoon: dueSoon.length,
      overdue: overdue.length,
      records: workspace.notes.length + workspace.todos.length + workspace.articles.length + workspace.courses.length + workspace.docs.length,
    };
  }, [workspace]);

  const recent = useMemo<TimelineEntry[]>(() => {
    return collectTimestamps(workspace)
      .sort((a, b) => new Date(b.when).getTime() - new Date(a.when).getTime())
      .slice(0, 7)
      .map((row, i) => ({
        id: `${row.kind}-${row.id}`,
        timestamp: formatDateTime(row.when),
        title: row.title,
        description: row.kind,
        state: i === 0 ? 'active' : 'done',
        onClick: () => setModule(row.module),
      }));
  }, [workspace, setModule]);

  const gridRef = useStagger([workspace, activeTeam?.id]);
  const name = getDisplayName(user).split(' ')[0] || getDisplayName(user);
  const memberCount = members.length || 1;
  const memberWord = memberCount === 1 ? t('home.member') : t('home.members');

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-col">
      <header className="flex items-center gap-3 border-b border-graphite px-4 py-3.5 md:px-7 md:py-4">
        <MenuButton className="md:hidden" />
        <button
          type="button"
          onClick={() => setAccountOpen(true)}
          aria-label="Open your profile"
          className="home-hello-avatar hidden shrink-0 rounded-full sm:block"
        >
          <Avatar src={avatarUrl} name={getDisplayName(user) || 'You'} size={42} pro={pro} />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="flex min-w-0 items-center gap-2 truncate text-[19px] font-medium leading-tight tracking-[-0.016em] text-paper md:text-[21px]">
            <span className="truncate">
              {t(greetingKey())}
              {name ? `, ${name}` : ''}
            </span>
            <PlanChip user={user} className="shrink-0" />
          </h1>
          <p className="mt-1 text-[12.5px] text-ash">
            {live
              ? `${t('home.liveIn')} ${activeTeam?.name ?? 'your team'} · ${memberCount} ${memberWord}`
              : t('home.workingLocalOnly')}
          </p>
        </div>
      </header>

      <div className="scroll-y min-h-0 flex-1 px-4 py-5 md:px-7 md:py-6">
        <ScrollIndex />
        <div ref={gridRef} className="mx-auto max-w-[1080px] space-y-4">
          <AvatarPrompt />
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatTile
              icon={<ListChecks size={14} strokeWidth={1.7} />}
              label={t('home.stat.openTasks')}
              value={stats.open}
              detail={stats.overdue > 0 ? `${stats.overdue} ${t('home.detail.overdue')}` : t('home.detail.nothingOverdue')}
            />
            <StatTile
              icon={<CalendarDays size={14} strokeWidth={1.7} />}
              label={t('home.stat.dueSoon')}
              value={stats.dueSoon}
              detail={t('home.detail.dueTodayTomorrow')}
            />
            <StatTile
              icon={<Users size={14} strokeWidth={1.7} />}
              label={t('home.stat.teammates')}
              value={members.length}
              detail={activeTeam ? `${t('home.detail.in')} ${activeTeam.name}` : t('home.detail.noTeamYet')}
            />
            <StatTile
              icon={<Sparkles size={14} strokeWidth={1.7} />}
              label={t('home.stat.records')}
              value={stats.records}
              detail={t('home.detail.recordsAcross')}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.1fr_0.9fr]">
            <div data-stagger className="surface-card p-4">
              <p className="mb-3 text-[10.5px] font-medium uppercase tracking-[0.08em] text-ash">
                {t('home.recentActivity')}
              </p>
              {recent.length === 0 ? (
                <p className="py-6 text-center text-[12.5px] text-ash">{t('home.nothingYet')}</p>
              ) : (
                <Timeline entries={recent} />
              )}
            </div>

            <div data-stagger className="space-y-2.5">
              {pro ? <ProSpotlight className="mb-4" /> : null}
              <p className="px-1 text-[10.5px] font-medium uppercase tracking-[0.08em] text-ash">
                {t('home.jumpTo')}
              </p>
              {QUICK_LINKS.map((link) => {
                const Icon = link.icon;
                return (
                  <button
                    key={link.id}
                    type="button"
                    onClick={() => setModule(link.id)}
                    className="group flex w-full items-center gap-3 rounded-[8px] bg-[rgb(var(--tint-rgb)/0.02)] p-3 text-left shadow-[inset_0_0_0_1px_var(--color-graphite)] transition-[background-color,box-shadow] duration-150 hover:bg-[rgb(var(--tint-rgb)/0.04)] hover:shadow-[inset_0_0_0_1px_var(--color-smoke)]"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[7px] bg-[rgb(var(--tint-rgb)/0.05)] text-fog">
                      <Icon size={14} strokeWidth={1.7} aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] text-paper">{t(link.labelKey)}</span>
                      <span className="block truncate text-[11.5px] text-ash">{t(link.hintKey)}</span>
                    </span>
                    <ArrowRight
                      size={14}
                      strokeWidth={1.8}
                      className="shrink-0 text-ash transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-mist"
                      aria-hidden
                    />
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
