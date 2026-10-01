import type { TaskPriority, TaskStatus, Todo } from '@/lib/types';
import type { StatusTone } from '@/components/ui/BadgeChip';
import { localeTag, translate } from '@/state/languageStore';

/** A label map whose values are looked up in the current language on every read. */
function translatedLabels<K extends string>(keys: Record<K, string>): Record<K, string> {
  const out = {} as Record<K, string>;
  for (const [k, key] of Object.entries(keys) as [K, string][]) {
    Object.defineProperty(out, k, { get: () => translate(key), enumerable: true });
  }
  return out;
}

export const PRIORITY_LABEL: Record<TaskPriority, string> = translatedLabels({
  low: 'task.priority.low',
  medium: 'task.priority.medium',
  high: 'task.priority.high',
  critical: 'task.priority.critical',
});

export const PRIORITY_TONE: Record<TaskPriority, StatusTone> = {
  low: 'neutral',
  medium: 'info',
  high: 'accent',
  critical: 'danger',
};

export const PRIORITY_WEIGHT: Record<TaskPriority, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

export const STATUS_LABEL: Record<TaskStatus, string> = translatedLabels({
  backlog: 'task.status.backlog',
  in_progress: 'task.status.in_progress',
  completed: 'task.status.completed',
  archived: 'task.status.archived',
});

export const STATUS_TONE: Record<TaskStatus, StatusTone> = {
  backlog: 'neutral',
  in_progress: 'info',
  completed: 'success',
  archived: 'neutral',
};

export const KANBAN_COLUMNS: TaskStatus[] = ['backlog', 'in_progress', 'completed', 'archived'];

export interface DueInfo {
  label: string;
  tone: StatusTone;
  overdue: boolean;
  /** Whole days from today to the due date (negative when past). */
  days: number;
}

export function dueInfo(todo: Todo): DueInfo | null {
  if (!todo.dueDate) return null;
  const due = new Date(todo.dueDate);
  if (Number.isNaN(due.getTime())) return null;

  const startOf = (d: Date): number => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((startOf(due) - startOf(new Date())) / 86_400_000);

  const dueOn = (): string =>
    translate('task.due.on', { date: due.toLocaleDateString(localeTag(), { month: 'short', day: 'numeric' }) });

  if (todo.status === 'completed') {
    return { label: dueOn(), tone: 'neutral', overdue: false, days };
  }
  if (days < 0) {
    const label = days === -1 ? translate('task.due.overdueOne') : translate('task.due.overdue', { count: Math.abs(days) });
    return { label, tone: 'danger', overdue: true, days };
  }
  if (days === 0) return { label: translate('task.due.today'), tone: 'accent', overdue: false, days };
  if (days === 1) return { label: translate('task.due.tomorrow'), tone: 'accent', overdue: false, days };
  if (days <= 7) return { label: translate('task.due.inDays', { count: days }), tone: 'info', overdue: false, days };
  return { label: dueOn(), tone: 'neutral', overdue: false, days };
}

/** Eisenhower placement: importance from priority, urgency from the due date. */
export function matrixQuadrant(todo: Todo): 0 | 1 | 2 | 3 {
  const important = todo.priority === 'critical' || todo.priority === 'high';
  const info = dueInfo(todo);
  const urgent = info
    ? info.overdue || (todo.status !== 'completed' && info.days >= 0 && info.days <= 3)
    : false;
  if (important && urgent) return 0;
  if (important && !urgent) return 1;
  if (!important && urgent) return 2;
  return 3;
}

export const QUADRANTS = [
  { id: 0, titleKey: 'task.quad.doFirst', hintKey: 'task.quad.doFirstHint', tone: 'danger' as StatusTone },
  { id: 1, titleKey: 'task.quad.schedule', hintKey: 'task.quad.scheduleHint', tone: 'accent' as StatusTone },
  { id: 2, titleKey: 'task.quad.delegate', hintKey: 'task.quad.delegateHint', tone: 'info' as StatusTone },
  { id: 3, titleKey: 'task.quad.eliminate', hintKey: 'task.quad.eliminateHint', tone: 'neutral' as StatusTone },
];
