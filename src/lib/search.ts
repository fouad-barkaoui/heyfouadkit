import type { ModuleId, SearchHit, Workspace } from './types';
import { excerpt, stripHtml } from './utils';

interface IndexRow extends SearchHit {
  haystack: string;
}

export function buildIndex(workspace: Workspace): IndexRow[] {
  const rows: IndexRow[] = [];

  const push = (
    id: string,
    type: SearchHit['type'],
    module: ModuleId,
    title: string,
    body: string,
    extra: string,
    updatedAt: string,
  ): void => {
    rows.push({
      id,
      type,
      module,
      title,
      excerpt: excerpt(body, 120) || '—',
      updatedAt,
      haystack: `${title} ${stripHtml(body)} ${extra}`.toLowerCase(),
    });
  };

  for (const n of workspace.notes) {
    push(n.id, 'note', 'notebook', n.title, n.content, n.tags.join(' '), n.updatedAt);
  }
  for (const t of workspace.todos) {
    push(t.id, 'todo', 'todo', t.title, t.description, `${t.priority} ${t.status}`, t.updatedAt);
  }
  for (const a of workspace.articles) {
    push(a.id, 'article', 'articles', a.title, a.content, `${a.tags.join(' ')} ${a.fileName ?? ''}`, a.updatedAt);
  }
  for (const c of workspace.courses) {
    push(c.id, 'course', 'courses', c.title, c.description, c.url, c.updatedAt);
  }
  for (const d of workspace.docs) {
    push(d.id, 'doc', 'docs', d.title, d.content, d.folder, d.updatedAt);
  }
  for (const b of workspace.badges) {
    push(b.id, 'badge', b.category === 'doc' ? 'docs' : 'courses', b.name, '', b.category, b.createdAt);
  }
  for (const n of workspace.news) {
    push(n.id, 'news', 'news', n.title, n.content, `${n.stage} ${n.tags.join(' ')}`, n.updatedAt);
  }
  for (const m of workspace.medicines) {
    push(m.id, 'medicine', 'medications', m.name, '', `${m.dosage} ${m.unit} ${m.type}`, m.updatedAt);
  }
  for (const p of workspace.treatmentPlans) {
    push(p.id, 'medicine', 'medications', p.condition, '', p.prescriber, p.updatedAt);
  }

  for (const l of workspace.links) {
    if (l.isDeleted) continue;
    push(l.id, 'link', 'saveit', l.title, l.description || l.note, `${l.url} ${l.domain} ${l.kind} ${l.collection} ${l.tags.join(' ')} ${l.note}`, l.updatedAt);
  }

  for (const h of workspace.habits) {
    if (h.isDeleted) continue;
    push(h.id, 'habit', 'habits', `${h.emoji} ${h.name}`, '', 'habit streak', h.updatedAt);
  }
  for (const g of workspace.goals) {
    if (g.isDeleted) continue;
    push(g.id, 'goal', 'habits', `${g.emoji} ${g.title}`, g.why, g.steps.map((s) => s.title).join(' '), g.updatedAt);
  }

  return rows;
}

/** Every term must appear somewhere in the row — AND semantics, not OR. */
export function searchIndex(rows: IndexRow[], query: string, limit = 40): SearchHit[] {
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const pool = terms.length === 0 ? rows : rows.filter((r) => terms.every((t) => r.haystack.includes(t)));

  const scored = pool
    .map((row) => {
      const title = row.title.toLowerCase();
      let score = 0;
      for (const t of terms) {
        if (title.startsWith(t)) score += 6;
        else if (title.includes(t)) score += 3;
        else score += 1;
      }
      return { row, score, time: new Date(row.updatedAt).getTime() };
    })
    .sort((a, b) => b.score - a.score || b.time - a.time)
    .slice(0, limit);

  return scored.map(({ row }) => ({
    id: row.id,
    type: row.type,
    module: row.module,
    title: row.title,
    excerpt: row.excerpt,
    updatedAt: row.updatedAt,
  }));
}
