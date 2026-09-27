import { describe, expect, it } from 'vitest';
import type { Todo } from '@/lib/types';
import { dueInfo, matrixQuadrant, PRIORITY_WEIGHT } from './taskMeta';

const at = (days: number): string => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(17, 0, 0, 0);
  return d.toISOString();
};

const todo = (over: Partial<Todo> = {}): Todo => ({
  id: 't',
  title: 'Task',
  description: '',
  priority: 'medium',
  status: 'backlog',
  startDate: null,
  dueDate: null,
  recurrence: 'none',
  isInteresting: false,
  createdAt: at(-10),
  updatedAt: at(-10),
  ...over,
});

describe('dueInfo', () => {
  it('returns nothing without a due date', () => {
    expect(dueInfo(todo())).toBeNull();
  });

  it('flags an overdue task', () => {
    const info = dueInfo(todo({ dueDate: at(-3) }));
    expect(info?.overdue).toBe(true);
    expect(info?.label).toBe('3d overdue');
    expect(info?.tone).toBe('danger');
  });

  it('names today and tomorrow', () => {
    expect(dueInfo(todo({ dueDate: at(0) }))?.label).toBe('Due today');
    expect(dueInfo(todo({ dueDate: at(1) }))?.label).toBe('Due tomorrow');
  });

  it('never marks a completed task overdue', () => {
    expect(dueInfo(todo({ dueDate: at(-5), status: 'completed' }))?.overdue).toBe(false);
  });
});

describe('matrixQuadrant', () => {
  it('puts an important, urgent task in Do first', () => {
    expect(matrixQuadrant(todo({ priority: 'critical', dueDate: at(0) }))).toBe(0);
  });

  it('puts an important, non-urgent task in Schedule', () => {
    expect(matrixQuadrant(todo({ priority: 'high', dueDate: at(20) }))).toBe(1);
  });

  it('puts an unimportant, urgent task in Delegate', () => {
    expect(matrixQuadrant(todo({ priority: 'low', dueDate: at(-1) }))).toBe(2);
  });

  it('puts everything else in Eliminate', () => {
    expect(matrixQuadrant(todo({ priority: 'low' }))).toBe(3);
  });
});

describe('PRIORITY_WEIGHT', () => {
  it('orders critical above the rest', () => {
    expect(PRIORITY_WEIGHT.critical).toBeGreaterThan(PRIORITY_WEIGHT.high);
    expect(PRIORITY_WEIGHT.high).toBeGreaterThan(PRIORITY_WEIGHT.medium);
    expect(PRIORITY_WEIGHT.medium).toBeGreaterThan(PRIORITY_WEIGHT.low);
  });
});
