import { describe, expect, it } from 'vitest';
import { emptyWorkspace } from './normalize';
import { applyOutbox, coalesce, type OutboxOp } from './outbox';

const base = { teamId: 't1', userId: 'u1', key: 'todos' as const };

describe('outbox coalescing', () => {
  it('folds patches into a queued insert, keeping its place', () => {
    let q: OutboxOp[] = [];
    q = coalesce(q, { ...base, id: 'a', kind: 'upsert', record: { id: 'a', title: 'x' } }, 1);
    q = coalesce(q, { ...base, id: 'b', kind: 'upsert', record: { id: 'b', title: 'y' } }, 2);
    q = coalesce(q, { ...base, id: 'a', kind: 'patch', patch: { title: 'x2' } }, 3);
    expect(q).toHaveLength(2);
    expect(q[0]).toMatchObject({ id: 'a', kind: 'upsert', seq: 1, record: { title: 'x2' } });
  });

  it('merges successive patches and lets a delete win', () => {
    let q: OutboxOp[] = [];
    q = coalesce(q, { ...base, id: 'a', kind: 'patch', patch: { title: '1' } }, 1);
    q = coalesce(q, { ...base, id: 'a', kind: 'patch', patch: { status: 'completed' } }, 2);
    expect(q[0]).toMatchObject({ kind: 'patch', patch: { title: '1', status: 'completed' } });
    q = coalesce(q, { ...base, id: 'a', kind: 'delete' }, 3);
    expect(q).toEqual([expect.objectContaining({ kind: 'delete', id: 'a', seq: 1 })]);
  });

  it('keeps different teams apart', () => {
    let q: OutboxOp[] = [];
    q = coalesce(q, { ...base, id: 'a', kind: 'patch', patch: { title: '1' } }, 1);
    q = coalesce(q, { ...base, teamId: 't2', id: 'a', kind: 'patch', patch: { title: '2' } }, 2);
    expect(q).toHaveLength(2);
  });
});

describe('applyOutbox', () => {
  it('shows unsent changes over a fresh snapshot', () => {
    const ws = { ...emptyWorkspace(), todos: [{ id: 'a', title: 'old' }, { id: 'b', title: 'gone' }] } as never;
    const q: OutboxOp[] = [
      { ...base, seq: 1, id: 'a', kind: 'patch', patch: { title: 'new' } },
      { ...base, seq: 2, id: 'b', kind: 'delete' },
      { ...base, seq: 3, id: 'c', kind: 'upsert', record: { id: 'c', title: 'offline' } },
      { ...base, teamId: 'other', seq: 4, id: 'a', kind: 'delete' },
    ];
    const out = applyOutbox(ws, q, 't1');
    expect(out.todos.map((t) => [t.id, t.title])).toEqual([
      ['c', 'offline'],
      ['a', 'new'],
    ]);
  });
});
