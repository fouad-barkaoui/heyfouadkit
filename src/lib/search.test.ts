import { describe, expect, it } from 'vitest';
import { emptyWorkspace } from '@/data/normalize';
import { buildIndex, searchIndex } from './search';
import type { Workspace } from './types';

const iso = new Date().toISOString();

function fixture(): Workspace {
  return {
    ...emptyWorkspace(),
    notes: [
      {
        id: 'n1',
        title: 'Grok pattern notes',
        content: '<p>Filebeat multiline handling</p>',
        tags: ['elk'],
        isInteresting: false,
        createdAt: iso,
        updatedAt: iso,
      },
    ],
    todos: [
      {
        id: 't1',
        title: 'Rotate certificates',
        description: 'ingest node chain',
        priority: 'high',
        status: 'backlog',
        startDate: null,
        dueDate: null,
        recurrence: 'none',
        isInteresting: false,
        createdAt: iso,
        updatedAt: iso,
      },
    ],
    docs: [
      {
        id: 'd1',
        title: 'Grok reference',
        content: '<p>patterns</p>',
        folder: 'Reference',
        badgeId: null,
        isInteresting: false,
        createdAt: iso,
        updatedAt: iso,
      },
    ],
  };
}

describe('searchIndex', () => {
  const index = buildIndex(fixture());

  it('indexes every collection', () => {
    expect(searchIndex(index, '')).toHaveLength(3);
  });

  it('requires every term to match (AND, not OR)', () => {
    expect(searchIndex(index, 'grok pattern').map((h) => h.id).sort()).toEqual(['d1', 'n1']);
    expect(searchIndex(index, 'grok rotate')).toHaveLength(0);
  });

  it('searches body text and tags, not just titles', () => {
    expect(searchIndex(index, 'filebeat').map((h) => h.id)).toEqual(['n1']);
    expect(searchIndex(index, 'elk').map((h) => h.id)).toEqual(['n1']);
    expect(searchIndex(index, 'chain').map((h) => h.id)).toEqual(['t1']);
  });

  it('ranks a title prefix above a body match', () => {
    const hits = searchIndex(index, 'grok');
    expect(hits[0]?.title.toLowerCase().startsWith('grok')).toBe(true);
  });

  it('maps hits back to the module that owns them', () => {
    expect(searchIndex(index, 'rotate')[0]?.module).toBe('todo');
    expect(searchIndex(index, 'reference')[0]?.module).toBe('docs');
  });
});
