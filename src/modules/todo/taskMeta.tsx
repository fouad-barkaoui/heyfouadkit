import type { TaskPriority, TaskStatus, Todo } from '@/lib/types';
import type { StatusTone } from '@/components/ui/BadgeChip';

export const PRIORITY_LABEL: Record<TaskPriority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  critical: 'Critical',
};

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

export const STATUS_LABEL: Record<TaskStatus, string> = {
  backlog: 'Backlog',
  in_progress: 'In progress',
  completed: 'Completed',
  archived: 'Archived',
};

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
}

export function dueInfo(todo: Todo): DueInfo | null {
  if (!todo.dueDate) return null;
  const due = new Date(todo.dueDate);
  if (Number.isNaN(due.getTime())) return null;

  const startOf = (d: Date): number => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((startOf(due) - startOf(new Date())) / 86_400_000);

  if (todo.status === 'completed') {
    return { label: `Due ${due.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`, tone: 'neutral', overdue: false };
  }
  if (days < 0) return { label: `${Math.abs(days)}d overdue`, tone: 'danger', overdue: true };
  if (days === 0) return { label: 'Due today', tone: 'accent', overdue: false };
  if (days === 1) return { label: 'Due tomorrow', tone: 'accent', overdue: false };
  if (days <= 7) return { label: `Due in ${days}d`, tone: 'info', overdue: false };
  return {
    label: `Due ${due.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
    tone: 'neutral',
    overdue: false,
  };
}

/** Eisenhower placement: importance from priority, urgency from the due date. */
export function matrixQuadrant(todo: Todo): 0 | 1 | 2 | 3 {
  const important = todo.priority === 'critical' || todo.priority === 'high';
  const info = dueInfo(todo);
  const urgent = info ? info.overdue || /today|tomorrow|in [1-3]d/.test(info.label) : false;
  if (important && urgent) return 0;
  if (important && !urgent) return 1;
  if (!important && urgent) return 2;
  return 3;
}

export const QUADRANTS = [
  { id: 0, title: 'Do first', hint: 'Important · urgent', tone: 'danger' as StatusTone },
  { id: 1, title: 'Schedule', hint: 'Important · not urgent', tone: 'accent' as StatusTone },
  { id: 2, title: 'Delegate', hint: 'Urgent · not important', tone: 'info' as StatusTone },
  { id: 3, title: 'Eliminate', hint: 'Neither', tone: 'neutral' as StatusTone },
];
