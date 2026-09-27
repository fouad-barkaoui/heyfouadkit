import {
  Calendar as CalendarIcon,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Plus,
  Repeat,
} from 'lucide-react';
import { useMemo, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react';
import { Button, IconButton } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/BadgeChip';
import { ConfirmDelete } from '@/components/ui/ConfirmDelete';
import { EmptyState } from '@/components/ui/EmptyState';
import { Modal } from '@/components/ui/Modal';
import { ProgressBar } from '@/components/ui/ProgressRing';
import type { TaskStatus, Todo } from '@/lib/types';
import { cn, formatDate } from '@/lib/utils';
import { useRequireAuth } from '@/state/useRequireAuth';
import { useWorkspace } from '@/state/workspaceStore';
import { TaskCheckbox } from '@/modules/todo/TaskCard';
import { TaskEditor } from '@/modules/todo/TaskEditor';
import { dueInfo, PRIORITY_LABEL, PRIORITY_TONE, STATUS_LABEL, STATUS_TONE } from '@/modules/todo/taskMeta';
import { MenuButton } from '@/components/shell/MenuButton';

const DAY_MS = 86_400_000;
const DAY_SPAN = 21;
const ROW_H = 46;
const LABEL_W = 226;
const DAY_W = 42;

const PROGRESS_BY_STATUS: Record<TaskStatus, number> = {
  backlog: 0,
  in_progress: 50,
  completed: 100,
  archived: 100,
};

const BAR_COLOR: Record<TaskStatus, string> = {
  backlog: '#8a8f98',
  in_progress: '#6366f1',
  completed: '#27a644',
  archived: '#5b6068',
};

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
function addDays(d: Date, n: number): Date {
  return new Date(d.getTime() + n * DAY_MS);
}
function dayIndex(from: Date, to: Date): number {
  return Math.round((startOfDay(to).getTime() - startOfDay(from).getTime()) / DAY_MS);
}
function toInputDate(d: Date): string {
  return startOfDay(d).toISOString().slice(0, 10);
}

interface Placement {
  task: Todo;
  trueStart: Date;
  trueEnd: Date;
  colStart: number;
  colEnd: number;
}

function GanttBar({
  placement,
  rowIndex,
  onMoveDays,
  onResizeStartDays,
  onResizeEndDays,
  onOpen,
}: {
  placement: Placement;
  rowIndex: number;
  onMoveDays: (days: number) => void;
  onResizeStartDays: (days: number) => void;
  onResizeEndDays: (days: number) => void;
  onOpen: () => void;
}): JSX.Element {
  const { task, colStart, colEnd } = placement;
  const barRef = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<{ mode: 'move' | 'start' | 'end'; deltaPx: number; width: number } | null>(null);
  const originX = useRef(0);

  const begin = (mode: 'move' | 'start' | 'end') => (e: ReactPointerEvent<HTMLDivElement>): void => {
    e.stopPropagation();
    originX.current = e.clientX;
    const width = barRef.current?.getBoundingClientRect().width ?? DAY_W;
    setDrag({ mode, deltaPx: 0, width });
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>): void => {
    if (!drag) return;
    setDrag({ ...drag, deltaPx: e.clientX - originX.current });
  };

  const end = (e: ReactPointerEvent<HTMLDivElement>): void => {
    if (!drag) return;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
    const deltaDays = Math.round(drag.deltaPx / DAY_W);
    if (Math.abs(drag.deltaPx) < 4) {
      setDrag(null);
      if (drag.mode === 'move') onOpen();
      return;
    }
    if (deltaDays !== 0) {
      if (drag.mode === 'move') onMoveDays(deltaDays);
      else if (drag.mode === 'start') onResizeStartDays(deltaDays);
      else onResizeEndDays(deltaDays);
    }
    setDrag(null);
  };

  const done = task.status === 'completed';
  const style: CSSProperties = {
    gridColumn: `${colStart + 2} / ${colEnd + 3}`,
    gridRow: rowIndex + 2,
    background: BAR_COLOR[task.status],
    opacity: done ? 0.55 : 0.92,
  };
  if (drag) {
    if (drag.mode === 'move') style.transform = `translateX(${drag.deltaPx}px)`;
    else if (drag.mode === 'start') {
      style.transform = `translateX(${drag.deltaPx}px)`;
      style.width = Math.max(DAY_W - 6, drag.width - drag.deltaPx);
    } else {
      style.width = Math.max(DAY_W - 6, drag.width + drag.deltaPx);
    }
    style.zIndex = 5;
  }

  return (
    <div
      ref={barRef}
      data-gantt-bar={task.id}
      className="group relative my-[7px] flex touch-none select-none items-center rounded-[6px] px-2 text-[11.5px] text-white shadow-[0_1px_3px_rgba(0,0,0,0.35)]"
      style={style}
      onPointerDown={begin('move')}
      onPointerMove={onPointerMove}
      onPointerUp={end}
      onPointerCancel={end}
    >
      <span className="truncate">{task.title}</span>
      <span
        className="absolute inset-y-0 left-0 w-2 cursor-ew-resize opacity-0 group-hover:opacity-100"
        onPointerDown={begin('start')}
        onPointerMove={onPointerMove}
        onPointerUp={end}
        onPointerCancel={end}
        aria-hidden
      >
        <span className="absolute left-[2px] top-1/2 h-3.5 w-[3px] -translate-y-1/2 rounded-full bg-white/70" />
      </span>
      <span
        className="absolute inset-y-0 right-0 w-2 cursor-ew-resize opacity-0 group-hover:opacity-100"
        onPointerDown={begin('end')}
        onPointerMove={onPointerMove}
        onPointerUp={end}
        onPointerCancel={end}
        aria-hidden
      >
        <span className="absolute right-[2px] top-1/2 h-3.5 w-[3px] -translate-y-1/2 rounded-full bg-white/70" />
      </span>
    </div>
  );
}

function TaskDetailCard({
  task,
  open,
  onOpenChange,
  onEdit,
  onToggleDone,
  onDelete,
}: {
  task: Todo | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: () => void;
  onToggleDone: () => void;
  onDelete: () => void;
}): JSX.Element | null {
  if (!task) return null;
  const due = dueInfo(task);

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Task"
      width="sm"
      footer={
        <>
          <ConfirmDelete onConfirm={onDelete} label="Delete task" />
          <Button onClick={onEdit} icon={<Pencil size={13} strokeWidth={1.9} />}>
            Edit
          </Button>
          <Button variant="primary" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </>
      }
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <StatusBadge tone={STATUS_TONE[task.status]}>{STATUS_LABEL[task.status]}</StatusBadge>
        <StatusBadge tone={PRIORITY_TONE[task.priority]}>{PRIORITY_LABEL[task.priority]}</StatusBadge>
        {task.recurrence !== 'none' ? (
          <span className="inline-flex items-center gap-1 rounded-[4px] bg-[rgb(var(--tint-rgb)/0.05)] px-1.5 py-[2px] text-[11px] text-fog">
            <Repeat size={10} strokeWidth={1.9} aria-hidden />
            {task.recurrence}
          </span>
        ) : null}
      </div>

      <div className="mt-3 flex items-start gap-3">
        <TaskCheckbox done={task.status === 'completed'} onToggle={onToggleDone} size={19} />
        <h3 className={cn('flex-1 text-[16px] font-medium leading-snug tracking-[-0.012em]', task.status === 'completed' ? 'text-ash line-through' : 'text-paper')}>
          {task.title}
        </h3>
      </div>

      {task.description ? (
        <p className="mt-2.5 text-[13px] leading-[1.65] text-mist">{task.description}</p>
      ) : null}

      <div className="mt-4">
        <div className="mb-1.5 flex items-center justify-between text-[11px] text-ash">
          <span>Progress</span>
          <span className="num">{PROGRESS_BY_STATUS[task.status]}%</span>
        </div>
        <ProgressBar value={PROGRESS_BY_STATUS[task.status]} />
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-graphite pt-3.5">
        <span className="flex items-center gap-1.5 text-[12px] text-ash">
          <CalendarClock size={13} strokeWidth={1.8} aria-hidden />
          {task.startDate ? formatDate(task.startDate) : 'No start'} → {task.dueDate ? formatDate(task.dueDate) : 'No due date'}
        </span>
        {due ? <StatusBadge tone={due.tone}>{due.label}</StatusBadge> : null}
      </div>
    </Modal>
  );
}

export function CalendarModule(): JSX.Element {
  const { workspace, createRecord, updateRecord, removeRecord } = useWorkspace();
  const requireAuth = useRequireAuth();
  const todos = workspace.todos.filter((t) => t.status !== 'archived');

  const [viewStart, setViewStart] = useState<Date>(() => startOfDay(addDays(new Date(), -3)));
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<Todo | null>(null);
  const [initialDates, setInitialDates] = useState<{ startDate?: string; dueDate?: string } | undefined>(undefined);
  const [detailTask, setDetailTask] = useState<Todo | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const days = useMemo(() => Array.from({ length: DAY_SPAN }, (_, i) => addDays(viewStart, i)), [viewStart]);
  const todayIdx = dayIndex(viewStart, new Date());

  const placements = useMemo<Placement[]>(() => {
    const out: Placement[] = [];
    for (const task of todos) {
      if (!task.startDate && !task.dueDate) continue;
      const trueStart = task.startDate ? new Date(task.startDate) : task.dueDate ? new Date(task.dueDate) : new Date(task.createdAt);
      const trueEnd = task.dueDate ? new Date(task.dueDate) : trueStart;
      const startIdx = dayIndex(viewStart, trueStart);
      const endIdx = Math.max(startIdx, dayIndex(viewStart, trueEnd));
      if (endIdx < 0 || startIdx > DAY_SPAN - 1) continue;
      out.push({
        task,
        trueStart,
        trueEnd,
        colStart: Math.max(0, startIdx),
        colEnd: Math.min(DAY_SPAN - 1, endIdx),
      });
    }
    return out;
  }, [todos, viewStart]);

  const unscheduled = useMemo(() => todos.filter((t) => !t.startDate && !t.dueDate), [todos]);

  const openDetail = (task: Todo): void => {
    setDetailTask(task);
    setDetailOpen(true);
  };

  const openNew = (): void => {
    if (!requireAuth()) return;
    setEditing(null);
    const start = new Date();
    setInitialDates({ startDate: toInputDate(start), dueDate: toInputDate(addDays(start, 3)) });
    setEditorOpen(true);
  };

  const openEdit = (task: Todo): void => {
    setDetailOpen(false);
    setEditing(task);
    setInitialDates(undefined);
    setEditorOpen(true);
  };

  const save = (task: Todo): void => {
    if (workspace.todos.some((t) => t.id === task.id)) {
      updateRecord('todos', task.id, task);
    } else {
      createRecord('todos', task);
    }
  };

  const scheduleNow = (task: Todo): void => {
    const start = new Date();
    updateRecord('todos', task.id, { startDate: start.toISOString(), dueDate: addDays(start, 3).toISOString() });
  };

  const commitMove = (task: Todo, deltaDays: number): void => {
    const nextStart = task.startDate ? addDays(new Date(task.startDate), deltaDays) : null;
    const nextDue = task.dueDate ? addDays(new Date(task.dueDate), deltaDays) : null;
    updateRecord('todos', task.id, {
      startDate: nextStart ? nextStart.toISOString() : null,
      dueDate: nextDue ? nextDue.toISOString() : null,
    });
  };

  const commitResizeStart = (task: Todo, trueStart: Date, trueEnd: Date, deltaDays: number): void => {
    let next = addDays(trueStart, deltaDays);
    if (next.getTime() > trueEnd.getTime()) next = trueEnd;
    updateRecord('todos', task.id, { startDate: next.toISOString() });
  };

  const commitResizeEnd = (task: Todo, trueStart: Date, trueEnd: Date, deltaDays: number): void => {
    let next = addDays(trueEnd, deltaDays);
    if (next.getTime() < trueStart.getTime()) next = trueStart;
    updateRecord('todos', task.id, { dueDate: next.toISOString() });
  };

  const rangeLabel = `${days[0]?.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${days[DAY_SPAN - 1]?.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;

  const gridWidth = LABEL_W + DAY_SPAN * DAY_W;
  const gridHeight = (placements.length + 1) * ROW_H;

  return (
    <>
      <div className="flex h-full min-h-0 w-full min-w-0 flex-col">
        <header className="flex flex-wrap items-start gap-x-3 gap-y-2.5 border-b border-graphite px-4 py-3.5 md:px-7 md:py-4">
          <MenuButton className="md:hidden" />
          <div className="min-w-0 flex-1 basis-[190px]">
            <h1 className="truncate text-[17px] font-medium leading-tight tracking-[-0.016em] text-paper md:text-[19px]">
              Calendar
            </h1>
            <p className="mt-1 text-[12.5px] text-ash">{rangeLabel} · drag a bar to move it, drag its edges to resize</p>
          </div>
          <div className="ml-auto flex shrink-0 items-center gap-2">
            <div className="flex items-center gap-0.5 rounded-[7px] bg-[rgb(var(--tint-rgb)/0.03)] p-[3px] shadow-[inset_0_0_0_1px_var(--color-graphite)]">
              <IconButton label="Earlier" onClick={() => setViewStart((d) => addDays(d, -7))}>
                <ChevronLeft size={14} strokeWidth={1.9} />
              </IconButton>
              <button
                type="button"
                onClick={() => setViewStart(startOfDay(addDays(new Date(), -3)))}
                className="px-2 text-[12px] text-ash hover:text-mist"
              >
                Today
              </button>
              <IconButton label="Later" onClick={() => setViewStart((d) => addDays(d, 7))}>
                <ChevronRight size={14} strokeWidth={1.9} />
              </IconButton>
            </div>
            <Button variant="primary" icon={<Plus size={14} strokeWidth={2} />} onClick={openNew}>
              New task
            </Button>
          </div>
        </header>

        <div className="scroll-y min-h-0 flex-1">
          {placements.length === 0 ? (
            <div className="p-6">
              <EmptyState
                icon={<CalendarIcon size={18} strokeWidth={1.6} />}
                title="Nothing scheduled in this window"
                hint="Tasks appear here once they have a start or due date. Create one, or jump to another week."
                action={
                  <Button variant="primary" icon={<Plus size={14} strokeWidth={2} />} onClick={openNew}>
                    New task
                  </Button>
                }
              />
            </div>
          ) : (
            <div className="overflow-auto">
              <div
                className="relative grid"
                style={{
                  width: gridWidth,
                  minHeight: gridHeight,
                  gridTemplateColumns: `${LABEL_W}px repeat(${DAY_SPAN}, ${DAY_W}px)`,
                  gridAutoRows: ROW_H,
                }}
              >
                {/* corner */}
                <div className="sticky left-0 top-0 z-[4] border-b border-r border-graphite bg-void" style={{ gridColumn: 1, gridRow: 1 }} />

                {/* day headers */}
                {days.map((d, i) => {
                  const weekend = d.getDay() === 0 || d.getDay() === 6;
                  const isToday = i === todayIdx;
                  return (
                    <div
                      key={d.toISOString()}
                      className={cn(
                        'sticky top-0 z-[3] flex flex-col items-center justify-center border-b border-r border-graphite text-[10.5px]',
                        weekend ? 'bg-[rgb(var(--tint-rgb)/0.025)]' : 'bg-void',
                        isToday && 'bg-acid/10',
                      )}
                      style={{ gridColumn: i + 2, gridRow: 1 }}
                    >
                      <span className="text-ash">{d.toLocaleDateString('en-US', { weekday: 'narrow' })}</span>
                      <span className={cn('num', isToday ? 'font-semibold text-acid' : 'text-mist')}>{d.getDate()}</span>
                    </div>
                  );
                })}

                {/* row backgrounds + labels */}
                {placements.map((p, r) => {
                  const due = dueInfo(p.task);
                  return (
                    <div
                      key={`label-${p.task.id}`}
                      className="sticky left-0 z-[2] flex cursor-pointer items-center gap-2 border-b border-r border-graphite bg-void px-2.5 hover:bg-[rgb(var(--tint-rgb)/0.03)]"
                      style={{ gridColumn: 1, gridRow: r + 2 }}
                      onClick={() => openDetail(p.task)}
                    >
                      <TaskCheckbox
                        done={p.task.status === 'completed'}
                        onToggle={() => updateRecord('todos', p.task.id, { status: p.task.status === 'completed' ? 'in_progress' : 'completed' })}
                        size={14}
                      />
                      <span className="min-w-0 flex-1">
                        <span className={cn('block truncate text-[12px]', p.task.status === 'completed' ? 'text-ash line-through' : 'text-mist')}>
                          {p.task.title}
                        </span>
                        {due ? <span className={cn('text-[10px]', due.overdue ? 'text-coral' : 'text-ash')}>{due.label}</span> : null}
                      </span>
                    </div>
                  );
                })}
                {placements.map((p, r) =>
                  days.map((_, i) => (
                    <div
                      key={`cell-${p.task.id}-${i}`}
                      className={cn(
                        'border-b border-r border-graphite',
                        (days[i]?.getDay() === 0 || days[i]?.getDay() === 6) && 'bg-[rgb(var(--tint-rgb)/0.015)]',
                        i === todayIdx && 'bg-acid/5',
                      )}
                      style={{ gridColumn: i + 2, gridRow: r + 2 }}
                    />
                  )),
                )}

                {/* bars */}
                {placements.map((p, r) => (
                  <GanttBar
                    key={p.task.id}
                    placement={p}
                    rowIndex={r}
                    onOpen={() => openDetail(p.task)}
                    onMoveDays={(delta) => commitMove(p.task, delta)}
                    onResizeStartDays={(delta) => commitResizeStart(p.task, p.trueStart, p.trueEnd, delta)}
                    onResizeEndDays={(delta) => commitResizeEnd(p.task, p.trueStart, p.trueEnd, delta)}
                  />
                ))}
              </div>
            </div>
          )}

          {unscheduled.length > 0 ? (
            <div className="border-t border-graphite px-4 py-4 md:px-7">
              <p className="mb-2.5 text-[10.5px] font-medium uppercase tracking-[0.08em] text-ash">
                Not scheduled yet ({unscheduled.length})
              </p>
              <div className="flex flex-wrap gap-2">
                {unscheduled.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => scheduleNow(t)}
                    className="flex items-center gap-2 rounded-[7px] bg-[rgb(var(--tint-rgb)/0.025)] px-2.5 py-1.5 text-[12px] text-mist shadow-[inset_0_0_0_1px_var(--color-graphite)] transition-colors hover:bg-[rgb(var(--tint-rgb)/0.045)]"
                  >
                    <Plus size={11} strokeWidth={2} className="text-ash" aria-hidden />
                    {t.title}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <TaskDetailCard
        task={detailTask}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onEdit={() => detailTask && openEdit(detailTask)}
        onToggleDone={() =>
          detailTask &&
          updateRecord('todos', detailTask.id, { status: detailTask.status === 'completed' ? 'in_progress' : 'completed' })
        }
        onDelete={() => {
          if (detailTask) removeRecord('todos', detailTask.id);
          setDetailOpen(false);
        }}
      />

      <TaskEditor
        open={editorOpen}
        onOpenChange={setEditorOpen}
        task={editing}
        initialDates={initialDates}
        onSave={save}
      />
    </>
  );
}
