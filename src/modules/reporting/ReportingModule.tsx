import { Copy, Printer } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/Button';
import type { Workspace } from '@/lib/types';
import { cn, formatDate } from '@/lib/utils';
import { useTeam } from '@/state/teamStore';
import { useWorkspace } from '@/state/workspaceStore';
import { MenuButton } from '@/components/shell/MenuButton';
import { ScrollIndex } from '@/components/motion/ScrollIndex';

type RangeId = '7' | '30' | '90' | 'all';

const RANGES: { id: RangeId; label: string; days: number | null }[] = [
  { id: '7', label: '7 days', days: 7 },
  { id: '30', label: '30 days', days: 30 },
  { id: '90', label: '90 days', days: 90 },
  { id: 'all', label: 'All time', days: null },
];

function within(iso: string, days: number | null): boolean {
  if (days === null) return true;
  return Date.now() - new Date(iso).getTime() <= days * 86_400_000;
}

/**
 * A written, document-shaped report — the intentional counterpart to
 * Analytics' chart dashboard, not a duplicate of it. Analytics is for
 * exploring trends visually; Reporting produces a summary you could hand to
 * someone else or paste into an update.
 */
export function ReportingModule(): JSX.Element {
  const { workspace } = useWorkspace();
  const { activeTeam, members } = useTeam();
  const [range, setRange] = useState<RangeId>('30');
  const [copied, setCopied] = useState(false);

  const days = RANGES.find((r) => r.id === range)?.days ?? 30;

  const report = useMemo(() => {
    const inRange = <T extends { createdAt: string }>(rows: T[]): T[] => rows.filter((r) => within(r.createdAt, days));

    const notesCreated = inRange(workspace.notes);
    const todosCreated = inRange(workspace.todos);
    const articlesCreated = inRange(workspace.articles);
    const coursesCreated = inRange(workspace.courses);
    const docsCreated = inRange(workspace.docs);

    const doneInRange = workspace.todos.filter(
      (t) => t.status === 'completed' && within(t.updatedAt, days),
    );
    const overdue = workspace.todos.filter((t) => {
      if (t.status === 'completed' || t.status === 'archived' || !t.dueDate) return false;
      return new Date(t.dueDate).getTime() < Date.now();
    });

    const byStatus: Record<string, number> = {};
    for (const t of workspace.todos) byStatus[t.status] = (byStatus[t.status] ?? 0) + 1;

    const avgCourseProgress =
      workspace.courses.length === 0
        ? 0
        : workspace.courses.reduce((sum, c) => sum + c.progress, 0) / workspace.courses.length;

    const produced = notesCreated.length + articlesCreated.length + docsCreated.length;

    return {
      notesCreated: notesCreated.length,
      todosCreated: todosCreated.length,
      articlesCreated: articlesCreated.length,
      coursesCreated: coursesCreated.length,
      docsCreated: docsCreated.length,
      doneInRange: doneInRange.length,
      overdue: overdue.length,
      byStatus,
      avgCourseProgress,
      produced,
    };
  }, [workspace, days]);

  const rangeLabel = RANGES.find((r) => r.id === range)?.label ?? '30 days';
  const memberCount = members.length || 1;

  const asText = useMemo(() => {
    const lines = [
      `Activity report — ${activeTeam?.name ?? 'Personal'} — ${rangeLabel} (generated ${formatDate(new Date().toISOString())})`,
      '',
      `Team: ${members.length} member${members.length === 1 ? '' : 's'}`,
      `Tasks completed: ${report.doneInRange}`,
      `Tasks overdue: ${report.overdue}`,
      `Content produced: ${report.produced} item${report.produced === 1 ? '' : 's'} (${report.notesCreated} notes, ${report.articlesCreated} articles, ${report.docsCreated} docs)`,
      `New tasks logged: ${report.todosCreated}`,
      `New courses added: ${report.coursesCreated}`,
      `Average course progress: ${Math.round(report.avgCourseProgress)}%`,
      '',
      'Task status breakdown:',
      ...Object.entries(report.byStatus).map(([status, count]) => `  ${status.replace('_', ' ')}: ${count}`),
    ];
    return lines.join('\n');
  }, [activeTeam, rangeLabel, members.length, report]);

  const copyReport = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(asText);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard unavailable */
    }
  };

  const statusRows: { id: keyof Workspace | string; label: string; count: number }[] = [
    { id: 'backlog', label: 'Backlog', count: report.byStatus.backlog ?? 0 },
    { id: 'in_progress', label: 'In progress', count: report.byStatus.in_progress ?? 0 },
    { id: 'completed', label: 'Completed', count: report.byStatus.completed ?? 0 },
    { id: 'archived', label: 'Archived', count: report.byStatus.archived ?? 0 },
  ];
  const maxStatus = Math.max(1, ...statusRows.map((r) => r.count));

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-col">
      <header className="flex flex-wrap items-start gap-x-3 gap-y-2.5 border-b border-graphite px-4 py-3.5 md:px-7 md:py-4">
        <MenuButton className="md:hidden" />
        <div className="min-w-0 flex-1 basis-[190px]">
          <h1 className="truncate text-[17px] font-medium leading-tight tracking-[-0.016em] text-paper md:text-[19px]">
            Reporting
          </h1>
          <p className="mt-1 text-[12.5px] text-ash">A written summary for {activeTeam?.name ?? 'your workspace'} — {rangeLabel}.</p>
        </div>
        <div className="ml-auto flex shrink-0 items-center gap-2">
          <Button onClick={() => void copyReport()} icon={<Copy size={13.5} strokeWidth={1.9} />}>
            {copied ? 'Copied' : 'Copy as text'}
          </Button>
          <Button onClick={() => window.print()} icon={<Printer size={13.5} strokeWidth={1.9} />}>
            Print
          </Button>
        </div>
      </header>

      <div className="flex shrink-0 items-center gap-2 border-b border-graphite px-4 py-2.5 md:px-7">
        <div className="flex items-center gap-1 rounded-[7px] bg-[rgb(var(--tint-rgb)/0.03)] p-[3px] shadow-[inset_0_0_0_1px_var(--color-graphite)]">
          {RANGES.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => setRange(r.id)}
              aria-pressed={range === r.id}
              className={cn(
                'rounded-[5px] px-2.5 py-[5px] text-[12.5px] transition-colors duration-150',
                range === r.id ? 'bg-obsidian text-paper shadow-[inset_0_0_0_1px_rgb(var(--tint-rgb) / 0.06)]' : 'text-ash hover:text-mist',
              )}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <div className="scroll-y min-h-0 flex-1 px-4 py-5 md:px-7 md:py-6">
        <ScrollIndex />
        <article className="mx-auto max-w-[720px] rounded-[10px] bg-[rgb(var(--tint-rgb)/0.02)] p-6 shadow-[inset_0_0_0_1px_var(--color-graphite)] md:p-8">
          <p className="mono text-[10.5px] uppercase tracking-[0.08em] text-ash">
            {activeTeam?.name ?? 'Personal workspace'} · {formatDate(new Date().toISOString())}
          </p>
          <h2 className="mt-1.5 text-[21px] font-medium tracking-[-0.017em] text-paper">
            Activity report — {rangeLabel}
          </h2>

          <p className="mt-4 text-[13.5px] leading-[1.75] text-mist">
            Over the last {rangeLabel.toLowerCase()}, {memberCount} member{memberCount === 1 ? '' : 's'}{' '}
            completed <strong className="text-paper">{report.doneInRange}</strong> task
            {report.doneInRange === 1 ? '' : 's'} and produced{' '}
            <strong className="text-paper">{report.produced}</strong> new piece{report.produced === 1 ? '' : 's'} of
            content across notes, articles and documents.{' '}
            {report.overdue > 0 ? (
              <>
                <strong className="text-coral">{report.overdue}</strong> task{report.overdue === 1 ? ' is' : 's are'} currently overdue and worth a look.
              </>
            ) : (
              'Nothing is currently overdue.'
            )}
          </p>

          <div className="mt-6 border-t border-graphite pt-5">
            <h3 className="text-[12px] font-medium uppercase tracking-[0.07em] text-ash">Task status</h3>
            <div className="mt-3 space-y-2">
              {statusRows.map((row) => (
                <div key={row.id} className="flex items-center gap-3">
                  <span className="w-[92px] shrink-0 text-[12.5px] text-mist">{row.label}</span>
                  <span className="h-[7px] flex-1 overflow-hidden rounded-full bg-[rgb(var(--tint-rgb)/0.06)]">
                    <span
                      className="block h-full rounded-full bg-acid"
                      style={{ width: `${Math.round((row.count / maxStatus) * 100)}%` }}
                    />
                  </span>
                  <span className="num w-6 shrink-0 text-right text-[12.5px] text-ash">{row.count}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-4 border-t border-graphite pt-5 sm:grid-cols-3">
            <div>
              <p className="num text-[20px] text-paper">{report.notesCreated}</p>
              <p className="text-[11.5px] text-ash">notes added</p>
            </div>
            <div>
              <p className="num text-[20px] text-paper">{report.articlesCreated}</p>
              <p className="text-[11.5px] text-ash">articles added</p>
            </div>
            <div>
              <p className="num text-[20px] text-paper">{report.docsCreated}</p>
              <p className="text-[11.5px] text-ash">docs added</p>
            </div>
            <div>
              <p className="num text-[20px] text-paper">{report.todosCreated}</p>
              <p className="text-[11.5px] text-ash">tasks logged</p>
            </div>
            <div>
              <p className="num text-[20px] text-paper">{report.coursesCreated}</p>
              <p className="text-[11.5px] text-ash">courses added</p>
            </div>
            <div>
              <p className="num text-[20px] text-paper">{Math.round(report.avgCourseProgress)}%</p>
              <p className="text-[11.5px] text-ash">avg. course progress</p>
            </div>
          </div>

          <div className="mt-6 border-t border-graphite pt-5">
            <h3 className="text-[12px] font-medium uppercase tracking-[0.07em] text-ash">Team</h3>
            <p className="mt-2 text-[12.5px] leading-[1.7] text-mist">
              {members.length === 0
                ? 'No members yet.'
                : members
                    .map((m) => m.username || m.email || 'Member')
                    .join(', ')}
            </p>
          </div>
        </article>
      </div>
    </div>
  );
}
