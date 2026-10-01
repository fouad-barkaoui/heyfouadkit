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
import { wordCount } from '@/lib/utils';
import { fmtDateTime, relTime } from '@/modules/docs/localTime';
import { useLanguage } from '@/state/languageStore';
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
  const { t, locale } = useLanguage();

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
        label: day.toLocaleDateString(locale, { month: 'short', day: 'numeric' }),
        value: counts.get(day.toISOString().slice(0, 10)) ?? 0,
      };
    });
  }, [workspace, locale]);

  const mix = useMemo<BarDatum[]>(
    () => [
      {
        label: t('an.mix.notes'),
        value: workspace.notes.length,
        color: CATEGORICAL[0],
        hint: t('an.mix.wordsWritten', { count: workspace.notes.reduce((s, n) => s + wordCount(n.content), 0) }),
      },
      {
        label: t('an.mix.articles'),
        value: workspace.articles.length,
        color: CATEGORICAL[1],
        hint: t('an.detail.uploaded', { count: workspace.articles.filter((a) => a.kind !== 'written').length }),
      },
      {
        label: t('an.mix.documents'),
        value: workspace.docs.length,
        color: CATEGORICAL[2],
        hint: t('an.mix.folders', { count: new Set(workspace.docs.map((d) => d.folder)).size }),
      },
    ],
    [workspace, t],
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
        .map((c) => ({ label: c.title, value: c.progress, hint: t('an.courses.updated', { time: relTime(c.updatedAt) }) })),
    [workspace.courses, t],
  );

  const recent = useMemo<TimelineEntry[]>(() => {
    const rows = [
      ...workspace.notes.map((n) => ({ id: n.id, title: n.title, when: n.updatedAt, kind: 'Note', kindKey: 'an.kind.note' })),
      ...workspace.articles.map((a) => ({ id: a.id, title: a.title, when: a.updatedAt, kind: 'Article', kindKey: 'an.kind.article' })),
      ...workspace.docs.map((d) => ({ id: d.id, title: d.title, when: d.updatedAt, kind: 'Document', kindKey: 'an.kind.document' })),
      ...workspace.todos.map((t) => ({ id: t.id, title: t.title, when: t.updatedAt, kind: 'Task', kindKey: 'an.kind.task' })),
    ]
      .sort((a, b) => new Date(b.when).getTime() - new Date(a.when).getTime())
      .slice(0, 6);

    return rows.map((row, i) => ({
      id: `${row.kind}-${row.id}`,
      timestamp: fmtDateTime(row.when),
      title: row.title || t('an.untitled'),
      description: t(row.kindKey),
      state: i === 0 ? 'active' : 'done',
    }));
  }, [workspace, t]);

  const gridRef = useStagger([workspace]);

  return (
    <ModuleLayout
      panelTitle={t('nav.insight')}
      panelSearch={undefined}
      panel={
        <div className="space-y-3">
          <div className="rounded-[8px] bg-[rgb(var(--tint-rgb)/0.02)] p-3 shadow-[inset_0_0_0_1px_var(--color-graphite)]">
            <p className="mb-3 text-[10.5px] font-medium uppercase tracking-[0.08em] text-ash">{t('an.taskCompletion')}</p>
            <div className="flex items-center gap-3">
              <ProgressRing value={stats.completion} size={52} label={t('an.taskCompletionRate')} />
              <div>
                <p className="num text-[13px] text-paper">
                  {stats.doneTasks}
                  <span className="text-ash"> / {stats.tasks}</span>
                </p>
                <p className="text-[11.5px] text-ash">{t('an.tasksDone')}</p>
              </div>
            </div>
          </div>

          <div className="rounded-[8px] bg-[rgb(var(--tint-rgb)/0.02)] p-3 shadow-[inset_0_0_0_1px_var(--color-graphite)]">
            <p className="mb-3 text-[10.5px] font-medium uppercase tracking-[0.08em] text-ash">{t('an.courseProgress')}</p>
            <div className="flex items-center gap-3">
              <ProgressRing value={stats.avgProgress} size={52} color="#12a3b0" label={t('an.avgCourseProgress')} />
              <div>
                <p className="num text-[13px] text-paper">{stats.courses}</p>
                <p className="text-[11.5px] text-ash">{t('an.coursesTracked')}</p>
              </div>
            </div>
          </div>

          <div className="rounded-[8px] bg-[rgb(var(--tint-rgb)/0.02)] p-3 shadow-[inset_0_0_0_1px_var(--color-graphite)]">
            <p className="mb-2.5 text-[10.5px] font-medium uppercase tracking-[0.08em] text-ash">{t('an.latestActivity')}</p>
            <Timeline entries={recent.slice(0, 4)} />
          </div>
        </div>
      }
      title={t('nav.analytics')}
      subtitle={
        <span className="num">
          {t('an.subtitle', {
            records: stats.notes + stats.tasks + stats.articles + stats.courses + stats.docs,
            words: stats.words.toLocaleString(locale),
          })}
        </span>
      }
      detailOpenOnMobile
    >
      <div ref={gridRef} className="mx-auto max-w-[1080px] space-y-4">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          <StatTile
            icon={<NotebookPen size={14} strokeWidth={1.7} />}
            label={t('an.stat.notes')}
            value={stats.notes}
            detail={t('an.detail.words', { words: stats.words.toLocaleString(locale) })}
          />
          <StatTile
            icon={<ListChecks size={14} strokeWidth={1.7} />}
            label={t('an.stat.tasks')}
            value={stats.tasks}
            detail={t('an.detail.tasks', { done: stats.doneTasks, rate: Math.round(stats.completion) })}
          />
          <StatTile
            icon={<FileText size={14} strokeWidth={1.7} />}
            label={t('an.stat.articles')}
            value={stats.articles}
            detail={t('an.detail.uploaded', { count: workspace.articles.filter((a) => a.kind !== 'written').length })}
          />
          <StatTile
            icon={<GraduationCap size={14} strokeWidth={1.7} />}
            label={t('an.stat.courses')}
            value={stats.courses}
            detail={t('an.detail.avgProgress', { pct: Math.round(stats.avgProgress) })}
          />
          <StatTile
            icon={<BookMarked size={14} strokeWidth={1.7} />}
            label={t('an.stat.vaulted')}
            value={stats.starred}
            detail={t('an.detail.starred')}
          />
        </div>

        <div data-stagger>
          <ChartFrame
            title={t('an.heat.title')}
            caption={t('an.heat.caption')}
            table={{
              columns: [t('an.col.date'), t('an.col.items')],
              rows: heat
                .filter((c) => c.count > 0)
                .slice(-40)
                .map((c) => [new Date(c.date).toLocaleDateString(locale), c.count]),
            }}
          >
            <ActivityHeatmap cells={heat} weeks={HEAT_WEEKS} />
          </ChartFrame>
        </div>

        <div data-stagger>
          <ChartFrame
            title={t('an.trend.title')}
            caption={t('an.trend.caption')}
            table={{ columns: [t('an.col.day'), t('an.col.items')], rows: trend.map((p) => [p.label, p.value]) }}
          >
            <AreaTrend data={trend} unit={t('an.unit.items')} />
          </ChartFrame>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div data-stagger>
            <ChartFrame
              title={t('an.mix.title')}
              caption={t('an.mix.caption')}
              legend={
                <>
                  <LegendSwatch color={CATEGORICAL[0]} label={t('an.mix.notes')} />
                  <LegendSwatch color={CATEGORICAL[1]} label={t('an.mix.articles')} />
                  <LegendSwatch color={CATEGORICAL[2]} label={t('an.mix.documents')} />
                </>
              }
              table={{ columns: [t('an.col.type'), t('an.col.count')], rows: mix.map((m) => [m.label, m.value]) }}
            >
              <BarList data={mix} unit={t('an.unit.records')} />
            </ChartFrame>
          </div>

          <div data-stagger>
            <ChartFrame
              title={t('an.courseProgress')}
              caption={t('an.courses.caption')}
              table={{ columns: [t('an.col.course'), '%'], rows: courseBars.map((c) => [c.label, c.value]) }}
            >
              {courseBars.length === 0 ? (
                <p className="py-8 text-center text-[12.5px] text-ash">{t('an.courses.empty')}</p>
              ) : (
                <BarList data={courseBars} unit="%" />
              )}
            </ChartFrame>
          </div>
        </div>

        <div data-stagger>
          <ChartFrame
            title={t('an.tags.title')}
            caption={t('an.tags.caption')}
            table={{ columns: [t('an.col.tag'), t('an.col.uses')], rows: tagBars.map((t) => [t.label, t.value]) }}
          >
            {tagBars.length === 0 ? (
              <p className="py-8 text-center text-[12.5px] text-ash">{t('an.tags.empty')}</p>
            ) : (
              <BarList data={tagBars} unit={t('an.unit.uses')} />
            )}
          </ChartFrame>
        </div>
      </div>
    </ModuleLayout>
  );
}
