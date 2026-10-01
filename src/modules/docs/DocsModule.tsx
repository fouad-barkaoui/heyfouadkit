import {
  Check,
  ChevronRight,
  Folder,
  FolderOpen,
  FolderTree,
  FileText,
  Plus,
  Star,
  Tag as TagIcon,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { AttachmentPanel } from '@/components/attachments/AttachmentPanel';
import { useStagger } from '@/components/motion/ViewTransition';
import { RichEditor } from '@/components/editor/RichEditor';
import { ModuleLayout } from '@/components/shell/ModuleLayout';
import { BadgeChip } from '@/components/ui/BadgeChip';
import { Button, IconButton } from '@/components/ui/Button';
import { ConfirmDelete } from '@/components/ui/ConfirmDelete';
import { EmptyState } from '@/components/ui/EmptyState';
import { TextInput } from '@/components/ui/Field';
import type { Badge, Doc } from '@/lib/types';
import { cn, excerpt, nowISO, refCode, stripHtml, uid } from '@/lib/utils';
import { BadgeEditor } from '@/modules/badges/BadgeEditor';
import { translate, useLanguage } from '@/state/languageStore';
import { useUI } from '@/state/uiStore';
import { useRequireAuth } from '@/state/useRequireAuth';
import { useWorkspace } from '@/state/workspaceStore';
import { relTime } from './localTime';

const DRAFT_ID = '__draft__';

const emptyDraft = (folder: string): Doc => ({
  id: DRAFT_ID,
  title: '',
  content: '',
  folder,
  badgeId: null,
  isInteresting: false,
  createdAt: nowISO(),
  updatedAt: nowISO(),
});

const isMeaningful = (d: Doc): boolean => d.title.trim().length > 0 || stripHtml(d.content).length > 0;

export function DocsModule(): JSX.Element {
  const { workspace, createRecord, updateRecord, toggleInteresting } = useWorkspace();
  const { focusRequest, clearFocus } = useUI();
  const requireAuth = useRequireAuth();
  const { t } = useLanguage();
  /* 'General' is the stored default folder name — show it in the current language. */
  const folderLabel = (name: string): string => (name === 'General' ? t('doc.general') : name);

  const docs = useMemo(() => workspace.docs.filter((d) => !d.isDeleted), [workspace.docs]);
  const badges = useMemo(() => workspace.badges.filter((b) => b.category === 'doc'), [workspace.badges]);
  const badgeById = useMemo(() => new Map(workspace.badges.map((b) => [b.id, b] as const)), [workspace.badges]);

  const [panelTab, setPanelTab] = useState<'folders' | 'badges'>('folders');
  const [query, setQuery] = useState('');
  const [folder, setFolder] = useState<string | null>(null);
  const [badgeFilter, setBadgeFilter] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Doc | null>(null);
  const [newFolder, setNewFolder] = useState('');
  const [badgeEditor, setBadgeEditor] = useState<{ open: boolean; badge: Badge | null }>({ open: false, badge: null });

  useEffect(() => {
    if (focusRequest?.module === 'docs') {
      setFolder(null);
      setBadgeFilter(null);
      setQuery('');
      setSelectedId(focusRequest.id);
      setDraft(null);
      clearFocus();
    }
  }, [focusRequest, clearFocus]);

  const folders = useMemo(() => {
    const map = new Map<string, number>();
    for (const doc of docs) map.set(doc.folder, (map.get(doc.folder) ?? 0) + 1);
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [docs]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return docs
      .filter((d) => folder === null || d.folder === folder)
      .filter((d) => badgeFilter === null || d.badgeId === badgeFilter)
      .filter((d) => !q || d.title.toLowerCase().includes(q) || stripHtml(d.content).toLowerCase().includes(q))
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [docs, folder, badgeFilter, query]);

  const contentRef = useStagger([folder, badgeFilter, query, docs.length, selectedId]);
  const active: Doc | null = draft ?? docs.find((d) => d.id === selectedId) ?? null;

  const patch = (changes: Partial<Doc>): void => {
    if (!active) return;
    if (active.id === DRAFT_ID) {
      const next = { ...active, ...changes };
      if (isMeaningful(next)) {
        const id = uid('doc');
        createRecord('docs', { ...next, id, createdAt: nowISO(), updatedAt: nowISO() });
        setDraft(null);
        setSelectedId(id);
        return;
      }
      setDraft(next);
      return;
    }
    updateRecord('docs', active.id, changes);
  };

  const startDraft = (): void => {
    if (!requireAuth()) return;
    setDraft(emptyDraft(folder ?? folders[0]?.[0] ?? 'General'));
    setSelectedId(DRAFT_ID);
  };

  const startNewBadge = (): void => {
    if (!requireAuth()) return;
    setBadgeEditor({ open: true, badge: null });
  };

  const ensureOwnerId = (): string => {
    if (!active) return '';
    if (active.id !== DRAFT_ID) return active.id;
    const id = uid('doc');
    createRecord('docs', {
      ...active,
      id,
      title: active.title.trim() || translate('doc.untitledDocument'),
      createdAt: nowISO(),
      updatedAt: nowISO(),
    });
    setDraft(null);
    setSelectedId(id);
    return id;
  };

  const saveBadge = (badge: Badge): void => {
    if (workspace.badges.some((b) => b.id === badge.id)) updateRecord('badges', badge.id, badge);
    else createRecord('badges', badge);
  };

  const folderOptions = useMemo(() => {
    const names = new Set(folders.map(([name]) => name));
    if (active) names.add(active.folder);
    names.add('General');
    return [...names].sort((a, b) => a.localeCompare(b));
  }, [folders, active]);

  /* ── Panel: folder tree / badge namespace ─────────────────────────────── */

  const panel = (
    <div>
      <div className="mb-3 flex gap-1 rounded-[7px] bg-[rgb(var(--tint-rgb)/0.03)] p-[3px] shadow-[inset_0_0_0_1px_var(--color-graphite)]">
        {(['folders', 'badges'] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setPanelTab(tab)}
            aria-pressed={panelTab === tab}
            className={cn(
              'flex-1 rounded-[5px] px-2 py-[5px] text-[12.5px] transition-colors duration-150',
              panelTab === tab
                ? 'bg-obsidian text-paper shadow-[inset_0_0_0_1px_rgb(var(--tint-rgb) / 0.06)]'
                : 'text-ash hover:text-mist',
            )}
          >
            {t(tab === 'folders' ? 'doc.tab.folders' : 'doc.tab.badges')}
          </button>
        ))}
      </div>

      {panelTab === 'folders' ? (
        <div>
          <button
            type="button"
            onClick={() => setFolder(null)}
            data-active={folder === null}
            className="nav-row mb-[2px] text-[12.5px]"
          >
            <FolderOpen size={14} strokeWidth={1.7} aria-hidden />
            <span className="flex-1 truncate text-start">{t('doc.allDocuments')}</span>
            <span className="mono num text-[10.5px] text-ash">{docs.length}</span>
          </button>

          {folders.map(([name, count]) => (
            <button
              key={name}
              type="button"
              onClick={() => setFolder(name)}
              data-active={folder === name}
              className="nav-row mb-[2px] pl-4 text-[12.5px]"
            >
              <ChevronRight
                size={12}
                strokeWidth={2}
                className={cn('shrink-0 transition-transform duration-200', folder === name ? 'rotate-90' : 'rtl:-scale-x-100')}
                aria-hidden
              />
              <Folder size={13.5} strokeWidth={1.7} aria-hidden />
              <span className="flex-1 truncate text-start">{folderLabel(name)}</span>
              <span className="mono num text-[10.5px] text-ash">{count}</span>
            </button>
          ))}

          <form
            className="mt-3 flex gap-1.5 px-1"
            onSubmit={(e) => {
              e.preventDefault();
              if (!requireAuth()) return;
              const name = newFolder.trim();
              if (!name) return;
              setDraft(emptyDraft(name));
              setSelectedId(DRAFT_ID);
              setFolder(name);
              setNewFolder('');
            }}
          >
            <TextInput
              value={newFolder}
              onChange={(e) => setNewFolder(e.target.value)}
              placeholder={t('doc.newFolderPlaceholder')}
              aria-label={t('doc.newFolderName')}
              className="py-[5px] text-[12px]"
            />
            <IconButton label={t('doc.createFolder')} type="submit">
              <Plus size={14} strokeWidth={1.9} />
            </IconButton>
          </form>
        </div>
      ) : (
        <div>
          <div className="mb-2 flex items-center justify-between px-1">
            <p className="text-[10.5px] font-medium uppercase tracking-[0.08em] text-ash/70">{t('doc.badgesHeading')}</p>
            <IconButton label={t('doc.newBadge')} onClick={startNewBadge}>
              <Plus size={13.5} strokeWidth={1.9} />
            </IconButton>
          </div>
          <div className="flex flex-wrap gap-1.5 px-1">
            {badges.length === 0 ? (
              <p className="py-2 text-[12px] text-ash">{t('doc.noBadges')}</p>
            ) : (
              badges.map((badge) => (
                <BadgeChip
                  key={badge.id}
                  badge={badge}
                  size="sm"
                  interactive
                  active={badgeFilter === badge.id}
                  onClick={() => setBadgeFilter((current) => (current === badge.id ? null : badge.id))}
                />
              ))
            )}
          </div>
          <p className="mt-3 px-1 text-[11.5px] leading-[1.5] text-ash/80">
            {t('doc.badgeScope')}
          </p>
        </div>
      )}
    </div>
  );

  /* ── Content: folder cards + file table, or the document itself ───────── */

  const browser = (
    <div ref={contentRef}>
      {folder === null && folders.length > 0 ? (
        <section className="mb-7">
          <h2 className="mb-3 text-[15px] font-medium tracking-[-0.014em] text-paper">{t('doc.folders')}</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
            {folders.map(([name, count]) => (
              <button
                key={name}
                type="button"
                data-stagger
                onClick={() => setFolder(name)}
                className="group flex flex-col items-start rounded-[10px] bg-[rgb(var(--tint-rgb)/0.022)] p-3.5 text-start shadow-[inset_0_0_0_1px_var(--color-graphite)] transition-[background-color,box-shadow,transform] duration-150 hover:bg-[rgb(var(--tint-rgb)/0.045)] hover:shadow-[inset_0_0_0_1px_var(--color-smoke)]"
              >
                <span className="mb-3 flex h-9 w-11 items-end">
                  <Folder
                    size={30}
                    strokeWidth={1.2}
                    className="text-smoke transition-colors duration-150 group-hover:text-fog"
                    aria-hidden
                  />
                </span>
                <span className="w-full truncate text-[13px] text-paper">{folderLabel(name)}</span>
                <span className="num mt-0.5 text-[11.5px] text-ash">
                  {t(count === 1 ? 'doc.fileCount.one' : 'doc.fileCount.other', { count })}
                </span>
              </button>
            ))}
          </div>
        </section>
      ) : null}

      <section>
        <div className="mb-3 flex items-center gap-2.5">
          <h2 className="text-[15px] font-medium tracking-[-0.014em] text-paper">{folder === null ? t('doc.allDocuments') : folderLabel(folder)}</h2>
          <span className="mono num rounded-[4px] bg-[rgb(var(--tint-rgb)/0.05)] px-1.5 py-[1px] text-[11px] text-ash">
            {filtered.length}
          </span>
          {folder !== null ? (
            <button
              type="button"
              onClick={() => setFolder(null)}
              className="text-[12px] text-ash transition-colors hover:text-mist"
            >
              {t('doc.backToAll')}
            </button>
          ) : null}
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            icon={<FolderTree size={18} strokeWidth={1.6} />}
            title={query || badgeFilter ? t('doc.empty.filtered') : t('doc.empty.folder')}
            hint={t('doc.empty.hint')}
            action={
              <Button variant="primary" icon={<Plus size={14} strokeWidth={2} />} onClick={startDraft}>
                {t('doc.newDocument')}
              </Button>
            }
          />
        ) : (
          <div className="overflow-x-auto rounded-[10px] shadow-[inset_0_0_0_1px_var(--color-graphite)]">
            <table className="w-full min-w-[320px] border-collapse text-start">
              <thead>
                <tr className="border-b border-graphite text-[11px] uppercase tracking-[0.07em] text-ash">
                  <th className="px-4 py-2.5 font-medium">{t('doc.col.name')}</th>
                  <th className="hidden px-4 py-2.5 font-medium sm:table-cell">{t('doc.col.badge')}</th>
                  <th className="hidden px-4 py-2.5 font-medium lg:table-cell">{t('doc.col.folder')}</th>
                  <th className="hidden px-4 py-2.5 font-medium md:table-cell">{t('doc.col.updated')}</th>
                  <th className="w-[92px] px-4 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((doc) => {
                  const badge = doc.badgeId ? badgeById.get(doc.badgeId) : undefined;
                  return (
                    <tr
                      key={doc.id}
                      data-stagger
                      className="group cursor-pointer border-b border-graphite/60 transition-colors duration-120 last:border-b-0 hover:bg-[rgb(var(--tint-rgb)/0.025)]"
                      onClick={() => {
                        setDraft(null);
                        setSelectedId(doc.id);
                      }}
                    >
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2.5">
                          <FileText size={13.5} strokeWidth={1.7} className="shrink-0 text-ash" aria-hidden />
                          <div className="min-w-0">
                            <p className="truncate text-[13px] text-paper">{doc.title || t('doc.untitled')}</p>
                            <p className="truncate text-[11.5px] text-ash">{excerpt(doc.content, 70) || '—'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="hidden px-4 py-2.5 sm:table-cell">
                        {badge ? (
                          <BadgeChip badge={badge} size="sm" />
                        ) : (
                          <span className="text-[12px] text-ash">—</span>
                        )}
                      </td>
                      <td className="hidden px-4 py-2.5 text-[12.5px] text-mist lg:table-cell">{folderLabel(doc.folder)}</td>
                      <td className="hidden px-4 py-2.5 text-[12px] text-ash md:table-cell">
                        {relTime(doc.updatedAt)}
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center justify-end gap-0.5 opacity-0 transition-opacity duration-150 group-hover:opacity-100 focus-within:opacity-100">
                          <IconButton
                            label={doc.isInteresting ? t('doc.removeFromVault') : t('doc.addToVault')}
                            className={cn('h-6 w-6', doc.isInteresting && 'text-accent opacity-100')}
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleInteresting('docs', doc.id);
                            }}
                          >
                            <Star size={12.5} strokeWidth={1.9} fill={doc.isInteresting ? 'currentColor' : 'none'} />
                          </IconButton>
                          <ConfirmDelete
                            label={t('doc.deleteDocument')}
                            size={12.5}
                            onConfirm={() => {
                              updateRecord('docs', doc.id, { isDeleted: true, deletedAt: nowISO() });
                              if (selectedId === doc.id) setSelectedId(null);
                            }}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );

  const editor = active ? (
    <div className="mx-auto max-w-[820px]">
      <input
        value={active.title}
        onChange={(e) => patch({ title: e.target.value })}
        placeholder={t('doc.untitledDocument')}
        aria-label={t('doc.titleLabel')}
        className="mb-3 w-full bg-transparent text-[24px] font-medium leading-[1.18] tracking-[-0.022em] text-paper outline-none placeholder:text-ash/50"
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <select
          value={active.folder}
          onChange={(e) => patch({ folder: e.target.value })}
          aria-label={t('doc.col.folder')}
          className="field w-auto py-[5px] pr-7 text-[12.5px]"
        >
          {folderOptions.map((name) => (
            <option key={name} value={name}>
              {folderLabel(name)}
            </option>
          ))}
        </select>

        <span className="h-4 w-px bg-graphite" aria-hidden />

        <button
          type="button"
          className="pill"
          data-active={active.badgeId === null}
          onClick={() => patch({ badgeId: null })}
        >
          {t('doc.noBadge')}
        </button>
        {badges.map((badge) => (
          <BadgeChip
            key={badge.id}
            badge={badge}
            size="sm"
            interactive
            active={active.badgeId === badge.id}
            onClick={() => patch({ badgeId: badge.id })}
          />
        ))}
        <button
          type="button"
          onClick={startNewBadge}
          className="rounded-full border border-dashed border-graphite px-2.5 py-[3px] text-[11.5px] text-ash transition-colors hover:border-smoke hover:text-mist"
        >
          {t('doc.addBadge')}
        </button>
      </div>

      <RichEditor
        key={active.id}
        value={active.content}
        onChange={(content) => patch({ content })}
        placeholder={t('doc.editorPlaceholder')}
        minHeight={300}
      />

      <AttachmentPanel ownerType="doc" ownerId={active.id} ensureOwnerId={ensureOwnerId} className="mt-4" />
    </div>
  ) : null;

  return (
    <>
      <ModuleLayout
        panelTitle={t('nav.docsStorage')}
        panelCount={docs.length}
        panelActions={
          <IconButton label={t('doc.newDocument')} onClick={startDraft}>
            <Plus size={15} strokeWidth={1.9} />
          </IconButton>
        }
        panelSearch={{ value: query, onChange: setQuery, placeholder: t('doc.searchPlaceholder') }}
        panel={panel}
        title={active ? active.title || t('doc.untitledDocument') : t('nav.docsStorage')}
        subtitle={
          active ? (
            <span className="flex flex-wrap items-center gap-2">
              <span className="mono text-[11px]">{refCode('DOC', active.id)}</span>
              <span aria-hidden>·</span>
              <span>{folderLabel(active.folder)}</span>
              <span aria-hidden>·</span>
              <span>{t('doc.edited', { time: relTime(active.updatedAt) })}</span>
              {active.id === DRAFT_ID ? (
                <span className="rounded-[4px] bg-[rgb(var(--tint-rgb)/0.06)] px-1.5 py-[1px] text-[11px] text-ash">
                  {t('doc.draftHint')}
                </span>
              ) : null}
            </span>
          ) : (
            <span className="num">
              {t(folders.length === 1 ? 'doc.summary.one' : 'doc.summary.other', {
                docs: docs.length,
                folders: folders.length,
              })}
            </span>
          )
        }
        actions={
          active ? (
            <>
              <Button
                variant="primary"
                icon={<Check size={14} strokeWidth={2.2} />}
                onClick={() => {
                  setSelectedId(null);
                  setDraft(null);
                }}
              >
                {t('doc.save')}
              </Button>
              <IconButton
                label={active.isInteresting ? t('doc.removeFromVault') : t('doc.addToVault')}
                className={cn(active.isInteresting && 'text-accent')}
                onClick={() => {
                  if (active.id !== DRAFT_ID) toggleInteresting('docs', active.id);
                }}
              >
                <Star size={15} strokeWidth={1.8} fill={active.isInteresting ? 'currentColor' : 'none'} />
              </IconButton>
              {active.id !== DRAFT_ID ? (
                <ConfirmDelete
                  label={t('doc.delete')}
                  onConfirm={() => {
                    updateRecord('docs', active.id, { isDeleted: true, deletedAt: nowISO() });
                    setSelectedId(null);
                  }}
                />
              ) : null}
            </>
          ) : (
            <>
              <Button icon={<TagIcon size={13} strokeWidth={1.9} />} onClick={startNewBadge}>
                {t('doc.badge')}
              </Button>
              <Button variant="primary" icon={<Plus size={14} strokeWidth={2} />} onClick={startDraft}>
                {t('doc.newDocument')}
              </Button>
            </>
          )
        }
        detailOpenOnMobile
      >
        {active ? editor : browser}
      </ModuleLayout>

      <BadgeEditor
        open={badgeEditor.open}
        onOpenChange={(open) => setBadgeEditor((s) => ({ ...s, open }))}
        scope="doc"
        badge={badgeEditor.badge}
        onSave={saveBadge}
      />
    </>
  );
}
