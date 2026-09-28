import {
  AlertTriangle,
  BookmarkPlus,
  Flame,
  FileText,
  GraduationCap,
  HeartPulse,
  ListChecks,
  Newspaper,
  NotebookPen,
  Pill,
  RotateCcw,
  Target,
  Trash2,
} from 'lucide-react';
import { useMemo } from 'react';
import { Button, IconButton } from '@/components/ui/Button';
import { ConfirmDelete } from '@/components/ui/ConfirmDelete';
import { EmptyState } from '@/components/ui/EmptyState';
import type { CollectionKey } from '@/lib/types';
import { relativeTime, stripHtml } from '@/lib/utils';
import { useLanguage } from '@/state/languageStore';
import { useWorkspace } from '@/state/workspaceStore';
import { ScrollIndex } from '@/components/motion/ScrollIndex';

type TrashKind = 'note' | 'task' | 'article' | 'doc' | 'course' | 'news' | 'medicine' | 'plan' | 'link' | 'habit' | 'goal';

export interface TrashItem {
  id: string;
  /** Which workspace collection this record lives in — restore/permanent-delete act on it directly. */
  key: CollectionKey;
  title: string;
  type: TrashKind;
  deletedAt: string;
  preview?: string;
}

const KIND_ICON: Record<TrashKind, JSX.Element> = {
  note: <NotebookPen size={15} strokeWidth={1.7} />,
  task: <ListChecks size={15} strokeWidth={1.7} />,
  article: <Newspaper size={15} strokeWidth={1.7} />,
  doc: <FileText size={15} strokeWidth={1.7} />,
  course: <GraduationCap size={15} strokeWidth={1.7} />,
  news: <Newspaper size={15} strokeWidth={1.7} />,
  link: <BookmarkPlus size={15} strokeWidth={1.7} />,
  habit: <Flame size={15} strokeWidth={1.7} />,
  goal: <Target size={15} strokeWidth={1.7} />,
  medicine: <Pill size={15} strokeWidth={1.7} />,
  plan: <HeartPulse size={15} strokeWidth={1.7} />,
};

export function TrashPage(): JSX.Element {
  const { t } = useLanguage();
  const { workspace, updateRecord, removeRecord } = useWorkspace();

  /** Every soft-deleted record across the collections that support Trash,
   * flattened into one list — each item remembers its own collection so
   * restore and permanent-delete know exactly what to act on. */
  const trashedItems = useMemo<TrashItem[]>(() => {
    const items: TrashItem[] = [
      ...workspace.notes
        .filter((n) => n.isDeleted)
        .map((n) => ({
          id: n.id,
          key: 'notes' as CollectionKey,
          title: n.title || 'Untitled note',
          type: 'note' as TrashKind,
          deletedAt: n.deletedAt || n.updatedAt,
          preview: stripHtml(n.content).slice(0, 100),
        })),
      ...workspace.todos
        .filter((task) => task.isDeleted)
        .map((task) => ({
          id: task.id,
          key: 'todos' as CollectionKey,
          title: task.title || 'Untitled task',
          type: 'task' as TrashKind,
          deletedAt: task.deletedAt || task.updatedAt,
          preview: task.description?.slice(0, 100),
        })),
      ...workspace.articles
        .filter((a) => a.isDeleted)
        .map((a) => ({
          id: a.id,
          key: 'articles' as CollectionKey,
          title: a.title || 'Untitled article',
          type: 'article' as TrashKind,
          deletedAt: a.deletedAt || a.updatedAt,
          preview: stripHtml(a.content).slice(0, 100),
        })),
      ...workspace.docs
        .filter((d) => d.isDeleted)
        .map((d) => ({
          id: d.id,
          key: 'docs' as CollectionKey,
          title: d.title || 'Untitled document',
          type: 'doc' as TrashKind,
          deletedAt: d.deletedAt || d.updatedAt,
          preview: stripHtml(d.content).slice(0, 100),
        })),
      ...workspace.courses
        .filter((c) => c.isDeleted)
        .map((c) => ({
          id: c.id,
          key: 'courses' as CollectionKey,
          title: c.title || 'Untitled course',
          type: 'course' as TrashKind,
          deletedAt: c.deletedAt || c.updatedAt,
          preview: c.description?.slice(0, 100),
        })),
      ...workspace.news
        .filter((n) => n.isDeleted)
        .map((n) => ({
          id: n.id,
          key: 'news' as CollectionKey,
          title: n.title || 'Untitled story',
          type: 'news' as TrashKind,
          deletedAt: n.deletedAt || n.updatedAt,
          preview: stripHtml(n.content).slice(0, 100),
        })),
      ...workspace.medicines
        .filter((m) => m.isDeleted)
        .map((m) => ({
          id: m.id,
          key: 'medicines' as CollectionKey,
          title: m.name || 'Untitled medicine',
          type: 'medicine' as TrashKind,
          deletedAt: m.deletedAt || m.updatedAt,
          preview: `${m.dosage} ${m.unit}`,
        })),
      ...workspace.treatmentPlans
        .filter((p) => p.isDeleted)
        .map((p) => ({
          id: p.id,
          key: 'treatmentPlans' as CollectionKey,
          title: p.condition || 'Untitled plan',
          type: 'plan' as TrashKind,
          deletedAt: p.deletedAt || p.updatedAt,
          preview: p.prescriber,
        })),
      ...workspace.links
        .filter((l) => l.isDeleted)
        .map((l) => ({
          id: l.id,
          key: 'links' as CollectionKey,
          title: l.title || l.url,
          type: 'link' as TrashKind,
          deletedAt: l.deletedAt || l.updatedAt,
          preview: l.domain,
        })),
      ...workspace.habits
        .filter((h) => h.isDeleted)
        .map((h) => ({
          id: h.id,
          key: 'habits' as CollectionKey,
          title: `${h.emoji} ${h.name}`,
          type: 'habit' as TrashKind,
          deletedAt: h.deletedAt || h.updatedAt,
          preview: `${h.log.length} check-ins`,
        })),
      ...workspace.goals
        .filter((g) => g.isDeleted)
        .map((g) => ({
          id: g.id,
          key: 'goals' as CollectionKey,
          title: `${g.emoji} ${g.title}`,
          type: 'goal' as TrashKind,
          deletedAt: g.deletedAt || g.updatedAt,
          preview: `${g.steps.length} steps`,
        })),
    ];
    return items.sort((a, b) => new Date(b.deletedAt).getTime() - new Date(a.deletedAt).getTime());
  }, [
    workspace.notes,
    workspace.todos,
    workspace.articles,
    workspace.docs,
    workspace.courses,
    workspace.news,
    workspace.medicines,
    workspace.treatmentPlans,
    workspace.links,
    workspace.habits,
    workspace.goals,
  ]);

  const restore = (item: TrashItem): void => {
    updateRecord(item.key, item.id, { isDeleted: false, deletedAt: null });
  };

  const permanentlyDelete = (item: TrashItem): void => {
    removeRecord(item.key, item.id);
  };

  const emptyTrash = (): void => {
    if (!window.confirm(t('trash.confirmEmpty'))) return;
    for (const item of trashedItems) removeRecord(item.key, item.id);
  };

  return (
    <div className="flex h-full flex-col">
      <header className="border-b border-graphite px-4 py-3.5 md:px-7 md:py-4">
        <h1 className="text-[19px] font-medium leading-tight tracking-[-0.016em] text-paper">
          {t('trash.title')}
        </h1>
        <p className="mt-1 text-[12.5px] text-ash">
          {trashedItems.length} {trashedItems.length === 1 ? t('trash.item') : t('trash.items')} {t('trash.inTrash')}
        </p>
      </header>

      <div className="scroll-y min-h-0 flex-1 px-4 py-5 md:px-7 md:py-6">
        <ScrollIndex />
        {trashedItems.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <EmptyState
              icon={<Trash2 size={18} strokeWidth={1.6} />}
              title={t('trash.empty.title')}
              hint={t('trash.empty.hint')}
            />
          </div>
        ) : (
          <div className="mx-auto max-w-[760px] space-y-2">
            {trashedItems.map((item) => (
              <div
                key={`${item.key}-${item.id}`}
                className="flex items-start gap-3 rounded-[8px] bg-[rgb(var(--tint-rgb)/0.02)] p-3 shadow-[inset_0_0_0_1px_var(--color-graphite)] transition-colors duration-150 hover:bg-[rgb(var(--tint-rgb)/0.05)]"
              >
                <span className="mt-0.5 shrink-0 text-ash">{KIND_ICON[item.type]}</span>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-medium text-paper">{item.title}</p>
                  {item.preview ? (
                    <p className="mt-0.5 line-clamp-2 text-[11.5px] text-ash">{item.preview}</p>
                  ) : null}
                  <p className="mt-1 text-[11px] text-ash">
                    {t('trash.deleted')} {relativeTime(item.deletedAt)}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-1.5">
                  <IconButton
                    label={t('trash.restore')}
                    title="Restore item"
                    className="text-teal-500 hover:bg-teal-500/10"
                    onClick={() => restore(item)}
                  >
                    <RotateCcw size={13} strokeWidth={2} />
                  </IconButton>

                  <ConfirmDelete
                    label={t('trash.permanent')}
                    size={13}
                    onConfirm={() => permanentlyDelete(item)}
                  />
                </div>
              </div>
            ))}

            <div className="mt-6 border-t border-graphite pt-4">
              <p className="mb-3 text-[11px] font-medium text-ash">{t('trash.autoDelete')}</p>
              <Button variant="quiet" className="text-coral hover:bg-coral/10" onClick={emptyTrash}>
                <AlertTriangle size={13} strokeWidth={2} />
                {t('trash.emptyTrash')}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
