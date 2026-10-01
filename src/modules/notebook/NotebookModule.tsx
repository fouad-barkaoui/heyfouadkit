import { Check, NotebookPen, Plus, Star } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { AttachmentPanel } from '@/components/attachments/AttachmentPanel';
import { ConfirmDelete } from '@/components/ui/ConfirmDelete';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button, IconButton } from '@/components/ui/Button';
import { TagInput } from '@/components/ui/TagInput';
import { RichEditor } from '@/components/editor/RichEditor';
import { ModuleLayout } from '@/components/shell/ModuleLayout';
import { PanelItem } from '@/components/shell/PanelItem';
import { useStagger } from '@/components/motion/ViewTransition';
import type { Note } from '@/lib/types';
import {
  cn,
  excerpt,
  isWideViewport,
  nowISO,
  refCode,
  stripHtml,
  uid,
  wordCount,
} from '@/lib/utils';
import { useLanguage } from '@/state/languageStore';
import { useUI } from '@/state/uiStore';
import { useRequireAuth } from '@/state/useRequireAuth';
import { useWorkspace } from '@/state/workspaceStore';

const DRAFT_ID = '__draft__';

const emptyDraft = (): Note => ({
  id: DRAFT_ID,
  title: '',
  content: '',
  tags: [],
  isInteresting: false,
  createdAt: nowISO(),
  updatedAt: nowISO(),
});

type T = (key: string, vars?: Record<string, string | number>) => string;

/** Same buckets as lib/utils relativeTime, in the current language. */
function agoLabel(iso: string, t: T, locale: string): string {
  const time = new Date(iso).getTime();
  if (Number.isNaN(time)) return '—';
  const mins = Math.round((Date.now() - time) / 60_000);
  if (mins < 1) return t('trash.ago.now');
  if (mins < 60) return t('trash.ago.minutes', { count: mins });
  const hours = Math.round(mins / 60);
  if (hours < 24) return t('trash.ago.hours', { count: hours });
  const days = Math.round(hours / 24);
  if (days < 30) return t('trash.ago.days', { count: days });
  return new Date(iso).toLocaleDateString(locale, { month: 'short', day: 'numeric', year: 'numeric' });
}

/** Same buckets as lib/utils groupByDay (Today / Yesterday / N days ago / date), translated. */
function groupNotesByDay(items: Note[], t: T, locale: string): [string, Note[]][] {
  const start = (x: Date): number => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const map = new Map<string, Note[]>();
  for (const item of items) {
    const d = new Date(item.updatedAt);
    const delta = Math.round((start(new Date()) - start(d)) / 86_400_000);
    const key =
      delta <= 0
        ? t('nb.day.today')
        : delta === 1
          ? t('nb.day.yesterday')
          : delta < 7
            ? t('nb.day.daysAgo', { count: delta })
            : d.toLocaleDateString(locale, { month: 'short', day: 'numeric', year: 'numeric' });
    const bucket = map.get(key);
    if (bucket) bucket.push(item);
    else map.set(key, [item]);
  }
  return [...map.entries()];
}

/** A draft is only worth a database row once it actually holds something. */
const isMeaningful = (n: Note): boolean =>
  n.title.trim().length > 0 || stripHtml(n.content).length > 0 || n.tags.length > 0;

export function NotebookModule(): JSX.Element {
  const { workspace, createRecord, updateRecord, toggleInteresting } = useWorkspace();
  const { focusRequest, clearFocus } = useUI();
  const requireAuth = useRequireAuth();
  const { t, locale } = useLanguage();
  const notes = useMemo(() => workspace.notes.filter((n) => !n.isDeleted), [workspace.notes]);

  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(() => (isWideViewport() ? (notes[0]?.id ?? null) : null));
  const [draft, setDraft] = useState<Note | null>(null);

  useEffect(() => {
    if (focusRequest?.module === 'notebook') {
      setSelectedId(focusRequest.id);
      setDraft(null);
      clearFocus();
    }
  }, [focusRequest, clearFocus]);

  const sorted = useMemo(
    () => [...notes].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()),
    [notes],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sorted;
    return sorted.filter(
      (n) =>
        n.title.toLowerCase().includes(q) ||
        stripHtml(n.content).toLowerCase().includes(q) ||
        n.tags.some((tag) => tag.includes(q)),
    );
  }, [sorted, query]);

  const grouped = useMemo(() => groupNotesByDay(filtered, t, locale), [filtered, t, locale]);
  const panelRef = useStagger([query, notes.length]);

  const active: Note | null = draft ?? sorted.find((n) => n.id === selectedId) ?? null;

  /** Writes go straight through; a draft is committed the moment it has content. */
  const patch = (changes: Partial<Note>): void => {
    if (!active) return;

    if (active.id === DRAFT_ID) {
      const next = { ...active, ...changes };
      if (isMeaningful(next)) {
        const id = uid('note');
        createRecord('notes', { ...next, id, createdAt: nowISO(), updatedAt: nowISO() });
        setDraft(null);
        setSelectedId(id);
        return;
      }
      setDraft(next);
      return;
    }

    updateRecord('notes', active.id, changes);
  };

  const startDraft = (): void => {
    if (!requireAuth()) return;
    setDraft(emptyDraft());
    setSelectedId(DRAFT_ID);
  };

  /** Attaching a file is itself content, so it commits the draft first. */
  const ensureOwnerId = (): string => {
    if (!active) return '';
    if (active.id !== DRAFT_ID) return active.id;
    const id = uid('note');
    createRecord('notes', {
      ...active,
      id,
      title: active.title.trim() || t('nb.untitled'),
      createdAt: nowISO(),
      updatedAt: nowISO(),
    });
    setDraft(null);
    setSelectedId(id);
    return id;
  };

  /** Soft delete — moves the note to Trash instead of destroying it outright. */
  const removeNote = (id: string): void => {
    updateRecord('notes', id, { isDeleted: true, deletedAt: nowISO() });
    if (selectedId === id) setSelectedId(sorted.find((n) => n.id !== id)?.id ?? null);
  };

  const panel = (
    <div ref={panelRef}>
      {filtered.length === 0 ? (
        <p className="px-2.5 py-6 text-[12.5px] text-ash">{query ? t('nb.noMatch') : t('nb.noNotes')}</p>
      ) : (
        grouped.map(([bucket, items]) => (
          <div key={bucket} className="mb-3">
            <p className="px-2.5 pb-1.5 pt-1 text-[10.5px] font-medium uppercase tracking-[0.08em] text-ash/70">
              {bucket}
            </p>
            {items.map((note) => (
              <PanelItem
                key={note.id}
                active={note.id === selectedId}
                title={note.title || t('nb.untitled')}
                starred={note.isInteresting}
                onToggleStar={() => toggleInteresting('notes', note.id)}
                onSelect={() => {
                  setDraft(null);
                  setSelectedId(note.id);
                }}
                meta={
                  <>
                    <span className="mono text-[10.5px] text-ash/80">{refCode('NOTE', note.id)}</span>
                    <span aria-hidden>·</span>
                    <span>{agoLabel(note.updatedAt, t, locale)}</span>
                  </>
                }
                footer={
                  note.tags.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {note.tags.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className="rounded-[4px] bg-[rgb(var(--tint-rgb)/0.05)] px-1.5 py-[1px] text-[10.5px] text-fog"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  ) : null
                }
              />
            ))}
          </div>
        ))
      )}
    </div>
  );

  return (
    <ModuleLayout
      panelTitle={t('nb.title')}
      panelCount={notes.length}
      panelActions={
        <IconButton label={t('nb.newNote')} onClick={startDraft}>
          <Plus size={15} strokeWidth={1.9} />
        </IconButton>
      }
      panelSearch={{ value: query, onChange: setQuery, placeholder: t('nb.search') }}
      panel={panel}
      title={active ? active.title || t('nb.untitled') : t('nb.title')}
      subtitle={
        active ? (
          <span className="flex flex-wrap items-center gap-2">
            <span className="mono text-[11px]">{refCode('NOTE', active.id)}</span>
            <span aria-hidden>·</span>
            <span className="num">{t('nb.words', { count: wordCount(active.content) })}</span>
            <span aria-hidden>·</span>
            <span>{t('nb.edited', { when: agoLabel(active.updatedAt, t, locale) })}</span>
            {active.id === DRAFT_ID ? (
              <span className="rounded-[4px] bg-[rgb(var(--tint-rgb)/0.06)] px-1.5 py-[1px] text-[11px] text-ash">
                {t('nb.draft')}
              </span>
            ) : null}
          </span>
        ) : null
      }
      actions={
        active ? (
          <>
            {/* Notes save as you type; this just confirms it and closes. */}
            <Button
              variant="primary"
              icon={<Check size={14} strokeWidth={2.2} />}
              onClick={() => {
                setSelectedId(null);
                setDraft(null);
              }}
            >
              {t('nb.save')}
            </Button>
            <IconButton
              label={active.isInteresting ? t('nb.removeVault') : t('nb.addVault')}
              className={cn(active.isInteresting && 'text-accent')}
              onClick={() => {
                if (active.id !== DRAFT_ID) toggleInteresting('notes', active.id);
              }}
            >
              <Star size={15} strokeWidth={1.8} fill={active.isInteresting ? 'currentColor' : 'none'} />
            </IconButton>
            {active.id !== DRAFT_ID ? <ConfirmDelete label={t('nb.delete')} onConfirm={() => removeNote(active.id)} /> : null}
          </>
        ) : (
          <Button variant="primary" icon={<Plus size={14} strokeWidth={2} />} onClick={startDraft}>
            {t('nb.newNote')}
          </Button>
        )
      }
      detailOpenOnMobile={active !== null}
      onMobileBack={() => {
        setSelectedId(null);
        setDraft(null);
      }}
    >
      {active ? (
        <div className="mx-auto flex max-w-[820px] flex-col md:h-full">
          <input
            value={active.title}
            onChange={(e) => patch({ title: e.target.value })}
            placeholder={t('nb.untitled')}
            aria-label={t('nb.noteTitle')}
            className="mb-3 w-full bg-transparent text-[26px] font-medium leading-[1.15] tracking-[-0.022em] text-paper outline-none placeholder:text-ash/50"
          />
          <TagInput tags={active.tags} onChange={(tags) => patch({ tags })} className="mb-4" />
          <RichEditor
            key={active.id}
            value={active.content}
            onChange={(content) => patch({ content })}
            placeholder={t('nb.placeholder')}
            className="min-h-0 flex-1"
            minHeight={280}
          />

          <AttachmentPanel ownerType="note" ownerId={active.id} ensureOwnerId={ensureOwnerId} className="mt-4" />
        </div>
      ) : (
        <EmptyState
          icon={<NotebookPen size={18} strokeWidth={1.6} />}
          title={t('nb.nothingSelected')}
          hint={
            notes.length === 0
              ? t('nb.emptyHint')
              : t('nb.pickHint')
          }
          action={
            <Button variant="primary" icon={<Plus size={14} strokeWidth={2} />} onClick={startDraft}>
              {t('nb.newNote')}
            </Button>
          }
        />
      )}
    </ModuleLayout>
  );
}

export const notePreview = (note: Note): string => excerpt(note.content, 90);
