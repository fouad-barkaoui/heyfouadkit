import { FileImage, FileText, FileType2, PenLine, Printer, Star, Upload } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { AttachmentPanel } from '@/components/attachments/AttachmentPanel';
import { useStagger } from '@/components/motion/ViewTransition';
import { RichEditor } from '@/components/editor/RichEditor';
import { ModuleLayout } from '@/components/shell/ModuleLayout';
import { PanelItem } from '@/components/shell/PanelItem';
import { Button, IconButton } from '@/components/ui/Button';
import { ConfirmDelete } from '@/components/ui/ConfirmDelete';
import { EmptyState } from '@/components/ui/EmptyState';
import { TagInput } from '@/components/ui/TagInput';
import type { Article, ArticleKind } from '@/lib/types';
import {
  cn,
  formatBytes,
  formatDate,
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
import { PdfViewer } from './PdfViewer';
import { PrintSheet } from './PrintSheet';

const DRAFT_ID = '__draft__';
/** localStorage is the demo backend; anything larger belongs in Supabase Storage. */
const MAX_INLINE_BYTES = 3 * 1024 * 1024;

const KIND_ICON = { written: PenLine, pdf: FileType2, image: FileImage } as const;

const KIND_FILTERS: { id: ArticleKind | 'all'; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'written', label: 'Written' },
  { id: 'pdf', label: 'PDF' },
  { id: 'image', label: 'Images' },
];

const emptyDraft = (): Article => ({
  id: DRAFT_ID,
  title: '',
  kind: 'written',
  content: '',
  tags: [],
  fileUrl: null,
  fileName: null,
  fileType: null,
  fileSize: null,
  isInteresting: false,
  createdAt: nowISO(),
  updatedAt: nowISO(),
});

const isMeaningful = (a: Article): boolean =>
  a.title.trim().length > 0 || stripHtml(a.content).length > 0 || a.tags.length > 0;

export function ArticlesModule(): JSX.Element {
  const { workspace, createRecord, updateRecord, toggleInteresting } = useWorkspace();
  const { focusRequest, clearFocus } = useUI();
  const requireAuth = useRequireAuth();
  const articles = useMemo(() => workspace.articles.filter((a) => !a.isDeleted), [workspace.articles]);

  const [query, setQuery] = useState('');
  const [kindFilter, setKindFilter] = useState<ArticleKind | 'all'>('all');
  const [selectedId, setSelectedId] = useState<string | null>(() =>
    isWideViewport() ? (articles[0]?.id ?? null) : null,
  );
  const [draft, setDraft] = useState<Article | null>(null);
  const [printOpen, setPrintOpen] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (focusRequest?.module === 'articles') {
      setKindFilter('all');
      setSelectedId(focusRequest.id);
      setDraft(null);
      clearFocus();
    }
  }, [focusRequest, clearFocus]);

  const sorted = useMemo(
    () => [...articles].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()),
    [articles],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return sorted
      .filter((a) => kindFilter === 'all' || a.kind === kindFilter)
      .filter(
        (a) =>
          !q ||
          a.title.toLowerCase().includes(q) ||
          stripHtml(a.content).toLowerCase().includes(q) ||
          a.tags.some((t) => t.includes(q)),
      );
  }, [sorted, kindFilter, query]);

  const panelRef = useStagger([query, kindFilter, articles.length]);
  const active: Article | null = draft ?? sorted.find((a) => a.id === selectedId) ?? null;

  const patch = (changes: Partial<Article>): void => {
    if (!active) return;
    if (active.id === DRAFT_ID) {
      const next = { ...active, ...changes };
      if (isMeaningful(next)) {
        const id = uid('art');
        createRecord('articles', { ...next, id, createdAt: nowISO(), updatedAt: nowISO() });
        setDraft(null);
        setSelectedId(id);
        return;
      }
      setDraft(next);
      return;
    }
    updateRecord('articles', active.id, changes);
  };

  const startDraft = (): void => {
    if (!requireAuth()) return;
    setDraft(emptyDraft());
    setSelectedId(DRAFT_ID);
  };

  const triggerUpload = (): void => {
    if (!requireAuth()) return;
    fileInput.current?.click();
  };

  const ensureOwnerId = (): string => {
    if (!active) return '';
    if (active.id !== DRAFT_ID) return active.id;
    const id = uid('art');
    createRecord('articles', {
      ...active,
      id,
      title: active.title.trim() || 'Untitled article',
      createdAt: nowISO(),
      updatedAt: nowISO(),
    });
    setDraft(null);
    setSelectedId(id);
    return id;
  };

  const onUpload = (fileList: FileList | null): void => {
    const file = fileList?.[0];
    if (!file) return;
    setUploadError(null);

    if (file.size > MAX_INLINE_BYTES) {
      setUploadError(
        `${file.name} is ${formatBytes(file.size)} — the local demo store caps files at ${formatBytes(MAX_INLINE_BYTES)}. Connect Supabase Storage for full-size uploads.`,
      );
      return;
    }

    const kind: ArticleKind = file.type === 'application/pdf' ? 'pdf' : 'image';
    const reader = new FileReader();
    reader.onload = () => {
      const id = uid('art');
      createRecord('articles', {
        id,
        title: file.name.replace(/\.[^.]+$/, ''),
        kind,
        content: '',
        tags: [],
        fileUrl: String(reader.result),
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        isInteresting: false,
        createdAt: nowISO(),
        updatedAt: nowISO(),
      });
      setDraft(null);
      setSelectedId(id);
    };
    reader.onerror = () => setUploadError(`${file.name} could not be read.`);
    reader.readAsDataURL(file);
  };

  const panel = (
    <div ref={panelRef}>
      {filtered.length === 0 ? (
        <p className="px-2.5 py-6 text-[12.5px] text-ash">
          {query || kindFilter !== 'all' ? 'Nothing matches this filter.' : 'No articles or files yet.'}
        </p>
      ) : (
        groupByDay(filtered, (a) => a.updatedAt).map(([bucket, items]) => (
          <div key={bucket} className="mb-3">
            <p className="px-2.5 pb-1.5 pt-1 text-[10.5px] font-medium uppercase tracking-[0.08em] text-ash/70">
              {bucket}
            </p>
            {items.map((article) => {
              const Icon = KIND_ICON[article.kind];
              return (
                <PanelItem
                  key={article.id}
                  active={article.id === selectedId}
                  title={article.title || 'Untitled'}
                  starred={article.isInteresting}
                  onToggleStar={() => toggleInteresting('articles', article.id)}
                  onSelect={() => {
                    setDraft(null);
                    setSelectedId(article.id);
                  }}
                  meta={
                    <>
                      <Icon size={11} strokeWidth={1.8} className="text-ash" aria-hidden />
                      <span className="capitalize">{article.kind}</span>
                      <span aria-hidden>·</span>
                      <span>{relativeTime(article.updatedAt)}</span>
                    </>
                  }
                />
              );
            })}
          </div>
        ))
      )}
    </div>
  );

  const meta = active ? (
    <aside className="w-full shrink-0 lg:w-[224px]">
      <div className="rounded-[8px] bg-[rgb(var(--tint-rgb)/0.02)] p-3 shadow-[inset_0_0_0_1px_var(--color-graphite)]">
        <p className="mb-2.5 text-[10.5px] font-medium uppercase tracking-[0.08em] text-ash">Record</p>
        <dl className="space-y-2 text-[12px]">
          <div className="flex justify-between gap-3">
            <dt className="text-ash">Type</dt>
            <dd className="capitalize text-mist">{active.kind}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-ash">Ref</dt>
            <dd className="mono text-[11px] text-mist">{refCode('ART', active.id)}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-ash">Created</dt>
            <dd className="text-mist">{formatDate(active.createdAt)}</dd>
          </div>
          {active.fileName ? (
            <>
              <div className="flex justify-between gap-3">
                <dt className="shrink-0 text-ash">File</dt>
                <dd className="truncate text-mist" title={active.fileName}>
                  {active.fileName}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-ash">Size</dt>
                <dd className="num text-mist">{formatBytes(active.fileSize)}</dd>
              </div>
            </>
          ) : (
            <div className="flex justify-between gap-3">
              <dt className="text-ash">Words</dt>
              <dd className="num text-mist">{wordCount(active.content)}</dd>
            </div>
          )}
        </dl>
      </div>
    </aside>
  ) : null;

  return (
    <>
      <ModuleLayout
        panelTitle="Articles & Media"
        panelCount={articles.length}
        panelActions={
          <>
            <IconButton label="Upload a file" onClick={triggerUpload}>
              <Upload size={14.5} strokeWidth={1.8} />
            </IconButton>
            <IconButton label="Write a new article" onClick={startDraft}>
              <PenLine size={14.5} strokeWidth={1.8} />
            </IconButton>
          </>
        }
        panelSearch={{ value: query, onChange: setQuery, placeholder: 'Search articles…' }}
        panelFilters={
          <div className="flex flex-wrap gap-1.5">
            {KIND_FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                className="pill"
                data-active={kindFilter === f.id}
                onClick={() => setKindFilter(f.id)}
              >
                {f.label}
              </button>
            ))}
          </div>
        }
        panel={panel}
        title={active ? active.title || 'Untitled' : 'Articles & Media'}
        subtitle={
          active ? (
            <span className="flex flex-wrap items-center gap-2">
              <span className="mono text-[11px]">{refCode('ART', active.id)}</span>
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
              <Button icon={<Printer size={13.5} strokeWidth={1.85} />} onClick={() => setPrintOpen(true)}>
                Print
              </Button>
              <IconButton
                label={active.isInteresting ? 'Remove from vault' : 'Add to vault'}
                className={cn(active.isInteresting && 'text-accent')}
                onClick={() => {
                  if (active.id !== DRAFT_ID) toggleInteresting('articles', active.id);
                }}
              >
                <Star size={15} strokeWidth={1.8} fill={active.isInteresting ? 'currentColor' : 'none'} />
              </IconButton>
              {active.id !== DRAFT_ID ? (
                <ConfirmDelete
                  onConfirm={() => {
                    updateRecord('articles', active.id, { isDeleted: true, deletedAt: nowISO() });
                    setSelectedId(sorted.find((a) => a.id !== active.id)?.id ?? null);
                  }}
                />
              ) : null}
            </>
          ) : (
            <>
              <Button icon={<Upload size={13.5} strokeWidth={1.85} />} onClick={triggerUpload}>
                Upload
              </Button>
              <Button variant="primary" icon={<PenLine size={13.5} strokeWidth={1.9} />} onClick={startDraft}>
                Write
              </Button>
            </>
          )
        }
        detailOpenOnMobile={active !== null}
        onMobileBack={() => {
          setSelectedId(null);
          setDraft(null);
        }}
      >
        <input
          ref={fileInput}
          type="file"
          accept=".pdf,.png,.jpg,.jpeg,.webp,application/pdf,image/*"
          className="hidden"
          onChange={(e) => {
            onUpload(e.target.files);
            e.target.value = '';
          }}
        />

        {uploadError ? (
          <div className="mb-4 rounded-[6px] bg-coral/[0.09] px-3 py-2.5 text-[12.5px] text-coral shadow-[inset_0_0_0_1px_rgba(235,87,87,0.25)]">
            {uploadError}
          </div>
        ) : null}

        {!active ? (
          <EmptyState
            icon={<FileText size={18} strokeWidth={1.6} />}
            title="Nothing selected"
            hint="Write an article in place, or upload a PDF or image — both land in the same library with a print-ready A4 view."
            action={
              <div className="flex gap-2">
                <Button icon={<Upload size={13.5} strokeWidth={1.85} />} onClick={triggerUpload}>
                  Upload a file
                </Button>
                <Button variant="primary" icon={<PenLine size={13.5} strokeWidth={1.9} />} onClick={startDraft}>
                  Write an article
                </Button>
              </div>
            }
          />
        ) : (
          <div className="flex flex-col gap-5 lg:flex-row">
            <div className="min-w-0 flex-1">
              <input
                value={active.title}
                onChange={(e) => patch({ title: e.target.value })}
                placeholder="Untitled"
                aria-label="Article title"
                className="mb-3 w-full bg-transparent text-[24px] font-medium leading-[1.18] tracking-[-0.022em] text-paper outline-none placeholder:text-ash/50"
              />
              <TagInput tags={active.tags} onChange={(tags) => patch({ tags })} className="mb-4" />

              {active.kind === 'pdf' && active.fileUrl ? (
                <PdfViewer src={active.fileUrl} className="min-h-[460px]" />
              ) : active.kind === 'image' && active.fileUrl ? (
                <figure className="rounded-[8px] bg-obsidian p-4 shadow-[inset_0_0_0_1px_var(--color-graphite)]">
                  <img
                    src={active.fileUrl}
                    alt={active.title}
                    className="mx-auto max-h-[62vh] rounded-[4px] object-contain"
                  />
                </figure>
              ) : (
                <RichEditor
                  key={active.id}
                  value={active.content}
                  onChange={(content) => patch({ content })}
                  placeholder="Write the piece…"
                  minHeight={340}
                />
              )}

              {active.kind !== 'written' ? (
                <div className="mt-5">
                  <p className="mb-2 text-[10.5px] font-medium uppercase tracking-[0.08em] text-ash">Notes</p>
                  <RichEditor
                    key={`${active.id}-notes`}
                    value={active.content}
                    onChange={(content) => patch({ content })}
                    placeholder="What matters in this document…"
                    minHeight={140}
                    toolbar={false}
                  />
                </div>
              ) : null}

              <AttachmentPanel
                ownerType="article"
                ownerId={active.id}
                ensureOwnerId={ensureOwnerId}
                className="mt-4"
              />
            </div>
            {meta}
          </div>
        )}
      </ModuleLayout>

      <PrintSheet open={printOpen} onOpenChange={setPrintOpen} article={active} />
    </>
  );
}
