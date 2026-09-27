import { NotebookPen, Plus, Star } from 'lucide-react';
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
  groupByDay,
  isWideViewport,
  nowISO,
  refCode,
  relativeTime,
  stripHtml,
  uid,
  wordCount,
} from '@/lib/utils';
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

/** A draft is only worth a database row once it actually holds something. */
const isMeaningful = (n: Note): boolean =>
  n.title.trim().length > 0 || stripHtml(n.content).length > 0 || n.tags.length > 0;

export function NotebookModule(): JSX.Element {
  const { workspace, createRecord, updateRecord, toggleInteresting } = useWorkspace();
  const { focusRequest, clearFocus } = useUI();
  const requireAuth = useRequireAuth();
  const notes = useMemo(() => workspace.notes.filter((n) => !n.isDeleted), [workspace.notes]);

  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(() =>
    isWideViewport() ? (notes[0]?.id ?? null) : null,
  );
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
        n.tags.some((t) => t.includes(q)),
    );
  }, [sorted, query]);

  const grouped = useMemo(() => groupByDay(filtered, (n) => n.updatedAt), [filtered]);
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
      title: active.title.trim() || 'Untitled note',
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
        <p className="px-2.5 py-6 text-[12.5px] text-ash">
          {query ? 'No note matches that.' : 'No notes yet.'}
        </p>
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
                title={note.title || 'Untitled note'}
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
                    <span>{relativeTime(note.updatedAt)}</span>
                  </>
                }
                footer={
                  note.tags.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {note.tags.slice(0, 3).map((t) => (
                        <span key={t} className="rounded-[4px] bg-[rgb(var(--tint-rgb)/0.05)] px-1.5 py-[1px] text-[10.5px] text-fog">
                          #{t}
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
      panelTitle="Notebook"
      panelCount={notes.length}
      panelActions={
        <IconButton label="New note" onClick={startDraft}>
          <Plus size={15} strokeWidth={1.9} />
        </IconButton>
      }
      panelSearch={{ value: query, onChange: setQuery, placeholder: 'Search notes…' }}
      panel={panel}
      title={active ? active.title || 'Untitled note' : 'Notebook'}
      subtitle={
        active ? (
          <span className="flex flex-wrap items-center gap-2">
            <span className="mono text-[11px]">{refCode('NOTE', active.id)}</span>
            <span aria-hidden>·</span>
            <span className="num">{wordCount(active.content)} words</span>
            <span aria-hidden>·</span>
            <span>Edited {relativeTime(active.updatedAt)}</span>
            {active.id === DRAFT_ID ? (
              <span className="rounded-[4px] bg-[rgb(var(--tint-rgb)/0.06)] px-1.5 py-[1px] text-[11px] text-ash">
                Unsaved draft
              </span>
            ) : null}
          </span>
        ) : null
      }
      actions={
        active ? (
          <>
            <IconButton
              label={active.isInteresting ? 'Remove from vault' : 'Add to vault'}
              className={cn(active.isInteresting && 'text-accent')}
              onClick={() => {
                if (active.id !== DRAFT_ID) toggleInteresting('notes', active.id);
              }}
            >
              <Star size={15} strokeWidth={1.8} fill={active.isInteresting ? 'currentColor' : 'none'} />
            </IconButton>
            {active.id !== DRAFT_ID ? <ConfirmDelete onConfirm={() => removeNote(active.id)} /> : null}
          </>
        ) : (
          <Button variant="primary" icon={<Plus size={14} strokeWidth={2} />} onClick={startDraft}>
            New note
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
        <div className="mx-auto flex h-full max-w-[820px] flex-col">
          <input
            value={active.title}
            onChange={(e) => patch({ title: e.target.value })}
            placeholder="Untitled note"
            aria-label="Note title"
            className="mb-3 w-full bg-transparent text-[26px] font-medium leading-[1.15] tracking-[-0.022em] text-paper outline-none placeholder:text-ash/50"
          />
          <TagInput tags={active.tags} onChange={(tags) => patch({ tags })} className="mb-4" />
          <RichEditor
            key={active.id}
            value={active.content}
            onChange={(content) => patch({ content })}
            placeholder="Write the thinking down before it evaporates…"
            className="min-h-0 flex-1"
            minHeight={280}
          />

          <AttachmentPanel
            ownerType="note"
            ownerId={active.id}
            ensureOwnerId={ensureOwnerId}
            className="mt-4"
          />
        </div>
      ) : (
        <EmptyState
          icon={<NotebookPen size={18} strokeWidth={1.6} />}
          title="Nothing selected"
          hint={
            notes.length === 0
              ? 'The notebook is empty. Start one and it saves itself as you type.'
              : 'Pick a note from the list, or start a new one.'
          }
          action={
            <Button variant="primary" icon={<Plus size={14} strokeWidth={2} />} onClick={startDraft}>
              New note
            </Button>
          }
        />
      )}
    </ModuleLayout>
  );
}

export const notePreview = (note: Note): string => excerpt(note.content, 90);
