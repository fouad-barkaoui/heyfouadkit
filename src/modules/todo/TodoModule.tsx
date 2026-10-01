import { CalendarClock, Columns3, LayoutGrid, ListChecks, Plus, Rows3 } from 'lucide-react';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useStagger } from '@/components/motion/ViewTransition';
import { ModuleLayout } from '@/components/shell/ModuleLayout';
import { StatusBadge, StatusDot } from '@/components/ui/BadgeChip';
import { Button, IconButton } from '@/components/ui/Button';
import { ConfirmDelete } from '@/components/ui/ConfirmDelete';
import { EmptyState } from '@/components/ui/EmptyState';
import { ProgressRing } from '@/components/ui/ProgressRing';
import { Timeline, type TimelineEntry } from '@/components/ui/Timeline';
import type { TaskStatus, Todo } from '@/lib/types';
import { cn, nowISO } from '@/lib/utils';
import { localDateTime, localGroupByDay } from '@/modules/articles/localDates';
import { useLanguage } from '@/state/languageStore';
import { useUI } from '@/state/uiStore';
import { useRequireAuth } from '@/state/useRequireAuth';
import { useWorkspace } from '@/state/workspaceStore';
import { KanbanBoard } from './KanbanBoard';
import { MatrixBoard } from './MatrixBoard';
import { TaskCard, TaskCheckbox } from './TaskCard';
import { TaskEditor } from './TaskEditor';
import { dueInfo, PRIORITY_LABEL, PRIORITY_TONE, PRIORITY_WEIGHT, STATUS_LABEL, STATUS_TONE } from './taskMeta';

type ViewMode = 'list' | 'board' | 'matrix' | 'timeline';

const VIEWS: { id: ViewMode; labelKey: string; icon: typeof Rows3 }[] = [
  { id: 'list', labelKey: 'task.view.list', icon: Rows3 },
  { id: 'board', labelKey: 'task.view.board', icon: Columns3 },
  { id: 'matrix', labelKey: 'task.view.matrix', icon: LayoutGrid },
  { id: 'timeline', labelKey: 'task.view.timeline', icon: CalendarClock },
];

const STATUS_FILTERS: { id: TaskStatus | 'all' | 'open'; labelKey: string }[] = [
  { id: 'open', labelKey: 'task.filter.open' },
  { id: 'all', labelKey: 'task.filter.all' },
  { id: 'in_progress', labelKey: 'task.filter.active' },
  { id: 'completed', labelKey: 'task.filter.done' },
];

export function TodoModule(): JSX.Element {
  const { t } = useLanguage();
  const { workspace, createRecord, updateRecord, toggleInteresting } = useWorkspace();
  const { focusRequest, clearFocus } = useUI();
  const requireAuth = useRequireAuth();
  const todos = useMemo(() => workspace.todos.filter((t) => !t.isDeleted), [workspace.todos]);
  /** Soft delete — moves the task to Trash instead of destroying it outright. */
  const trashTodo = (id: string): void => updateRecord('todos', id, { isDeleted: true, deletedAt: nowISO() });

  const [view, setView] = useState<ViewMode>('list');
  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'all' | 'open'>('open');
  const [query, setQuery] = useState('');
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<Todo | null>(null);
  const [highlightId, setHighlightId] = useState<string | null>(null);

  useEffect(() => {
    if (focusRequest?.module === 'todo') {
      setStatusFilter('all');
      setHighlightId(focusRequest.id);
      clearFocus();
    }
  }, [focusRequest, clearFocus]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return todos
      .filter((t) => {
        if (statusFilter === 'open') return t.status === 'backlog' || t.status === 'in_progress';
        if (statusFilter !== 'all') return t.status === statusFilter;
        return true;
      })
      .filter((t) => !q || t.title.toLowerCase().includes(q) || t.description.toLowerCase().includes(q))
      .sort((a, b) => {
        const weight = PRIORITY_WEIGHT[b.priority] - PRIORITY_WEIGHT[a.priority];
        if (weight !== 0) return weight;
        const aDue = a.dueDate ? new Date(a.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
        const bDue = b.dueDate ? new Date(b.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
        return aDue - bDue;
      });
  }, [todos, statusFilter, query]);

  const stats = useMemo(() => {
    const total = todos.length;
    const done = todos.filter((t) => t.status === 'completed').length;
    const overdue = todos.filter((t) => dueInfo(t)?.overdue).length;
    return { total, done, overdue, rate: total === 0 ? 0 : (done / total) * 100 };
  }, [todos]);

  const contentRef = useStagger([view, statusFilter, query, todos.length]);
  const panelRef = useStagger([statusFilter, query, todos.length]);

  const toggleDone = (todo: Todo): void => {
    const next: TaskStatus = todo.status === 'completed' ? 'in_progress' : 'completed';
    updateRecord('todos', todo.id, { status: next });
  };

  const openNew = (): void => {
    if (!requireAuth()) return;
    setEditing(null);
    setEditorOpen(true);
  };

  const openEdit = (todo: Todo): void => {
    setEditing(todo);
    setEditorOpen(true);
  };

  const save = (todo: Todo): void => {
    if (todos.some((t) => t.id === todo.id)) updateRecord('todos', todo.id, todo);
    else createRecord('todos', todo);
  };

  /* ── Views ───────────────────────────────────────────────────────────── */

  const listView = (
    <div className="mx-auto max-w-[900px]">
      {localGroupByDay(visible, (t) => t.dueDate ?? t.updatedAt).map(([bucket, items]) => (
        <div key={bucket} className="mb-6 last:mb-0">
          <div className="mb-2.5 flex items-center gap-2.5">
            <h3 className="text-[12px] font-medium uppercase tracking-[0.07em] text-ash">{bucket}</h3>
            <span className="h-px flex-1 bg-graphite" aria-hidden />
            <span className="mono num text-[11px] text-ash">{items.length}</span>
          </div>
          <div className="flex flex-col gap-2">
            {items.map((todo) => (
              <div
                key={todo.id}
                className={cn(
                  'rounded-[8px] transition-shadow duration-300',
                  highlightId === todo.id && 'shadow-[0_0_0_1px_rgba(228,242,34,0.55)]',
                )}
              >
                <TaskCard
                  todo={todo}
                  onToggleDone={() => toggleDone(todo)}
                  onEdit={() => openEdit(todo)}
                  onDelete={() => trashTodo(todo.id)}
                  onToggleStar={() => toggleInteresting('todos', todo.id)}
                />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );

  const timelineEntries: TimelineEntry[] = visible
    .slice()
    .sort((a, b) => {
      const aT = a.dueDate ? new Date(a.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
      const bT = b.dueDate ? new Date(b.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
      return aT - bT;
    })
    .map((todo) => ({
      id: todo.id,
      timestamp: todo.dueDate ? localDateTime(todo.dueDate) : t('task.noDate'),
      title: todo.title,
      description: todo.description || undefined,
      state: todo.status === 'completed' ? 'done' : todo.status === 'in_progress' ? 'active' : 'pending',
      meta: (
        <>
          <StatusBadge tone={PRIORITY_TONE[todo.priority]}>{PRIORITY_LABEL[todo.priority]}</StatusBadge>
          <StatusBadge tone={STATUS_TONE[todo.status]}>{STATUS_LABEL[todo.status]}</StatusBadge>
        </>
      ),
      actions: (
        <>
          <TaskCheckbox done={todo.status === 'completed'} onToggle={() => toggleDone(todo)} size={15} />
          <IconButton label={t('task.edit')} className="h-6 w-6" onClick={() => openEdit(todo)}>
            <Plus size={12.5} strokeWidth={1.9} className="rotate-45" />
          </IconButton>
          <ConfirmDelete onConfirm={() => trashTodo(todo.id)} label={t('task.delete')} size={12.5} />
        </>
      ),
    }));

  let content: ReactNode;
  if (visible.length === 0) {
    content = (
      <EmptyState
        icon={<ListChecks size={18} strokeWidth={1.6} />}
        title={query || statusFilter !== 'open' ? t('task.empty.filtered') : t('task.empty.none')}
        hint={t('task.empty.hint')}
        action={
          <Button variant="primary" icon={<Plus size={14} strokeWidth={2} />} onClick={openNew}>
            {t('task.new')}
          </Button>
        }
      />
    );
  } else if (view === 'board') {
    content = (
      <KanbanBoard
        todos={visible}
        onMove={(id, status) => updateRecord('todos', id, { status })}
        onToggleDone={toggleDone}
        onEdit={openEdit}
        onDelete={(id) => trashTodo(id)}
        onToggleStar={(id) => toggleInteresting('todos', id)}
      />
    );
  } else if (view === 'matrix') {
    content = (
      <MatrixBoard
        todos={visible}
        onToggleDone={toggleDone}
        onEdit={openEdit}
        onDelete={(id) => trashTodo(id)}
        onToggleStar={(id) => toggleInteresting('todos', id)}
      />
    );
  } else if (view === 'timeline') {
    content = (
      <div className="mx-auto max-w-[760px] pt-1">
        <Timeline entries={timelineEntries} />
      </div>
    );
  } else {
    content = listView;
  }

  const panel = (
    <div ref={panelRef}>
      <div className="mb-3 space-y-2 rounded-[8px] bg-[rgb(var(--tint-rgb)/0.02)] p-3 shadow-[inset_0_0_0_1px_var(--color-graphite)]">
        <div className="flex items-center gap-3">
          <ProgressRing value={stats.rate} label={t('task.ringLabel', { percent: Math.round(stats.rate) })} />
          <div className="min-w-0">
            <p className="num text-[13px] text-paper">
              {stats.done}<span className="text-ash"> / {stats.total}</span>
            </p>
            <p className="text-[11.5px] text-ash">{t('task.tasksCompleted')}</p>
          </div>
        </div>
        {stats.overdue > 0 ? (
          <div className="flex items-center gap-2 text-[11.5px] text-coral">
            <StatusDot tone="danger" />
            <span className="num">{t('task.overdueCount', { count: stats.overdue })}</span>
          </div>
        ) : null}
      </div>

      {visible.map((todo) => {
        const due = dueInfo(todo);
        return (
          <div
            key={todo.id}
            data-stagger
            className="group mb-[3px] flex cursor-pointer items-start gap-2 rounded-[6px] px-2.5 py-2 transition-colors duration-120 hover:bg-[rgb(var(--tint-rgb)/0.035)]"
            onClick={() => openEdit(todo)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter') openEdit(todo);
            }}
          >
            <TaskCheckbox done={todo.status === 'completed'} onToggle={() => toggleDone(todo)} size={15} />
            <div className="min-w-0 flex-1">
              <p
                className={cn(
                  'truncate text-[12.5px]',
                  todo.status === 'completed' ? 'text-ash line-through' : 'text-mist',
                )}
              >
                {todo.title}
              </p>
              <div className="mt-1 flex items-center gap-1.5">
                <StatusDot tone={PRIORITY_TONE[todo.priority]} />
                <span className="text-[11px] text-ash">{PRIORITY_LABEL[todo.priority]}</span>
                {due ? (
                  <>
                    <span className="text-ash" aria-hidden>·</span>
                    <span className={cn('text-[11px]', due.overdue ? 'text-coral' : 'text-ash')}>{due.label}</span>
                  </>
                ) : null}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );

  return (
    <>
      <ModuleLayout
        panelTitle={t('nav.todo')}
        panelCount={visible.length}
        panelActions={
          <IconButton label={t('task.new')} onClick={openNew}>
            <Plus size={15} strokeWidth={1.9} />
          </IconButton>
        }
        panelSearch={{ value: query, onChange: setQuery, placeholder: t('task.search') }}
        panelFilters={
          <div className="flex flex-wrap gap-1.5">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                className="pill"
                data-active={statusFilter === f.id}
                onClick={() => setStatusFilter(f.id)}
              >
                {t(f.labelKey)}
              </button>
            ))}
          </div>
        }
        panel={panel}
        title={t('nav.todo')}
        subtitle={
          <span className="flex flex-wrap items-center gap-2">
            <span className="num">{t('task.shownCount', { count: visible.length })}</span>
            <span aria-hidden>·</span>
            <span className="num">{t('task.completedCount', { count: stats.done })}</span>
            {stats.overdue > 0 ? (
              <>
                <span aria-hidden>·</span>
                <span className="text-coral num">{t('task.overdueCount', { count: stats.overdue })}</span>
              </>
            ) : null}
          </span>
        }
        actions={
          <Button variant="primary" icon={<Plus size={14} strokeWidth={2} />} onClick={openNew}>
            {t('task.new')}
          </Button>
        }
        toolbar={
          <div className="flex items-center gap-1 rounded-[7px] bg-[rgb(var(--tint-rgb)/0.03)] p-[3px] shadow-[inset_0_0_0_1px_var(--color-graphite)]">
            {VIEWS.map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => setView(v.id)}
                aria-pressed={view === v.id}
                className={cn(
                  'flex items-center gap-1.5 rounded-[5px] px-2.5 py-[5px] text-[12.5px] transition-colors duration-150',
                  view === v.id ? 'bg-obsidian text-paper shadow-[inset_0_0_0_1px_rgb(var(--tint-rgb) / 0.06)]' : 'text-ash hover:text-mist',
                )}
              >
                <v.icon size={13} strokeWidth={1.75} aria-hidden />
                {t(v.labelKey)}
              </button>
            ))}
          </div>
        }
        detailOpenOnMobile
      >
        <div ref={contentRef}>{content}</div>
      </ModuleLayout>

      <TaskEditor
        open={editorOpen}
        onOpenChange={setEditorOpen}
        task={editing}
        onSave={(todo) => save({ ...todo, updatedAt: nowISO() })}
      />
    </>
  );
}
