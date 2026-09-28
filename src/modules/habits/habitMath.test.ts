import { describe, expect, it } from 'vitest';
import type { Goal, Todo } from '@/lib/types';
import { bestStreak, completionRate, currentStreak, dayKey, goalProgress, toggleDay, yearGrid } from './habitMath';

// Wed 2026-09-30
const TODAY = new Date(2026, 8, 30);

describe('streaks', () => {
  it('counts back from today, and today not being ticked yet does not break it', () => {
    const h = { days: [], log: ['2026-09-27', '2026-09-28', '2026-09-29'] };
    expect(currentStreak(h, TODAY)).toBe(3);
    expect(currentStreak({ ...h, log: [...h.log, '2026-09-30'] }, TODAY)).toBe(4);
  });
  it('skips unscheduled days instead of breaking the streak', () => {
    // Mon/Wed/Fri habit (1,3,5): Fri 25, Mon 28, Wed 30 done
    const h = { days: [1, 3, 5], log: ['2026-09-25', '2026-09-28', '2026-09-30'] };
    expect(currentStreak(h, TODAY)).toBe(3);
  });
  it('a missed scheduled day resets it; best streak remembers the record', () => {
    const h = { days: [], log: ['2026-09-20', '2026-09-21', '2026-09-22', '2026-09-23', '2026-09-29'] };
    expect(currentStreak(h, TODAY)).toBe(1);
    expect(bestStreak(h)).toBe(4);
  });
  it('rates the last 30 days and toggles days', () => {
    expect(completionRate({ days: [], log: [dayKey(TODAY)] }, 10, TODAY)).toBe(10);
    expect(toggleDay(['2026-09-01'], '2026-09-01')).toEqual([]);
    expect(toggleDay([], '2026-09-02')).toEqual(['2026-09-02']);
  });
});

describe('year grid', () => {
  it('is 53 weeks of 7 days ending this week, counting check-ins', () => {
    const grid = yearGrid([{ days: [], log: ['2026-09-30'], createdAt: '' }], TODAY);
    expect(grid).toHaveLength(53);
    expect(grid.every((c) => c.length === 7)).toBe(true);
    const cell = grid.flat().find((c) => c.key === '2026-09-30');
    expect(cell?.count).toBe(1);
    expect(grid.flat().find((c) => c.key === '2026-10-02')?.inRange).toBe(false);
  });
});

describe('goals', () => {
  it('counts a step done when its linked task is completed in Tasks', () => {
    const goal = {
      steps: [
        { id: 'a', title: 'A', done: true, todoId: null, dueDate: null },
        { id: 'b', title: 'B', done: false, todoId: 't1', dueDate: null },
        { id: 'c', title: 'C', done: false, todoId: null, dueDate: null },
      ],
    } as Goal;
    const todos = [{ id: 't1', status: 'completed' }] as Todo[];
    expect(goalProgress(goal, todos)).toEqual({ done: 2, total: 3, pct: 67 });
  });
});
