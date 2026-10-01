import { Columns3, Newspaper, Plus, Rows3 } from 'lucide-react';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useStagger } from '@/components/motion/ViewTransition';
import { ModuleLayout } from '@/components/shell/ModuleLayout';
import { StatusDot } from '@/components/ui/BadgeChip';
import { Button, IconButton } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import type { NewsItem, NewsStage } from '@/lib/types';
import { cn, nowISO } from '@/lib/utils';
import { useLanguage } from '@/state/languageStore';
import { useUI } from '@/state/uiStore';
import { useRequireAuth } from '@/state/useRequireAuth';
import { useWorkspace } from '@/state/workspaceStore';
import { NewsCard } from './NewsCard';
import { NewsEditor } from './NewsEditor';
import { NewsKanbanBoard } from './NewsKanbanBoard';
import { dayBucketT, NEWS_STAGES, STAGE_LABEL, STAGE_TONE } from './newsMeta';

type ViewMode = 'board' | 'list';

function groupByDayT(items: NewsItem[], locale: string): [string, NewsItem[]][] {
  const map = new Map<string, NewsItem[]>();
  for (const item of items) {
    const key = dayBucketT(item.updatedAt, locale);
    const bucket = map.get(key);
    if (bucket) bucket.push(item);
    else map.set(key, [item]);
  }
  return [...map.entries()];
}

export function NewsModule(): JSX.Element {
  const { workspace, createRecord, updateRecord, toggleInteresting } = useWorkspace();
  const { focusRequest, clearFocus } = useUI();
  const requireAuth = useRequireAuth();
  const { t, locale } = useLanguage();
  const items = useMemo(() => workspace.news.filter((n) => !n.isDeleted), [workspace.news]);

  const [view, setView] = useState<ViewMode>('board');
  const [stageFilter, setStageFilter] = useState<NewsStage | 'all'>('all');
  const [query, setQuery] = useState('');
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<NewsItem | null>(null);
  const [newStage, setNewStage] = useState<NewsStage | undefined>(undefined);
  const [highlightId, setHighlightId] = useState<string | null>(null);

  useEffect(() => {
    if (focusRequest?.module === 'news') {
      setStageFilter('all');
      setHighlightId(focusRequest.id);
      clearFocus();
    }
  }, [focusRequest, clearFocus]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items
      .filter((i) => stageFilter === 'all' || i.stage === stageFilter)
      .filter((i) => !q || i.title.toLowerCase().includes(q) || i.content.toLowerCase().includes(q))
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [items, stageFilter, query]);

  const stats = useMemo(() => {
    const published = items.filter((i) => i.stage === 'published').length;
    const inFlight = items.length - published;
    return { total: items.length, published, inFlight };
  }, [items]);

  const contentRef = useStagger([view, stageFilter, query, items.length]);
  const panelRef = useStagger([stageFilter, query, items.length]);

  const openNew = (stage?: NewsStage): void => {
    if (!requireAuth()) return;
    setEditing(null);
    setNewStage(stage);
    setEditorOpen(true);
  };

  const openEdit = (item: NewsItem): void => {
    setEditing(item);
    setEditorOpen(true);
  };

  const save = (item: NewsItem): void => {
    if (items.some((i) => i.id === item.id)) updateRecord('news', item.id, item);
    else createRecord('news', item);
  };

  const trash = (id: string): void => updateRecord('news', id, { isDeleted: true, deletedAt: nowISO() });

  let content: ReactNode;
  if (visible.length === 0) {
    content = (
      <EmptyState
        icon={<Newspaper size={18} strokeWidth={1.6} />}
        title={query || stageFilter !== 'all' ? t('news.empty.filtered') : t('news.empty.title')}
        hint={t('news.empty.hint')}
        action={
          <Button variant="primary" icon={<Plus size={14} strokeWidth={2} />} onClick={() => openNew()}>
            {t('news.newStory')}
          </Button>
        }
      />
    );
  } else if (view === 'board') {
    content = (
      <NewsKanbanBoard
        items={visible}
        onMove={(id, stage) => updateRecord('news', id, { stage })}
        onEdit={openEdit}
        onDelete={trash}
        onToggleStar={(id) => toggleInteresting('news', id)}
      />
    );
  } else {
    content = (
      <div className="mx-auto max-w-[900px]">
        {groupByDayT(visible, locale).map(([bucket, group]) => (
          <div key={bucket} className="mb-6 last:mb-0">
            <div className="mb-2.5 flex items-center gap-2.5">
              <h3 className="text-[12px] font-medium uppercase tracking-[0.07em] text-ash">{bucket}</h3>
              <span className="h-px flex-1 bg-graphite" aria-hidden />
              <span className="mono num text-[11px] text-ash">{group.length}</span>
            </div>
            <div className="flex flex-col gap-2">
              {group.map((item) => (
                <div
                  key={item.id}
                  className={cn(
                    'rounded-[8px] transition-shadow duration-300',
                    highlightId === item.id && 'shadow-[0_0_0_1px_rgba(228,242,34,0.55)]',
                  )}
                >
                  <NewsCard
                    item={item}
                    onEdit={() => openEdit(item)}
                    onDelete={() => trash(item.id)}
                    onToggleStar={() => toggleInteresting('news', item.id)}
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  const panel = (
    <div ref={panelRef}>
      <div className="mb-3 space-y-2 rounded-[8px] bg-[rgb(var(--tint-rgb)/0.02)] p-3 shadow-[inset_0_0_0_1px_var(--color-graphite)]">
        <p className="num text-[13px] text-paper">
          {stats.published}
          <span className="text-ash">{t('news.ofPublished', { total: stats.total })}</span>
        </p>
        <p className="text-[11.5px] text-ash">{t('news.inPipeline', { count: stats.inFlight })}</p>
      </div>

      {visible.map((item) => (
        <div
          key={item.id}
          data-stagger
          className="group mb-[3px] flex cursor-pointer items-start gap-2 rounded-[6px] px-2.5 py-2 transition-colors duration-120 hover:bg-[rgb(var(--tint-rgb)/0.035)]"
          onClick={() => openEdit(item)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter') openEdit(item);
          }}
        >
          <div className="min-w-0 flex-1">
            <p className="truncate text-[12.5px] text-mist">{item.title}</p>
            <div className="mt-1 flex items-center gap-1.5">
              <StatusDot tone={STAGE_TONE[item.stage]} />
              <span className="text-[11px] text-ash">{STAGE_LABEL[item.stage]}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <>
      <ModuleLayout
        panelTitle={t('nav.news')}
        panelCount={visible.length}
        panelActions={
          <IconButton label={t('news.newStory')} onClick={() => openNew()}>
            <Plus size={15} strokeWidth={1.9} />
          </IconButton>
        }
        panelSearch={{ value: query, onChange: setQuery, placeholder: t('news.searchPlaceholder') }}
        panelFilters={
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              className="pill"
              data-active={stageFilter === 'all'}
              onClick={() => setStageFilter('all')}
            >
              {t('news.all')}
            </button>
            {NEWS_STAGES.map((s) => (
              <button
                key={s}
                type="button"
                className="pill"
                data-active={stageFilter === s}
                onClick={() => setStageFilter(s)}
              >
                {STAGE_LABEL[s]}
              </button>
            ))}
          </div>
        }
        panel={panel}
        title={t('nav.news')}
        subtitle={
          <span className="flex flex-wrap items-center gap-2">
            <span className="num">{t('news.shown', { count: visible.length })}</span>
            <span aria-hidden>·</span>
            <span className="num">{t('news.published', { count: stats.published })}</span>
          </span>
        }
        actions={
          <Button variant="primary" icon={<Plus size={14} strokeWidth={2} />} onClick={() => openNew()}>
            {t('news.newStory')}
          </Button>
        }
        toolbar={
          <div className="flex items-center gap-1 rounded-[7px] bg-[rgb(var(--tint-rgb)/0.03)] p-[3px] shadow-[inset_0_0_0_1px_var(--color-graphite)]">
            {[
              { id: 'board' as const, label: t('news.view.board'), icon: Columns3 },
              { id: 'list' as const, label: t('news.view.list'), icon: Rows3 },
            ].map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => setView(v.id)}
                aria-pressed={view === v.id}
                className={cn(
                  'flex items-center gap-1.5 rounded-[5px] px-2.5 py-[5px] text-[12.5px] transition-colors duration-150',
                  view === v.id
                    ? 'bg-obsidian text-paper shadow-[inset_0_0_0_1px_rgb(var(--tint-rgb) / 0.06)]'
                    : 'text-ash hover:text-mist',
                )}
              >
                <v.icon size={13} strokeWidth={1.75} aria-hidden />
                {v.label}
              </button>
            ))}
          </div>
        }
        detailOpenOnMobile
      >
        <div ref={contentRef}>{content}</div>
      </ModuleLayout>

      <NewsEditor open={editorOpen} onOpenChange={setEditorOpen} item={editing} initialStage={newStage} onSave={save} />
    </>
  );
}
