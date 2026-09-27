import * as Dialog from '@radix-ui/react-dialog';
import {
  BookMarked,
  CornerDownLeft,
  FileText,
  GraduationCap,
  ListChecks,
  Newspaper,
  NotebookPen,
  Pill,
  Search,
  Tag as TagIcon,
  type LucideIcon,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { buildIndex, searchIndex } from '@/lib/search';
import type { SearchHit } from '@/lib/types';
import { cn, relativeTime } from '@/lib/utils';
import { MODULE_MAP } from '@/modules/registry';
import { useUI } from '@/state/uiStore';
import { useWorkspace } from '@/state/workspaceStore';

const TYPE_ICON: Record<SearchHit['type'], LucideIcon> = {
  note: NotebookPen,
  todo: ListChecks,
  article: FileText,
  course: GraduationCap,
  doc: BookMarked,
  badge: TagIcon,
  news: Newspaper,
  medicine: Pill,
};

const FILTERS: { id: SearchHit['type'] | 'all'; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'note', label: 'Notes' },
  { id: 'todo', label: 'Tasks' },
  { id: 'article', label: 'Articles' },
  { id: 'course', label: 'Courses' },
  { id: 'doc', label: 'Docs' },
  { id: 'news', label: 'News' },
  { id: 'medicine', label: 'Medications' },
];

export function CommandPalette(): JSX.Element {
  const { paletteOpen, setPaletteOpen, requestFocus } = useUI();
  const { workspace } = useWorkspace();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<SearchHit['type'] | 'all'>('all');
  const [cursor, setCursor] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  const index = useMemo(() => buildIndex(workspace), [workspace]);
  const results = useMemo(() => {
    const hits = searchIndex(index, query);
    return filter === 'all' ? hits : hits.filter((h) => h.type === filter);
  }, [index, query, filter]);

  useEffect(() => {
    if (!paletteOpen) {
      setQuery('');
      setFilter('all');
    }
    setCursor(0);
  }, [paletteOpen]);

  useEffect(() => setCursor(0), [query, filter]);

  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-index="${cursor}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [cursor]);

  const open = (hit: SearchHit): void => requestFocus(hit.module, hit.id);

  return (
    <Dialog.Root open={paletteOpen} onOpenChange={setPaletteOpen}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-void/76 backdrop-blur-[3px] data-[state=open]:animate-[nx-fade_160ms_var(--ease-out-quint)_both]" />
        <Dialog.Content
          aria-label="Universal search"
          className="fixed left-1/2 top-[12vh] z-50 w-[calc(100vw-24px)] max-w-[620px] -translate-x-1/2 overflow-hidden rounded-[12px] bg-carbon shadow-[inset_0_0_0_1px_var(--color-graphite),0_4px_32px_rgba(8,9,10,0.75)] data-[state=open]:animate-[nx-scale-in_200ms_var(--ease-out-quint)_both]"
          onKeyDown={(event) => {
            if (event.key === 'ArrowDown') {
              event.preventDefault();
              setCursor((c) => Math.min(c + 1, Math.max(results.length - 1, 0)));
            } else if (event.key === 'ArrowUp') {
              event.preventDefault();
              setCursor((c) => Math.max(c - 1, 0));
            } else if (event.key === 'Enter') {
              const hit = results[cursor];
              if (hit) {
                event.preventDefault();
                open(hit);
              }
            }
          }}
        >
          <Dialog.Title className="sr-only">Universal search</Dialog.Title>

          <div className="flex items-center gap-2.5 border-b border-graphite px-4 py-3">
            <Search size={15} strokeWidth={1.7} className="shrink-0 text-ash" aria-hidden />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search notes, tasks, articles, courses, docs…"
              aria-label="Search everything"
              className="w-full bg-transparent text-[14.5px] text-paper outline-none placeholder:text-ash"
            />
            <kbd className="mono hidden rounded-[4px] bg-white/5 px-1.5 py-[2px] text-[10.5px] text-ash sm:block">
              ESC
            </kbd>
          </div>

          <div className="flex flex-wrap gap-1.5 border-b border-graphite px-4 py-2.5">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                className="pill"
                data-active={filter === f.id}
                onClick={() => setFilter(f.id)}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div ref={listRef} className="scroll-y max-h-[46vh] p-1.5">
            {results.length === 0 ? (
              <p className="px-3 py-8 text-center text-[13px] text-ash">
                {query ? `Nothing matches “${query}”.` : 'The workspace is empty.'}
              </p>
            ) : (
              results.map((hit, i) => {
                const Icon = TYPE_ICON[hit.type];
                return (
                  <button
                    key={`${hit.type}-${hit.id}`}
                    type="button"
                    data-index={i}
                    onMouseEnter={() => setCursor(i)}
                    onClick={() => open(hit)}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-[6px] px-2.5 py-2 text-left transition-colors duration-100',
                      i === cursor ? 'bg-obsidian' : 'hover:bg-[rgb(var(--tint-rgb)/0.03)]',
                    )}
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[6px] bg-[rgb(var(--tint-rgb)/0.04)] text-fog">
                      <Icon size={13.5} strokeWidth={1.7} aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13.5px] text-paper">{hit.title}</span>
                      <span className="block truncate text-[11.5px] text-ash">{hit.excerpt}</span>
                    </span>
                    <span className="mono hidden shrink-0 text-[10.5px] uppercase tracking-[0.06em] text-ash sm:block">
                      {MODULE_MAP[hit.module].short}
                    </span>
                    <span className="hidden shrink-0 text-[11px] text-ash/70 lg:block">
                      {relativeTime(hit.updatedAt)}
                    </span>
                  </button>
                );
              })
            )}
          </div>

          <div className="flex items-center justify-between border-t border-graphite bg-void/40 px-4 py-2 text-[11px] text-ash">
            <span className="num">{results.length} result{results.length === 1 ? '' : 's'}</span>
            <span className="flex items-center gap-1.5">
              <CornerDownLeft size={11} strokeWidth={1.8} aria-hidden />
              open · ↑↓ navigate
            </span>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
