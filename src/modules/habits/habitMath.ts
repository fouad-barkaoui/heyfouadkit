import type { Goal, GoalStep, Habit, Todo } from '@/lib/types';

/** Local calendar day as YYYY-MM-DD (never UTC — a habit done at 11pm counts today). */
export function dayKey(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function fromKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y!, (m ?? 1) - 1, d ?? 1);
}

export function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

export function isScheduled(habit: Pick<Habit, 'days'>, d: Date): boolean {
  return habit.days.length === 0 || habit.days.includes(d.getDay());
}

/**
 * Consecutive scheduled days completed, ending today — or yesterday if today
 * isn't ticked yet (the streak isn't broken until the day is over).
 * Unscheduled days are skipped, never counted against you.
 */
export function currentStreak(habit: Pick<Habit, 'days' | 'log'>, today: Date = new Date()): number {
  const done = new Set(habit.log);
  let streak = 0;
  let d = new Date(today);
  if (!done.has(dayKey(d))) d = addDays(d, -1);
  for (let guard = 0; guard < 3660; guard++) {
    if (isScheduled(habit, d)) {
      if (done.has(dayKey(d))) streak++;
      else break;
    }
    d = addDays(d, -1);
  }
  return streak;
}

export function bestStreak(habit: Pick<Habit, 'days' | 'log'>): number {
  if (habit.log.length === 0) return 0;
  const done = new Set(habit.log);
  const first = fromKey(habit.log[0]!);
  const last = fromKey(habit.log[habit.log.length - 1]!);
  let best = 0;
  let run = 0;
  for (let d = first; d <= last; d = addDays(d, 1)) {
    if (!isScheduled(habit, d)) continue;
    if (done.has(dayKey(d))) {
      run++;
      best = Math.max(best, run);
    } else run = 0;
  }
  return best;
}

/** Share of scheduled days in the last `window` days that were done (0–100). */
export function completionRate(habit: Pick<Habit, 'days' | 'log'>, window = 30, today: Date = new Date()): number {
  const done = new Set(habit.log);
  let scheduled = 0;
  let hit = 0;
  for (let i = 0; i < window; i++) {
    const d = addDays(today, -i);
    if (!isScheduled(habit, d)) continue;
    scheduled++;
    if (done.has(dayKey(d))) hit++;
  }
  return scheduled ? Math.round((hit / scheduled) * 100) : 0;
}

export function toggleDay(log: string[], key: string): string[] {
  return log.includes(key) ? log.filter((k) => k !== key) : [...log, key].sort();
}

export interface YearCell {
  key: string;
  date: Date;
  count: number;
  scheduled: number;
  inRange: boolean;
}

/**
 * GitHub-style year: 53 week-columns × 7 weekday-rows, ending this week.
 * `count` = habits done that day, `scheduled` = habits due that day.
 */
export function yearGrid(habits: Pick<Habit, 'days' | 'log' | 'createdAt'>[], today: Date = new Date()): YearCell[][] {
  const counts = new Map<string, number>();
  for (const h of habits) for (const k of h.log) counts.set(k, (counts.get(k) ?? 0) + 1);
  const end = addDays(today, 6 - today.getDay()); // Saturday of this week
  const start = addDays(end, -(53 * 7 - 1)); // a Sunday
  const todayKey = dayKey(today);
  const cols: YearCell[][] = [];
  for (let w = 0; w < 53; w++) {
    const col: YearCell[] = [];
    for (let r = 0; r < 7; r++) {
      const date = addDays(start, w * 7 + r);
      const key = dayKey(date);
      col.push({
        key,
        date,
        count: counts.get(key) ?? 0,
        scheduled: habits.filter((h) => isScheduled(h, date)).length,
        inRange: key <= todayKey,
      });
    }
    cols.push(col);
  }
  return cols;
}

/** A step counts as done when ticked here OR when its task is completed in Tasks. */
export function stepDone(step: GoalStep, todos: Todo[]): boolean {
  if (step.done) return true;
  if (!step.todoId) return false;
  const t = todos.find((x) => x.id === step.todoId);
  return t?.status === 'completed';
}

export function goalProgress(goal: Goal, todos: Todo[]): { done: number; total: number; pct: number } {
  const total = goal.steps.length;
  const done = goal.steps.filter((s) => stepDone(s, todos)).length;
  return { done, total, pct: total ? Math.round((done / total) * 100) : 0 };
}

export const HABIT_COLORS = ['#2dd4a0', '#7c83ff', '#f5a524', '#f25f5c', '#38bdf8', '#e879f9', '#e4f222'];
export const HABIT_EMOJI = ['💧', '📚', '🏃', '🧘', '💪', '🥗', '😴', '✍️', '🧠', '🎯', '🕌', '💻', '🚭', '🌅', '🎸', '💊'];
