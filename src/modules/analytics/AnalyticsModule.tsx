import { BookMarked, FileText, GraduationCap, ListChecks, NotebookPen } from 'lucide-react';
import { useMemo } from 'react';
import { ActivityHeatmap, type HeatCell } from '@/components/charts/ActivityHeatmap';
import { AreaTrend, type TrendPoint } from '@/components/charts/AreaTrend';
import { BarList, type BarDatum } from '@/components/charts/BarList';
import { ChartFrame, LegendSwatch } from '@/components/charts/ChartFrame';
import { StatTile } from '@/components/charts/StatTile';
import { CATEGORICAL } from '@/components/charts/tokens';
import { useStagger } from '@/components/motion/ViewTransition';
import { ModuleLayout } from '@/components/shell/ModuleLayout';
import { Timeline, type TimelineEntry } from '@/components/ui/Timeline';
import { ProgressRing } from '@/components/ui/ProgressRing';
import type { Workspace } from '@/lib/types';
import { formatDateTime, relativeTime, wordCount } from '@/lib/utils';
import { useWorkspace } from '@/state/workspaceStore';

const DAY = 86_400_000;
const HEAT_WEEKS = 18;

const startOfDay = (d: Date): Date => new Date(d.getFullYear(), d.getMonth(), d.getDate());

function collectTimestamps(ws: Workspace): string[] {
  return [
    ...ws.notes.map((n) => n.updatedAt),
    ...ws.todos.map((t) => t.updatedAt),
    ...ws.articles.map((a) => a.updatedAt),
    ...ws.courses.map((c) => c.updatedAt),
    ...ws.docs.map((d) => d.updatedAt),
  ];
}

export function AnalyticsModule(): JSX.Element {
  const { workspace } = useWorkspace();

  const stats = useMemo(() => {
    const doneTasks = workspace.todos.filter((t) => t.status === 'completed').length;
    const words =
      workspace.notes.reduce((sum, n) => sum + wordCount(n.content), 0) +
      workspace.articles.reduce((sum, a) => sum + wordCount(a.content), 0) +
      workspace.docs.reduce((sum, d) => sum + wordCount(d.content), 0);
    const starred =
      workspace.notes.filter((n) => n.isInteresting).length +
      workspace.todos.filter((t) => t.isInteresting).length +
      workspace.articles.filter((a) => a.isInteresting).length +
      workspace.courses.filter((c) => c.isInteresting).length +
      workspace.docs.filter((d) => d.isInteresting).length;
    const avgProgress =
      workspace.courses.length === 0
        ? 0
        : workspace.courses.reduce((sum, c) => sum + c.progress, 0) / workspace.courses.length;

    return {
      notes: workspace.notes.length,
      tasks: workspace.todos.length,
      doneTasks,
      completion: workspace.todos.length === 0 ? 0 : (doneTasks / workspace.todos.length) * 100,
      articles: workspace.articles.length,
      courses: workspace.courses.length,
      docs: workspace.docs.length,
      words,
      starred,
      avgProgress,
    };
  }, [workspace]);

  /* Activity — one bucket per day, aligned so each column is a week. */
  const heat = useMemo<HeatCell[]>(() => {
    const counts = new Map<string, number>();
    for (const iso of collectTimestamps(workspace)) {
      const key = startOfDay(new Date(iso)).toISOString().slice(0, 10);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    const today = startOfDay(new Date());
    // Wind back to the Monday that starts the first visible week.
    const offsetToMonday = (today.getDay() + 6) % 7;
    const lastMonday = new Date(today.getTime() - offsetToMonday * DAY);
    const start = new Date(lastMonday.getTime() - (HEAT_WEEKS - 1) * 7 * DAY);

    const out: HeatCell[] = [];
    for (let i = 0; i < HEAT_WEEKS * 7; i += 1) {
      const day = new Date(start.getTime() + i * DAY);
      const key = day.toISOString().slice(0, 10);
      out.push({ date: day.toISOString(), count: counts.get(key) ?? 0 });
    }
    return out;
  }, [workspace]);

  const trend = useMemo<TrendPoint[]>(() => {
    const counts = new Map<string, number>();
    for (const iso of collectTimestamps(workspace)) {
      const key = startOfDay(new Date(iso)).toISOString().slice(0, 10);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    const today = startOfDay(new Date());
    return Array.from({ length: 30 }, (_, i) => {
      const day = new Date(today.getTime() - (29 - i) * DAY);
      return {
        label: day.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        value: counts.get(day.toISOString().slice(0, 10)) ?? 0,
      };
    });
  }, [workspace]);

  const mix = useMemo<BarDatum[]>(
    () => [
      {
        label: 'Notes',
        value: workspace.notes.length,
        color: CATEGORICAL[0],
        hint: `${workspace.notes.reduce((s, n) => s + wordCount(n.content), 0)} words written`,
      },
      {
        label: 'Articles & media',
        value: workspace.articles.length,
        color: CATEGORICAL[1],
        hint: `${workspace.articles.filter((a) => a.kind !== 'written').length} uploaded files`,
      },
      {
        label: 'Documents',
        value: workspace.docs.length,
        color: CATEGORICAL[2],
        hint: `${new Set(workspace.docs.map((d) => d.folder)).size} folders`,
      },
    ],
    [workspace],
  );

  const tagBars = useMemo<BarDatum[]>(() => {
    const counts = new Map<string, number>();
    for (const tag of [...workspace.notes, ...workspace.articles].flatMap((r) => r.tags)) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([label, value]) => ({ label: `#${label}`, value }));
  }, [workspace]);

  const courseBars = useMemo<BarDatum[]>(
    () =>
      [...workspace.courses]
        .sort((a, b) => b.progress - a.progress)
        .slice(0, 8)
        .map((c) => ({ label: c.title, value: c.progress, hint: `Updated ${relativeTime(c.updatedAt)}` })),
    [workspace.courses],
  );

  const recent = useMemo<TimelineEntry[]>(() => {
    const rows = [
      ...workspace.notes.map((n) => ({ id: n.id, title: n.title, when: n.updatedAt, kind: 'Note' })),
      ...workspace.articles.map((a) => ({ id: a.id, title: a.title, when: a.updatedAt, kind: 'Article' })),
      ...workspace.docs.map((d) => ({ id: d.id, title: d.title, when: d.updatedAt, kind: 'Document' })),
      ...workspace.todos.map((t) => ({ id: t.id, title: t.title, when: t.updatedAt, kind: 'Task' })),
    ]
      .sort((a, b) => new Date(b.when).getTime() - new Date(a.when).getTime())
      .slice(0, 6);

    return rows.map((row, i) => ({
      id: `${row.kind}-${row.id}`,
      timestamp: formatDateTime(row.when),
      title: row.title || 'Untitled',
      description: row.kind,
      state: i === 0 ? 'active' : 'done',
    }));
  }, [workspace]);

  const gridRef = useStagger([workspace]);

  return (
    <ModuleLayout
      panelTitle="Insight"
      panelSearch={undefined}
      panel={
        <div className="space-y-3">
          <div className="rounded-[8px] bg-[rgb(var(--tint-rgb)/0.02)] p-3 shadow-[inset_0_0_0_1px_var(--color-graphite)]">
            <p className="mb-3 text-[10.5px] font-medium uppercase tracking-[0.08em] text-ash">Task completion</p>
            <div className="flex items-center gap-3">
              <ProgressRing value={stats.completion} size={52} label="Task completion rate" />
              <div>
                <p className="num text-[13px] text-paper">
                  {stats.doneTasks}
                  <span className="text-ash"> / {stats.tasks}</span>
                </p>
                <p className="text-[11.5px] text-ash">tasks done</p>
              </div>
            </div>
          </div>

          <div className="rounded-[8px] bg-[rgb(var(--tint-rgb)/0.02)] p-3 shadow-[inset_0_0_0_1px_var(--color-graphite)]">
            <p className="mb-3 text-[10.5px] font-medium uppercase tracking-[0.08em] text-ash">Course progress</p>
            <div className="flex items-center gap-3">
              <ProgressRing value={stats.avgProgress} size={52} color="#12a3b0" label="Average course progress" />
              <div>
                <p className="num text-[13px] text-paper">{stats.courses}</p>
                <p className="text-[11.5px] text-ash">courses tracked</p>
              </div>
            </div>
          </div>

          <div className="rounded-[8px] bg-[rgb(var(--tint-rgb)/0.02)] p-3 shadow-[inset_0_0_0_1px_var(--color-graphite)]">
            <p className="mb-2.5 text-[10.5px] font-medium uppercase tracking-[0.08em] text-ash">Latest activity</p>
            <Timeline entries={recent.slice(0, 4)} />
          </div>
        </div>
      }
      title="Analytics"
      subtitle={
        <span className="num">
          {stats.notes + stats.tasks + stats.articles + stats.courses + stats.docs} records ·{' '}
          {stats.words.toLocaleString('en-US')} words written
        </span>
      }
      detailOpenOnMobile
    >
      <div ref={gridRef} className="mx-auto max-w-[1080px] space-y-4">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          <StatTile
            icon={<NotebookPen size={14} strokeWidth={1.7} />}
            label="Notes"
            value={stats.notes}
            detail={`${stats.words.toLocaleString('en-US')} words across the workspace`}
          />
          <StatTile
            icon={<ListChecks size={14} strokeWidth={1.7} />}
            label="Tasks"
            value={stats.tasks}
            detail={`${stats.doneTasks} completed · ${Math.round(stats.completion)}% rate`}
          />
          <StatTile
            icon={<FileText size={14} strokeWidth={1.7} />}
            label="Articles"
            value={stats.articles}
            detail={`${workspace.articles.filter((a) => a.kind !== 'written').length} uploaded files`}
          />
          <StatTile
            icon={<GraduationCap size={14} strokeWidth={1.7} />}
            label="Courses"
            value={stats.courses}
            detail={`${Math.round(stats.avgProgress)}% average progress`}
          />
          <StatTile
            icon={<BookMarked size={14} strokeWidth={1.7} />}
            label="Vaulted"
            value={stats.starred}
            detail="items marked as interesting"
          />
        </div>

        <div data-stagger>
          <ChartFrame
            title="Activity — last 18 weeks"
            caption="One cell per day; darker means more records created or edited."
            table={{
              columns: ['Date', 'Items'],
              rows: heat
                .filter((c) => c.count > 0)
                .slice(-40)
                .map((c) => [new Date(c.date).toLocaleDateString('en-US'), c.count]),
            }}
          >
            <ActivityHeatmap cells={heat} weeks={HEAT_WEEKS} />
          </ChartFrame>
        </div>

        <div data-stagger>
          <ChartFrame
            title="Items touched per day — last 30 days"
            caption="Every create or edit across all modules."
            table={{ columns: ['Day', 'Items'], rows: trend.map((p) => [p.label, p.value]) }}
          >
            <AreaTrend data={trend} unit="items" />
          </ChartFrame>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div data-stagger>
            <ChartFrame
              title="Library composition"
              caption="How the written material is distributed."
              legend={
                <>
                  <LegendSwatch color={CATEGORICAL[0]} label="Notes" />
                  <LegendSwatch color={CATEGORICAL[1]} label="Articles & media" />
                  <LegendSwatch color={CATEGORICAL[2]} label="Documents" />
                </>
              }
              table={{ columns: ['Type', 'Count'], rows: mix.map((m) => [m.label, m.value]) }}
            >
              <BarList data={mix} unit="records" />
            </ChartFrame>
          </div>

          <div data-stagger>
            <ChartFrame
              title="Course progress"
              caption="Percent complete, highest first."
              table={{ columns: ['Course', '%'], rows: courseBars.map((c) => [c.label, c.value]) }}
            >
              {courseBars.length === 0 ? (
                <p className="py-8 text-center text-[12.5px] text-ash">No courses tracked yet.</p>
              ) : (
                <BarList data={courseBars} unit="%" />
              )}
            </ChartFrame>
          </div>
        </div>

        <div data-stagger>
          <ChartFrame
            title="Most-used tags"
            caption="Across notes and written articles."
            table={{ columns: ['Tag', 'Uses'], rows: tagBars.map((t) => [t.label, t.value]) }}
          >
            {tagBars.length === 0 ? (
              <p className="py-8 text-center text-[12.5px] text-ash">No tags yet.</p>
            ) : (
              <BarList data={tagBars} unit="uses" />
            )}
          </ChartFrame>
        </div>
      </div>
    </ModuleLayout>
  );
}
