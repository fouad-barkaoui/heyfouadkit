import { describe, expect, it } from 'vitest';
import { countRecords } from './cloudSync';
import { emptyWorkspace, normalizeWorkspace } from './normalize';
import type { Workspace } from '@/lib/types';

/** A small hand-built workspace — enough shape to exercise counting and round-tripping. */
function fixtureWorkspace(): Workspace {
  const ws = emptyWorkspace();
  ws.badges.push({ id: 'bdg1', name: 'Reference', colorHex: '#6366f1', iconName: 'tag', category: 'general', createdAt: new Date().toISOString() });
  ws.notes.push({
    id: 'note1',
    title: 'Fixture note',
    content: '<p>hello</p>',
    tags: ['fixture'],
    isInteresting: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  ws.todos.push({
    id: 'todo1',
    title: 'Fixture task',
    description: '',
    priority: 'medium',
    status: 'backlog',
    startDate: null,
    dueDate: null,
    recurrence: 'none',
    isInteresting: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  ws.articles.push({
    id: 'art1',
    title: 'Fixture article',
    kind: 'written',
    content: '<p>body</p>',
    tags: [],
    fileUrl: null,
    fileName: null,
    fileType: null,
    fileSize: null,
    isInteresting: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  ws.courses.push({
    id: 'crs1',
    title: 'Fixture course',
    url: 'https://example.com',
    description: '',
    badgeId: null,
    progress: 10,
    isInteresting: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  ws.docs.push({
    id: 'doc1',
    title: 'Fixture doc',
    content: '<p>doc</p>',
    folder: 'General',
    badgeId: null,
    isInteresting: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  return ws;
}

describe('countRecords', () => {
  it('is zero for an empty workspace', () => {
    expect(countRecords(emptyWorkspace())).toBe(0);
  });

  it('counts every collection, attachments included', () => {
    const ws = emptyWorkspace();
    const fixture = fixtureWorkspace();
    const expected =
      fixture.badges.length +
      fixture.notes.length +
      fixture.todos.length +
      fixture.articles.length +
      fixture.courses.length +
      fixture.docs.length;
    expect(countRecords(fixture)).toBe(expected);

    ws.attachments.push({
      id: 'a1',
      ownerType: 'note',
      ownerId: 'n1',
      name: 'x.png',
      mimeType: 'image/png',
      size: 1,
      storagePath: null,
      dataUrl: null,
      createdAt: new Date().toISOString(),
    });
    expect(countRecords(ws)).toBe(1);
  });
});

describe('workspace round trip', () => {
  it('survives a serialise → normalise cycle unchanged', () => {
    const fixture = fixtureWorkspace();
    const round = normalizeWorkspace(JSON.parse(JSON.stringify(fixture)));
    expect(countRecords(round)).toBe(countRecords(fixture));
    expect(round.notes[0]?.title).toBe(fixture.notes[0]?.title);
    expect(round.todos.map((t) => t.status)).toEqual(fixture.todos.map((t) => t.status));
  });
});
