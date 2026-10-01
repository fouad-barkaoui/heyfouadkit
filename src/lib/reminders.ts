import type { ModuleId, Workspace } from '@/lib/types';
import { addDays, dayKey, isScheduled, stepDone } from '@/modules/habits/habitMath';
import { localeTag, translate } from '@/state/languageStore';

/**
 * The notification bell's brain: looks across the workspace for things the
 * person has missed (or is about to) and turns each into a reminder.
 *
 * Pure and deterministic — `now` is passed in — so it's cheap to recompute
 * every minute and easy to test. Every reminder has a stable `key` that
 * includes the date it's about, so dismissing "missed yesterday" doesn't
 * silence tomorrow's, and rescheduling a task brings its reminder back.
 */

export type ReminderKind = 'task-overdue' | 'task-today' | 'habit-missed' | 'habit-today' | 'goal-overdue' | 'step-overdue' | 'message-new';

export interface Reminder {
  key: string;
  kind: ReminderKind;
  title: string;
  detail: string;
  module: ModuleId;
  recordId: string;
  /** When it became due / was missed — drives ordering and "2h ago". */
  at: string;
  /** Already missed (vs. coming up today). */
  missed: boolean;
  /** Short time tag for the list: "3h ago", "in 2h", "Yesterday"… */
  when: string;
}

/** After this hour, an unticked habit scheduled today gets a gentle nudge. */
export const HABIT_NUDGE_HOUR = 18;

const startOfDay = (d: Date): number => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
const daysBetween = (from: Date, to: Date): number => Math.round((startOfDay(to) - startOfDay(from)) / 86_400_000);

function ago(from: Date, now: Date): string {
  const mins = Math.max(0, Math.round((now.getTime() - from.getTime()) / 60_000));
  if (mins < 1) return translate('core.time.justNow');
  if (mins < 60) return translate('core.time.minutesAgo', { n: mins });
  const hours = Math.round(mins / 60);
  if (hours < 24) return translate('core.time.hoursAgo', { n: hours });
  return translate('core.time.daysAgo', { n: Math.round(hours / 24) });
}

function until(to: Date, now: Date): string {
  const mins = Math.max(0, Math.round((to.getTime() - now.getTime()) / 60_000));
  if (mins < 60) return translate('core.time.inMinutes', { n: Math.max(1, mins) });
  return translate('core.time.inHours', { n: Math.round(mins / 60) });
}

/** Clock time in the reader's language (English keeps the device's own format). */
function clock(d: Date): string {
  const tag = localeTag();
  return d.toLocaleTimeString(tag === 'en-US' ? undefined : tag, { hour: 'numeric', minute: '2-digit' });
}

function overdueLabel(due: Date, now: Date): string {
  const days = daysBetween(due, now);
  if (days <= 0) {
    return translate('core.reminder.wasDueTodayAt', { time: clock(due) });
  }
  if (days === 1) return translate('core.reminder.wasDueYesterday');
  return translate('core.reminder.daysOverdue', { n: days });
}

export function collectReminders(ws: Pick<Workspace, 'todos' | 'habits' | 'goals'>, now: Date = new Date()): Reminder[] {
  const out: Reminder[] = [];
  const nowMs = now.getTime();
  const today = dayKey(now);

  /* ── Tasks ─────────────────────────────────────────────────────────── */
  for (const t of ws.todos) {
    if (t.isDeleted || !t.dueDate || t.status === 'completed' || t.status === 'archived') continue;
    const due = new Date(t.dueDate);
    if (Number.isNaN(due.getTime())) continue;
    if (due.getTime() <= nowMs) {
      out.push({
        key: `task:${t.id}:${t.dueDate}`,
        kind: 'task-overdue',
        title: t.title || translate('core.reminder.untitledTask'),
        detail: overdueLabel(due, now),
        module: 'todo',
        recordId: t.id,
        at: due.toISOString(),
        missed: true,
        when: ago(due, now),
      });
    } else if (dayKey(due) === today) {
      out.push({
        key: `task-today:${t.id}:${t.dueDate}`,
        kind: 'task-today',
        title: t.title || translate('core.reminder.untitledTask'),
        detail: translate('core.reminder.dueTodayAt', { time: clock(due) }),
        module: 'todo',
        recordId: t.id,
        at: new Date(startOfDay(now)).toISOString(),
        missed: false,
        when: until(due, now),
      });
    }
  }

  /* ── Habits ────────────────────────────────────────────────────────── */
  const yesterday = addDays(now, -1);
  const yKey = dayKey(yesterday);
  for (const h of ws.habits) {
    if (h.isDeleted || h.archived) continue;
    const done = new Set(h.log);
    const created = new Date(h.createdAt);
    const existedYesterday = Number.isNaN(created.getTime()) || startOfDay(created) <= startOfDay(yesterday);
    if (existedYesterday && isScheduled(h, yesterday) && !done.has(yKey)) {
      out.push({
        key: `habit:${h.id}:${yKey}`,
        kind: 'habit-missed',
        title: `${h.emoji ? `${h.emoji} ` : ''}${h.name || translate('core.reminder.habit')}`,
        detail: translate('core.reminder.habitMissed'),
        module: 'habits',
        recordId: h.id,
        at: new Date(startOfDay(now)).toISOString(),
        missed: true,
        when: translate('core.time.yesterday'),
      });
    }
    if (now.getHours() >= HABIT_NUDGE_HOUR && isScheduled(h, now) && !done.has(today)) {
      const nudgeAt = new Date(now);
      nudgeAt.setHours(HABIT_NUDGE_HOUR, 0, 0, 0);
      out.push({
        key: `habit-today:${h.id}:${today}`,
        kind: 'habit-today',
        title: `${h.emoji ? `${h.emoji} ` : ''}${h.name || translate('core.reminder.habit')}`,
        detail: translate('core.reminder.habitToday'),
        module: 'habits',
        recordId: h.id,
        at: nudgeAt.toISOString(),
        missed: false,
        when: translate('core.time.today'),
      });
    }
  }

  /* ── Goals & their steps ───────────────────────────────────────────── */
  for (const g of ws.goals) {
    if (g.isDeleted || g.status !== 'active') continue;
    if (g.dueDate) {
      const due = new Date(g.dueDate);
      if (!Number.isNaN(due.getTime()) && startOfDay(due) < startOfDay(now)) {
        out.push({
          key: `goal:${g.id}:${g.dueDate}`,
          kind: 'goal-overdue',
          title: `${g.emoji ? `${g.emoji} ` : ''}${g.title || translate('core.reminder.goal')}`,
          detail: translate('core.reminder.goalPassed', { label: overdueLabel(due, now).toLowerCase() }),
          module: 'habits',
          recordId: g.id,
          at: due.toISOString(),
          missed: true,
          when: ago(due, now),
        });
      }
    }
    for (const s of g.steps) {
      if (!s.dueDate || stepDone(s, ws.todos)) continue;
      // A step already sent to Tasks is reminded about by its task instead.
      if (s.todoId && ws.todos.some((t) => t.id === s.todoId && t.dueDate && !t.isDeleted)) continue;
      const due = new Date(s.dueDate);
      if (Number.isNaN(due.getTime()) || due.getTime() > nowMs) continue;
      out.push({
        key: `step:${g.id}:${s.id}:${s.dueDate}`,
        kind: 'step-overdue',
        title: s.title || translate('core.reminder.goalStep'),
        detail: translate('core.reminder.stepOf', {
          goal: g.title || translate('core.reminder.goalLower'),
          label: overdueLabel(due, now).toLowerCase(),
        }),
        module: 'habits',
        recordId: g.id,
        at: due.toISOString(),
        missed: true,
        when: ago(due, now),
      });
    }
  }

  // Missed first, then newest first within each group.
  return out.sort((a, b) => Number(b.missed) - Number(a.missed) || b.at.localeCompare(a.at));
}
