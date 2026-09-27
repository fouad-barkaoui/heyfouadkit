import { describe, expect, it } from 'vitest';
import { normalizeArticle, normalizeNote, normalizeTodo, normalizeWorkspace } from './normalize';

describe('normalizeNote', () => {
  it('repairs a legacy record that predates tags/updatedAt', () => {
    const legacy = { id: 'n1', title: 'Old note', content: '<p>x</p>' };
    const note = normalizeNote(legacy);
    expect(note.tags).toEqual([]);
    expect(note.updatedAt).toBe(note.createdAt);
    expect(note.isInteresting).toBe(false);
  });

  it('drops non-string entries from tags', () => {
    const note = normalizeNote({ id: 'n2', tags: ['ok', 3, null, 'fine'] });
    expect(note.tags).toEqual(['ok', 'fine']);
  });
});

describe('normalizeTodo', () => {
  it('falls back to safe enum values', () => {
    const todo = normalizeTodo({ id: 't1', priority: 'urgent', status: 'doing', recurrence: 'hourly' });
    expect(todo.priority).toBe('medium');
    expect(todo.status).toBe('backlog');
    expect(todo.recurrence).toBe('none');
  });

  it('keeps valid values untouched', () => {
    const todo = normalizeTodo({ id: 't2', priority: 'critical', status: 'completed', dueDate: '2026-01-01' });
    expect(todo.priority).toBe('critical');
    expect(todo.status).toBe('completed');
    expect(todo.dueDate).toBe('2026-01-01');
  });
});

describe('normalizeArticle', () => {
  it('infers kind from the stored file type when kind is missing', () => {
    expect(normalizeArticle({ id: 'a1', fileType: 'application/pdf' }).kind).toBe('pdf');
    expect(normalizeArticle({ id: 'a2', fileType: 'image/png' }).kind).toBe('image');
    expect(normalizeArticle({ id: 'a3' }).kind).toBe('written');
  });
});

describe('normalizeWorkspace', () => {
  it('survives garbage input instead of throwing', () => {
    const ws = normalizeWorkspace('not an object');
    expect(ws.notes).toEqual([]);
    expect(ws.badges).toEqual([]);
  });

  it('skips non-object rows inside a collection', () => {
    const ws = normalizeWorkspace({ notes: [{ id: 'n1' }, null, 'bad', 7] });
    expect(ws.notes).toHaveLength(1);
    expect(ws.notes[0]?.id).toBe('n1');
  });
});
