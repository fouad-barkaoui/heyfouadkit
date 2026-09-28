import {
  BookMarked,
  BookmarkPlus,
  FileText,
  GraduationCap,
  ListChecks,
  Newspaper,
  NotebookPen,
  Pill,
  Star,
  type LucideIcon,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { useStagger } from '@/components/motion/ViewTransition';
import { ModuleLayout } from '@/components/shell/ModuleLayout';
import { Button, IconButton } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import type { CollectionKey, ItemType, ModuleId } from '@/lib/types';
import { cn, excerpt, relativeTime } from '@/lib/utils';
import { useUI } from '@/state/uiStore';
import { useWorkspace } from '@/state/workspaceStore';

interface VaultItem {
  id: string;
  collection: CollectionKey;
  type: ItemType;
  module: ModuleId;
  title: string;
  body: string;
  updatedAt: string;
}

const TYPE_META: Record<ItemType, { label: string; icon: LucideIcon; color: string }> = {
  note: { label: 'Note', icon: NotebookPen, color: '#6366f1' },
  todo: { label: 'Task', icon: ListChecks, color: '#e4f222' },
  article: { label: 'Article', icon: FileText, color: '#12a3b0' },
  course: { label: 'Course', icon: GraduationCap, color: '#8b5cf6' },
  doc: { label: 'Document', icon: BookMarked, color: '#dd6a4e' },
  news: { label: 'News', icon: Newspaper, color: '#02b8cc' },
  medicine: { label: 'Medicine', icon: Pill, color: '#27a644' },
  link: { label: 'Saved link', icon: BookmarkPlus, color: '#f59e0b' },
};

const FILTERS: { id: ItemType | 'all'; label: string }[] = [
  { id: 'all', label: 'Everything' },
  { id: 'note', label: 'Notes' },
  { id: 'todo', label: 'Tasks' },
  { id: 'article', label: 'Articles' },
  { id: 'course', label: 'Courses' },
  { id: 'doc', label: 'Documents' },
  { id: 'news', label: 'News' },
  { id: 'link', label: 'Links' },
];

export function VaultModule(): JSX.Element {
  const { workspace, toggleInteresting } = useWorkspace();
  const { requestFocus, setModule } = useUI();
  const [filter, setFilter] = useState<ItemType | 'all'>('all');
  const [query, setQuery] = useState('');

  const items = useMemo<VaultItem[]>(() => {
    const rows: VaultItem[] = [
      ...workspace.notes
        .filter((n) => n.isInteresting)
        .map((n) => ({
          id: n.id,
          collection: 'notes' as const,
          type: 'note' as const,
          module: 'notebook' as const,
          title: n.title || 'Untitled note',
          body: excerpt(n.content, 150),
          updatedAt: n.updatedAt,
        })),
      ...workspace.todos
        .filter((t) => t.isInteresting)
        .map((t) => ({
          id: t.id,
          collection: 'todos' as const,
          type: 'todo' as const,
          module: 'todo' as const,
          title: t.title,
          body: t.description,
          updatedAt: t.updatedAt,
        })),
      ...workspace.articles
        .filter((a) => a.isInteresting)
        .map((a) => ({
          id: a.id,
          collection: 'articles' as const,
          type: 'article' as const,
          module: 'articles' as const,
          title: a.title,
          body: excerpt(a.content, 150) || a.fileName || '',
          updatedAt: a.updatedAt,
        })),
      ...workspace.courses
        .filter((c) => c.isInteresting)
        .map((c) => ({
          id: c.id,
          collection: 'courses' as const,
          type: 'course' as const,
          module: 'courses' as const,
          title: c.title,
          body: c.description,
          updatedAt: c.updatedAt,
        })),
      ...workspace.docs
        .filter((d) => d.isInteresting)
        .map((d) => ({
          id: d.id,
          collection: 'docs' as const,
          type: 'doc' as const,
          module: 'docs' as const,
          title: d.title,
          body: excerpt(d.content, 150),
          updatedAt: d.updatedAt,
        })),
      ...workspace.news
        .filter((n) => n.isInteresting)
        .map((n) => ({
          id: n.id,
          collection: 'news' as const,
          type: 'news' as const,
          module: 'news' as const,
          title: n.title,
          body: excerpt(n.content, 150),
          updatedAt: n.updatedAt,
        })),
      ...workspace.links
        .filter((l) => l.isInteresting && !l.isDeleted)
        .map((l) => ({
          id: l.id,
          collection: 'links' as const,
          type: 'link' as const,
          module: 'saveit' as const,
          title: l.title,
          body: l.description || l.url,
          updatedAt: l.updatedAt,
        })),
    ];

    const q = query.trim().toLowerCase();
    return rows
      .filter((r) => filter === 'all' || r.type === filter)
      .filter((r) => !q || r.title.toLowerCase().includes(q) || r.body.toLowerCase().includes(q))
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [workspace, filter, query]);

  const counts = useMemo(() => {
    const map = new Map<ItemType, number>();
    for (const item of items) map.set(item.type, (map.get(item.type) ?? 0) + 1);
    return map;
  }, [items]);

  const gridRef = useStagger([filter, query, items.length]);

  return (
    <ModuleLayout
      panelTitle="Vault"
      panelCount={items.length}
      panelSearch={{ value: query, onChange: setQuery, placeholder: 'Search the vault…' }}
      panel={
        <div>
          <p className="mb-2 px-1 text-[10.5px] font-medium uppercase tracking-[0.08em] text-ash/70">Collections</p>
          {FILTERS.map((f) => {
            const meta = f.id === 'all' ? null : TYPE_META[f.id];
            const Icon = meta?.icon ?? Star;
            const count = f.id === 'all' ? items.length : (counts.get(f.id) ?? 0);
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilter(f.id)}
                data-active={filter === f.id}
                className="nav-row mb-[2px] text-[12.5px]"
              >
                <Icon size={14} strokeWidth={1.7} aria-hidden style={meta ? { color: meta.color } : undefined} />
                <span className="flex-1 truncate text-left">{f.label}</span>
                <span className="mono num text-[10.5px] text-ash">{count}</span>
              </button>
            );
          })}

          <p className="mt-4 px-1 text-[11.5px] leading-[1.55] text-ash/80">
            Anything starred anywhere in the workspace surfaces here. Unstar it and it leaves.
          </p>
        </div>
      }
      title="Vault"
      subtitle={<span className="num">{items.length} curated item{items.length === 1 ? '' : 's'}</span>}
      detailOpenOnMobile
    >
      {items.length === 0 ? (
        <EmptyState
          icon={<Star size={18} strokeWidth={1.6} />}
          title={query || filter !== 'all' ? 'Nothing matches this filter' : 'The vault is empty'}
          hint="Star a note, task, article, course or document anywhere in the workspace and it appears here."
          action={<Button onClick={() => setModule('notebook')}>Go to the notebook</Button>}
        />
      ) : (
        <div ref={gridRef} className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => {
            const meta = TYPE_META[item.type];
            const Icon = meta.icon;
            return (
              <article
                key={`${item.type}-${item.id}`}
                data-stagger
                className={cn(
                  'group relative flex cursor-pointer flex-col overflow-hidden rounded-[10px] bg-[rgb(var(--tint-rgb)/0.022)] p-4 pt-5',
                  'shadow-[inset_0_0_0_1px_var(--color-graphite)] transition-[background-color,box-shadow] duration-150',
                  'hover:bg-[rgb(var(--tint-rgb)/0.042)] hover:shadow-[inset_0_0_0_1px_var(--color-smoke)]',
                )}
                onClick={() => requestFocus(item.module, item.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') requestFocus(item.module, item.id);
                }}
              >
                {/* corner ribbon — the curated marker from the reference cards */}
                <span
                  aria-hidden
                  className="pointer-events-none absolute -right-[34px] top-[14px] w-[124px] rotate-45 py-[3px] text-center text-[9.5px] font-medium uppercase tracking-[0.1em]"
                  style={{
                    background: `linear-gradient(90deg, ${meta.color}22, ${meta.color}33)`,
                    color: meta.color,
                    boxShadow: `inset 0 0 0 1px ${meta.color}40`,
                  }}
                >
                  {meta.label}
                </span>

                <div className="mb-2.5 flex items-center gap-2">
                  <span
                    className="flex h-6 w-6 items-center justify-center rounded-[6px]"
                    style={{ background: `${meta.color}1f`, color: meta.color }}
                  >
                    <Icon size={12.5} strokeWidth={1.8} aria-hidden />
                  </span>
                  <span className="text-[11px] text-ash">{relativeTime(item.updatedAt)}</span>
                </div>

                <h3 className="pr-10 text-[14px] font-medium leading-[1.35] tracking-[-0.012em] text-paper">
                  {item.title}
                </h3>
                {item.body ? (
                  <p className="mt-1.5 line-clamp-3 text-[12.5px] leading-[1.55] text-ash">{item.body}</p>
                ) : null}

                <div className="mt-auto flex items-center justify-between pt-4">
                  <span className="text-[11.5px] text-ash transition-colors group-hover:text-mist">
                    Open in {meta.label.toLowerCase()}s →
                  </span>
                  <IconButton
                    label="Remove from vault"
                    className="h-6 w-6 text-accent"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleInteresting(item.collection, item.id);
                    }}
                  >
                    <Star size={12.5} strokeWidth={1.9} fill="currentColor" />
                  </IconButton>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </ModuleLayout>
  );
}
