import { describe, expect, it } from 'vitest';
import type { Goal, Habit, Todo } from '@/lib/types';
import { collectReminders } from './reminders';

const NOW = new Date(2026, 8, 29, 10, 0, 0); // Tue 29 Sep 2026, 10:00 local

function todo(p: Partial<Todo>): Todo {
  return {
    id: 't1',
    title: 'Ship report',
    description: '',
    priority: 'medium',
    status: 'backlog',
    startDate: null,
    dueDate: null,
    recurrence: 'none',
    isInteresting: false,
    createdAt: new Date(2026, 8, 1).toISOString(),
    updatedAt: new Date(2026, 8, 1).toISOString(),
    ...p,
  };
}

function habit(p: Partial<Habit>): Habit {
  return {
    id: 'h1',
    name: 'Read',
    emoji: '📚',
    color: '#fff',
    days: [],
    log: [],
    archived: false,
    createdAt: new Date(2026, 8, 1).toISOString(),
    updatedAt: new Date(2026, 8, 1).toISOString(),
    ...p,
  };
}

function goal(p: Partial<Goal>): Goal {
  return {
    id: 'g1',
    title: 'Run 10k',
    why: '',
    emoji: '🏃',
    color: '#fff',
    dueDate: null,
    steps: [],
    status: 'active',
    createdAt: new Date(2026, 8, 1).toISOString(),
    updatedAt: new Date(2026, 8, 1).toISOString(),
    ...p,
  };
}

const run = (ws: { todos?: Todo[]; habits?: Habit[]; goals?: Goal[] }, now = NOW) =>
  collectReminders({ todos: ws.todos ?? [], habits: ws.habits ?? [], goals: ws.goals ?? [] }, now);

describe('collectReminders', () => {
  it('flags open tasks past their deadline as missed', () => {
    const r = run({ todos: [todo({ dueDate: new Date(2026, 8, 27, 17).toISOString() })] });
    expect(r).toHaveLength(1);
    expect(r[0]!.kind).toBe('task-overdue');
    expect(r[0]!.missed).toBe(true);
    expect(r[0]!.detail).toBe('2 days overdue');
  });

  it('lists tasks due later today as upcoming, not missed', () => {
    const r = run({ todos: [todo({ dueDate: new Date(2026, 8, 29, 17).toISOString() })] });
    expect(r[0]!.kind).toBe('task-today');
    expect(r[0]!.missed).toBe(false);
  });

  it('ignores completed, archived, deleted and undated tasks', () => {
    const past = new Date(2026, 8, 20).toISOString();
    const r = run({
      todos: [
        todo({ id: 'a', dueDate: past, status: 'completed' }),
        todo({ id: 'b', dueDate: past, status: 'archived' }),
        todo({ id: 'c', dueDate: past, isDeleted: true }),
        todo({ id: 'd', dueDate: null }),
      ],
    });
    expect(r).toEqual([]);
  });

  it('keys task reminders by due date so rescheduling brings them back', () => {
    const a = run({ todos: [todo({ dueDate: new Date(2026, 8, 27).toISOString() })] })[0]!;
    const b = run({ todos: [todo({ dueDate: new Date(2026, 8, 28).toISOString() })] })[0]!;
    expect(a.key).not.toBe(b.key);
  });

  it('reports a habit scheduled yesterday but not done', () => {
    const r = run({ habits: [habit({})] });
    expect(r.map((x) => x.kind)).toEqual(['habit-missed']);
    expect(r[0]!.key).toBe('habit:h1:2026-09-28');
  });

  it('does not report a habit done yesterday, unscheduled yesterday, or created today', () => {
    expect(run({ habits: [habit({ log: ['2026-09-28'] })] })).toEqual([]);
    expect(run({ habits: [habit({ days: [2] })] })).toEqual([]); // Tuesdays only; yesterday was Monday
    expect(run({ habits: [habit({ createdAt: NOW.toISOString() })] })).toEqual([]);
  });

  it('nudges about today’s habit only in the evening', () => {
    const evening = new Date(2026, 8, 29, 19, 0, 0);
    const r = run({ habits: [habit({ log: ['2026-09-28'] })] }, evening);
    expect(r.map((x) => x.kind)).toEqual(['habit-today']);
    expect(r[0]!.missed).toBe(false);
  });

  it('flags active goals past their deadline and overdue steps', () => {
    const r = run({
      goals: [
        goal({
          dueDate: new Date(2026, 8, 25, 12).toISOString(),
          steps: [
            { id: 's1', title: 'Buy shoes', done: false, todoId: null, dueDate: new Date(2026, 8, 26).toISOString() },
            { id: 's2', title: 'Warm up', done: true, todoId: null, dueDate: new Date(2026, 8, 26).toISOString() },
          ],
        }),
        goal({ id: 'g2', status: 'achieved', dueDate: new Date(2026, 8, 1).toISOString() }),
      ],
    });
    expect(r.map((x) => x.kind).sort()).toEqual(['goal-overdue', 'step-overdue']);
  });

  it('puts missed items before upcoming ones', () => {
    const r = run({
      todos: [
        todo({ id: 'soon', dueDate: new Date(2026, 8, 29, 17).toISOString() }),
        todo({ id: 'late', dueDate: new Date(2026, 8, 20).toISOString() }),
      ],
    });
    expect(r.map((x) => x.recordId)).toEqual(['late', 'soon']);
  });
});
