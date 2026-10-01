import {
  ArrowRight,
  BookmarkPlus,
  Clock3,
  FolderOpen,
  Inbox,
  LayoutGrid,
  Link2,
  List,
  Loader2,
  Orbit,
  Shuffle,
  Sparkles,
  Star,
  Wand2,
} from 'lucide-react';
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type DragEvent } from 'react';
import { useStagger } from '@/components/motion/ViewTransition';
import { ModuleLayout } from '@/components/shell/ModuleLayout';
import type { LinkKind, SavedLink } from '@/lib/types';
import { cn, nowISO } from '@/lib/utils';
import { useLanguage } from '@/state/languageStore';
import { useUI } from '@/state/uiStore';
import { useRequireAuth } from '@/state/useRequireAuth';
import { useWorkspace } from '@/state/workspaceStore';
import { LinkCard, LinkRow } from './LinkCard';
import { LinkPreview } from './LinkPreview';
import { KindBadge, KIND_ICON, LinkMedia } from './LinkVisuals';
import { detect, draftLink, enrich, extractUrls, KIND_META, KIND_ORDER, normalizeUrl } from './linkIntel';

const Constellation = lazy(async () => ({ default: (await import('@/three/Constellation')).Constellation }));

type View = 'grid' | 'list' | 'space';
type Smart = 'all' | 'unread' | 'favorites' | 'recent';
type Sort = 'newest' | 'oldest' | 'unread' | 'az';

const VIEW_KEY = 'kanz.saveit.view.v1';

interface Toast {
  id: number;
  text: string;
  tone: 'ok' | 'info';
  action?: { label: string; run: () => void };
}

function readView(): View {
  try {
    const v = window.localStorage.getItem(VIEW_KEY);
    return v === 'list' || v === 'space' ? v : 'grid';
  } catch {
    return 'grid';
  }
}

function isTypingTarget(t: EventTarget | null): boolean {
  const el = t as HTMLElement | null;
  if (!el) return false;
  return el.isContentEditable || el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT';
}

export function SaveItModule(): JSX.Element {
  const { workspace, createRecord, updateRecord } = useWorkspace();
  const { focusRequest, clearFocus } = useUI();
  const requireAuth = useRequireAuth();
  const { t, locale } = useLanguage();

  const links = useMemo(() => workspace.links.filter((l) => !l.isDeleted), [workspace.links]);

  const [view, setViewState] = useState<View>(readView);
  const setView = (v: View): void => {
    setViewState(v);
    try {
      window.localStorage.setItem(VIEW_KEY, v);
    } catch {
      /* ignore */
    }
  };
  const [smart, setSmart] = useState<Smart>('all');
  const [kind, setKind] = useState<LinkKind | 'all'>('all');
  const [collection, setCollection] = useState<string | 'all'>('all');
  const [sort, setSort] = useState<Sort>('newest');
  const [query, setQuery] = useState('');
  const [draft, setDraft] = useState('');
  const [enriching, setEnriching] = useState<Set<string>>(() => new Set());
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [dropping, setDropping] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [rediscoverSeed, setRediscoverSeed] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const toast = useCallback((t: Omit<Toast, 'id'>) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev.slice(-2), { ...t, id }]);
    window.setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== id)), 4200);
  }, []);

  const collections = useMemo(() => {
    const counts = new Map<string, number>();
    for (const l of links) counts.set(l.collection, (counts.get(l.collection) ?? 0) + 1);
    if (!counts.has('Inbox')) counts.set('Inbox', 0);
    return [...counts.entries()].sort((a, b) => (a[0] === 'Inbox' ? -1 : b[0] === 'Inbox' ? 1 : b[1] - a[1]));
  }, [links]);

  const kindCounts = useMemo(() => {
    const m = new Map<LinkKind, number>();
    for (const l of links) m.set(l.kind, (m.get(l.kind) ?? 0) + 1);
    return m;
  }, [links]);

  /* ── Saving ────────────────────────────────────────────────────────── */
  const flash = useCallback((id: string) => {
    setHighlightId(id);
    window.setTimeout(() => setHighlightId((h) => (h === id ? null : h)), 2200);
    window.setTimeout(() => {
      document.querySelector(`[data-link-id="${id}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 60);
  }, []);

  const saveUrls = useCallback(
    (urls: string[]) => {
      if (urls.length === 0) return;
      if (!requireAuth()) return;
      const target = collection === 'all' ? 'Inbox' : collection;
      let added = 0;
      let lastId: string | null = null;
      for (const url of urls.slice(0, 25)) {
        const existing = links.find((l) => l.url === url);
        if (existing) {
          lastId = existing.id;
          toast({ text: t('si.toast.already'), tone: 'info' });
          continue;
        }
        const record = draftLink(url, target);
        createRecord('links', record);
        added++;
        lastId = record.id;
        setEnriching((s) => new Set(s).add(record.id));
        void enrich(record)
          .then((patch) => {
            if (Object.keys(patch).length) updateRecord('links', record.id, patch);
          })
          .finally(() =>
            setEnriching((s) => {
              const n = new Set(s);
              n.delete(record.id);
              return n;
            }),
          );
      }
      if (added) {
        setSmart('all');
        setKind('all');
        setQuery('');
        toast({ text: added === 1 ? t('si.toast.saved') : t('si.toast.savedMany', { count: added }), tone: 'ok' });
      }
      if (lastId) flash(lastId);
    },
    [collection, createRecord, flash, links, requireAuth, t, toast, updateRecord],
  );

  const submitDraft = (): void => {
    const urls = extractUrls(draft);
    if (urls.length === 0) {
      toast({ text: t('si.toast.notLink'), tone: 'info' });
      return;
    }
    saveUrls(urls);
    setDraft('');
  };

  // Paste a link anywhere on this page (outside a text field) to save it.
  useEffect(() => {
    const onPaste = (e: ClipboardEvent): void => {
      if (isTypingTarget(e.target)) return;
      const text = e.clipboardData?.getData('text/plain') ?? '';
      const urls = extractUrls(text);
      if (urls.length) {
        e.preventDefault();
        saveUrls(urls);
      }
    };
    const onKey = (e: KeyboardEvent): void => {
      if (isTypingTarget(e.target) || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === '/' || e.key === 'n') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('paste', onPaste);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('paste', onPaste);
      window.removeEventListener('keydown', onKey);
    };
  }, [saveUrls]);

  const onDragOver = (e: DragEvent): void => {
    const types = [...e.dataTransfer.types];
    if (types.includes('text/uri-list') || types.includes('text/plain')) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
      setDropping(true);
    }
  };
  const onDrop = (e: DragEvent): void => {
    e.preventDefault();
    setDropping(false);
    const text = e.dataTransfer.getData('text/uri-list') || e.dataTransfer.getData('text/plain');
    saveUrls(extractUrls(text.split('\n').filter((l) => !l.startsWith('#')).join(' ')));
  };

  /* ── Actions ───────────────────────────────────────────────────────── */
  const open = useCallback(
    (l: SavedLink) => {
      setPreviewId(l.id);
      updateRecord('links', l.id, { status: 'read', openedAt: nowISO() });
    },
    [updateRecord],
  );
  const visit = (l: SavedLink): void => {
    window.open(l.url, '_blank', 'noopener,noreferrer');
    updateRecord('links', l.id, { status: 'read', openedAt: nowISO() });
  };
  const trash = (l: SavedLink): void => {
    updateRecord('links', l.id, { isDeleted: true, deletedAt: nowISO() });
    if (previewId === l.id) setPreviewId(null);
    toast({
      text: t('si.toast.trashed'),
      tone: 'info',
      action: { label: t('si.undo'), run: () => updateRecord('links', l.id, { isDeleted: false, deletedAt: null }) },
    });
  };
  const star = (l: SavedLink): void => updateRecord('links', l.id, { isInteresting: !l.isInteresting });

  // Links shared from the phone share sheet or the bookmarklet (see main.tsx).
  const consumedIncoming = useRef(false);
  useEffect(() => {
    if (consumedIncoming.current) return;
    consumedIncoming.current = true;
    let incoming: string | null = null;
    try {
      incoming = sessionStorage.getItem('kanz.saveit.incoming');
      sessionStorage.removeItem('kanz.saveit.incoming');
    } catch {
      /* ignore */
    }
    if (incoming) saveUrls(extractUrls(incoming));
  }, [saveUrls]);

  // Bookmarklet: set via ref — React refuses javascript: URLs in JSX.
  const bookmarkletRef = useRef<HTMLAnchorElement>(null);
  useEffect(() => {
    const code = `javascript:(()=>{window.open('${window.location.origin}/?url='+encodeURIComponent(location.href)+'&title='+encodeURIComponent(document.title),'_blank')})()`;
    bookmarkletRef.current?.setAttribute('href', code);
  });

  // Deep link from ⌘K search.
  useEffect(() => {
    if (focusRequest?.module === 'saveit') {
      setSmart('all');
      setKind('all');
      setCollection('all');
      setQuery('');
      const l = links.find((x) => x.id === focusRequest.id);
      if (l) open(l);
      clearFocus();
    }
  }, [focusRequest, clearFocus, links, open]);

  /* ── Filtering ─────────────────────────────────────────────────────── */
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const weekAgo = Date.now() - 7 * 864e5;
    const rows = links
      .filter((l) => kind === 'all' || l.kind === kind)
      .filter((l) => collection === 'all' || l.collection === collection)
      .filter((l) =>
        smart === 'unread'
          ? l.status === 'unread'
          : smart === 'favorites'
            ? l.isInteresting
            : smart === 'recent'
              ? new Date(l.openedAt ?? l.createdAt).getTime() > weekAgo
              : true,
      )
      .filter((l) => {
        if (!q) return true;
        const hay = `${l.title} ${l.description} ${l.url} ${l.note} ${l.tags.join(' ')} ${l.collection}`.toLowerCase();
        return q.split(/\s+/).every((t) => hay.includes(t));
      });
    const time = (l: SavedLink): number => new Date(l.createdAt).getTime();
    return rows.sort((a, b) =>
      sort === 'oldest'
        ? time(a) - time(b)
        : sort === 'az'
          ? a.title.localeCompare(b.title)
          : sort === 'unread'
            ? Number(b.status === 'unread') - Number(a.status === 'unread') || time(b) - time(a)
            : time(b) - time(a),
    );
  }, [links, kind, collection, smart, query, sort]);

  const rediscover = useMemo(() => {
    const pool = links.filter((l) => l.status === 'unread' || Date.now() - new Date(l.createdAt).getTime() > 3 * 864e5);
    if (links.length < 3 || pool.length === 0) return null;
    return pool[(rediscoverSeed + Math.floor(Date.now() / 864e5)) % pool.length] ?? null;
  }, [links, rediscoverSeed]);

  const stats = useMemo(
    () => ({
      total: links.length,
      unread: links.filter((l) => l.status === 'unread').length,
      favorites: links.filter((l) => l.isInteresting).length,
      videos: kindCounts.get('video') ?? 0,
    }),
    [links, kindCounts],
  );

  const gridRef = useStagger([view, kind, collection, smart, sort, links.length]);
  const preview = previewId ? (workspace.links.find((l) => l.id === previewId) ?? null) : null;

  const detected = useMemo(() => {
    const u = normalizeUrl(draft.split(/\s+/)[0] ?? '');
    return u ? detect(u) : null;
  }, [draft]);

  /* ── Panel ─────────────────────────────────────────────────────────── */
  const smartRows: { id: Smart; label: string; icon: typeof Inbox; count: number }[] = [
    { id: 'all', label: t('si.smart.all'), icon: Sparkles, count: stats.total },
    { id: 'unread', label: t('si.smart.unread'), icon: Inbox, count: stats.unread },
    { id: 'favorites', label: t('si.smart.favorites'), icon: Star, count: stats.favorites },
    { id: 'recent', label: t('si.smart.recent'), icon: Clock3, count: links.filter((l) => Date.now() - new Date(l.openedAt ?? l.createdAt).getTime() < 7 * 864e5).length },
  ];

  const panel = (
    <div className="space-y-5 pb-2 pt-1.5">
      <div className="save-stats grid grid-cols-3 gap-1.5">
        {[
          { label: t('si.stat.saved'), value: stats.total },
          { label: t('si.stat.unread'), value: stats.unread },
          { label: t('si.stat.videos'), value: stats.videos },
        ].map((s) => (
          <div key={s.label} className="rounded-[10px] bg-[rgb(var(--tint-rgb)/0.03)] px-2.5 py-2 shadow-[inset_0_0_0_1px_var(--color-graphite)]">
            <p className="num text-[17px] font-medium leading-none text-paper">{s.value}</p>
            <p className="mt-1 text-[10.5px] uppercase tracking-[0.06em] text-ash">{s.label}</p>
          </div>
        ))}
      </div>

      <nav aria-label={t('si.smartViews')} className="space-y-[2px]">
        {smartRows.map(({ id, label, icon: Icon, count }) => (
          <button key={id} type="button" data-active={smart === id} onClick={() => setSmart(id)} className="save-side-row">
            <Icon size={14} strokeWidth={1.8} aria-hidden />
            <span className="flex-1 truncate text-start">{label}</span>
            <span className="mono num text-[11px] text-ash">{count}</span>
          </button>
        ))}
      </nav>

      <div>
        <p className="mb-1.5 px-2 text-[10.5px] font-medium uppercase tracking-[0.08em] text-ash">{t('si.types')}</p>
        <div className="space-y-[2px]">
          <button type="button" data-active={kind === 'all'} onClick={() => setKind('all')} className="save-side-row">
            <span className="save-dot" style={{ background: 'conic-gradient(#f25f5c, #f5a524, #2dd4a0, #38bdf8, #7c83ff, #b784ff, #f25f5c)' }} />
            <span className="flex-1 text-start">{t('si.allTypes')}</span>
          </button>
          {KIND_ORDER.filter((k) => kindCounts.get(k)).map((k) => {
            const Icon = KIND_ICON[k];
            return (
              <button key={k} type="button" data-active={kind === k} onClick={() => setKind(k)} className="save-side-row">
                <Icon size={14} strokeWidth={1.8} style={{ color: KIND_META[k].color }} aria-hidden />
                <span className="flex-1 text-start">{KIND_META[k].plural}</span>
                <span className="mono num text-[11px] text-ash">{kindCounts.get(k)}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <p className="mb-1.5 px-2 text-[10.5px] font-medium uppercase tracking-[0.08em] text-ash">{t('si.collections')}</p>
        <div className="space-y-[2px]">
          <button type="button" data-active={collection === 'all'} onClick={() => setCollection('all')} className="save-side-row">
            <FolderOpen size={14} strokeWidth={1.8} aria-hidden />
            <span className="flex-1 text-start">{t('si.allCollections')}</span>
          </button>
          {collections.map(([name, count]) => (
            <button key={name} type="button" data-active={collection === name} onClick={() => setCollection(name)} className="save-side-row">
              <span className="save-dot" style={{ background: name === 'Inbox' ? 'var(--color-accent)' : `hsl(${[...name].reduce((h, c) => h + c.charCodeAt(0) * 17, 0) % 360} 70% 62%)` }} />
              <span className="flex-1 truncate text-start">{name === 'Inbox' ? t('si.inbox') : name}</span>
              <span className="mono num text-[11px] text-ash">{count}</span>
            </button>
          ))}
        </div>
        <p className="mt-2 px-2 text-[11px] leading-[1.5] text-ash">
          {t('si.collectionsHint')}
        </p>
      </div>

      <div className="save-bookmarklet hidden rounded-[12px] p-3 md:block">
        <p className="text-[12px] font-medium text-paper">{t('si.bm.title')}</p>
        <p className="mt-1 text-[11px] leading-[1.5] text-ash">{t('si.bm.hint')}</p>
        <a
          ref={bookmarkletRef}
          href="#/saveit"
          onClick={(e) => e.preventDefault()}
          draggable
          className="save-bookmarklet-btn mt-2.5 inline-flex items-center gap-1.5 rounded-[9px] px-3 py-1.5 text-[12px] font-medium"
          title={t('si.bm.dragTip')}
        >
          <BookmarkPlus size={13} strokeWidth={2} aria-hidden /> {t('si.bm.button')}
        </a>
      </div>
    </div>
  );

  /* ── Content ───────────────────────────────────────────────────────── */
  const filtersActive = kind !== 'all' || collection !== 'all' || smart !== 'all' || query.trim() !== '';
  const actions = { onOpen: open, onToggleStar: star, onDelete: trash, onVisit: visit };

  const capture = (
    <div className="save-hero relative mb-6">
      <form
        className={cn('save-capture relative flex items-center gap-2 rounded-[16px] p-1.5 ps-4', detected && 'is-valid')}
        onSubmit={(e) => {
          e.preventDefault();
          submitDraft();
        }}
      >
        <Link2 size={18} strokeWidth={1.8} className="shrink-0 text-ash" aria-hidden />
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onPaste={(e) => {
            const text = e.clipboardData.getData('text/plain');
            const urls = extractUrls(text);
            if (urls.length && !draft) {
              e.preventDefault();
              saveUrls(urls);
            }
          }}
          placeholder={t('si.capture.placeholder')}
          aria-label={t('si.capture.aria')}
          inputMode="url"
          autoComplete="off"
          spellCheck={false}
          className="min-w-0 flex-1 bg-transparent py-2.5 text-[15px] text-paper outline-none placeholder:text-ash"
        />
        {detected ? <KindBadge kind={detected.kind} className="save-detected hidden sm:inline-flex" /> : null}
        <button type="submit" className="save-capture-btn inline-flex shrink-0 items-center gap-1.5 rounded-[11px] px-4 py-2.5 text-[13.5px] font-medium">
          <BookmarkPlus size={15} strokeWidth={2} aria-hidden /> {t('si.save')}
        </button>
      </form>
      <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 px-1 text-[11.5px] text-ash">
        <span className="hidden sm:inline">
          {t('si.tip.press')} <kbd className="rail-kbd">Ctrl V</kbd> {t('si.tip.pressAfter')}
        </span>
        <span className="sm:hidden">{t('si.tip.share')}</span>
        <span className="hidden md:inline">{t('si.tip.drag')}</span>
        <span className="hidden md:inline">
          · <kbd className="rail-kbd">/</kbd> {t('si.tip.type')}
        </span>
      </p>
    </div>
  );

  let body: JSX.Element;
  if (links.length === 0) {
    body = (
      <div className="save-empty anim-rise mx-auto flex max-w-[560px] flex-col items-center py-10 text-center">
        <div className="save-empty-orb mb-6" aria-hidden>
          {(['video', 'article', 'repo', 'audio', 'social'] as LinkKind[]).map((k, i) => {
            const Icon = KIND_ICON[k];
            return (
              <span key={k} className="save-empty-sat" style={{ ['--i' as string]: i, ['--k' as string]: KIND_META[k].color } as CSSProperties}>
                <Icon size={15} strokeWidth={1.9} />
              </span>
            );
          })}
          <span className="save-empty-core">
            <BookmarkPlus size={22} strokeWidth={1.8} />
          </span>
        </div>
        <h2 className="text-[20px] font-medium tracking-[-0.018em] text-paper">{t('si.empty.title')}</h2>
        <p className="mt-2 max-w-[420px] text-[13px] leading-[1.6] text-ash">
          {t('si.empty.body')}
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          {[
            { label: t('si.sample.video'), url: 'https://www.youtube.com/watch?v=aircAruvnKk' },
            { label: t('si.sample.repo'), url: 'https://github.com/mrdoob/three.js' },
            { label: t('si.sample.article'), url: 'https://en.wikipedia.org/wiki/Zettelkasten' },
          ].map((s) => (
            <button key={s.url} type="button" className="pill" onClick={() => saveUrls([s.url])}>
              <Wand2 size={12} strokeWidth={2} aria-hidden /> {t('si.empty.try', { label: s.label })}
            </button>
          ))}
        </div>
      </div>
    );
  } else if (view === 'space') {
    body = (
      <div className="save-space-wrap -mx-4 -mb-5 h-[calc(100dvh-260px)] min-h-[440px] md:-mx-7 md:-mb-6">
        <Suspense
          fallback={
            <div className="flex h-full items-center justify-center text-ash">
              <Loader2 className="animate-spin" size={18} />
            </div>
          }
        >
          <Constellation links={visible} onOpen={open} />
        </Suspense>
      </div>
    );
  } else if (visible.length === 0) {
    body = (
      <div className="anim-rise py-14 text-center">
        <p className="text-[14px] text-mist">{t('si.none.title')}</p>
        <p className="mt-1 text-[12.5px] text-ash">{t('si.none.hint')}</p>
        <button
          type="button"
          className="btn btn-ghost mt-4"
          onClick={() => {
            setKind('all');
            setCollection('all');
            setSmart('all');
            setQuery('');
          }}
        >
          {t('si.clearFilters')}
        </button>
      </div>
    );
  } else if (view === 'list') {
    body = (
      <div ref={gridRef} className="mx-auto max-w-[980px] space-y-1.5">
        {visible.map((l) => (
          <LinkRow key={l.id} link={l} enriching={enriching.has(l.id)} highlighted={highlightId === l.id} {...actions} />
        ))}
      </div>
    );
  } else {
    body = (
      <div className="save-masonry">
        {visible.map((l, i) => (
          <LinkCard key={l.id} link={l} index={i} enriching={enriching.has(l.id)} highlighted={highlightId === l.id} {...actions} />
        ))}
      </div>
    );
  }

  return (
    <div className="relative flex h-full min-h-0 w-full" onDragOver={onDragOver} onDragLeave={(e) => e.currentTarget === e.target && setDropping(false)} onDrop={onDrop}>
      <ModuleLayout
        panelTitle={t('nav.saveit')}
        panelCount={links.length}
        detailOpenOnMobile
        panelSearch={{ value: query, onChange: setQuery, placeholder: t('si.searchPlaceholder') }}
        panel={panel}
        title={
          <span className="flex items-center gap-2">
            {t('nav.saveit')}
            <span className="save-title-spark" aria-hidden>
              <Sparkles size={14} strokeWidth={2} />
            </span>
          </span>
        }
        subtitle={
          links.length
            ? `${t('si.subtitle', { total: stats.total, unread: stats.unread })}${filtersActive ? t('si.subtitle.showing', { count: visible.length }) : ''}`
            : t('si.subtitle.empty')
        }
        actions={
          links.length ? (
            <div role="radiogroup" aria-label={t('si.view')} className="save-views flex rounded-[10px] p-[3px]">
              {(
                [
                  { id: 'grid', icon: LayoutGrid, label: t('si.view.grid') },
                  { id: 'list', icon: List, label: t('si.view.list') },
                  { id: 'space', icon: Orbit, label: t('si.view.space') },
                ] as const
              ).map(({ id, icon: Icon, label }) => (
                <button
                  key={id}
                  type="button"
                  role="radio"
                  aria-checked={view === id}
                  aria-label={label}
                  title={label}
                  onClick={() => setView(id)}
                  className="save-view-btn inline-flex items-center gap-1.5 rounded-[7px] px-2.5 py-1.5 text-[12px]"
                >
                  <Icon size={14} strokeWidth={1.9} aria-hidden />
                  <span className="hidden lg:inline">{label}</span>
                </button>
              ))}
            </div>
          ) : null
        }
        toolbar={
          links.length && view !== 'space' ? (
            <div className="flex w-full items-center gap-2 overflow-x-auto">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t('si.searchShort')}
                aria-label={t('si.searchPlaceholder')}
                className="field w-[130px] shrink-0 py-1 text-[12.5px] md:hidden"
              />
              <div className="flex gap-1.5">
                {(['all', ...KIND_ORDER.filter((k) => kindCounts.get(k))] as const).map((k) => (
                  <button
                    key={k}
                    type="button"
                    className="pill shrink-0"
                    data-active={kind === k}
                    onClick={() => setKind(k as LinkKind | 'all')}
                    style={k !== 'all' ? ({ ['--k' as string]: KIND_META[k as LinkKind].color } as CSSProperties) : undefined}
                  >
                    {k === 'all' ? t('si.all') : KIND_META[k as LinkKind].plural}
                  </button>
                ))}
              </div>
              <label className="ms-auto flex shrink-0 items-center gap-1.5 text-[12px] text-ash">
                {t('si.sort')}
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value as Sort)}
                  className="rounded-[6px] bg-[rgb(var(--tint-rgb)/0.04)] px-2 py-1 text-[12px] text-mist outline-none"
                >
                  <option value="newest">{t('si.sort.newest')}</option>
                  <option value="oldest">{t('si.sort.oldest')}</option>
                  <option value="unread">{t('si.sort.unread')}</option>
                  <option value="az">{t('si.sort.az')}</option>
                </select>
              </label>
            </div>
          ) : undefined
        }
      >
        {capture}

        {rediscover && view !== 'space' && !filtersActive ? (
          <section aria-label={t('si.rediscover')} className="save-rediscover anim-rise mb-6 overflow-hidden rounded-[16px]">
            <button type="button" className="flex w-full items-stretch text-start" onClick={() => open(rediscover)}>
              <LinkMedia link={rediscover} ratio="16 / 10" className="w-[38%] max-w-[260px] shrink-0" />
              <span className="flex min-w-0 flex-1 flex-col justify-center gap-1.5 p-4">
                <span className="flex items-center gap-1.5 text-[10.5px] font-medium uppercase tracking-[0.1em] text-accent">
                  <Sparkles size={12} strokeWidth={2} aria-hidden /> {t('si.rediscover')}
                </span>
                <span className="line-clamp-2 text-[15px] font-medium leading-[1.35] text-paper">{rediscover.title}</span>
                <span className="truncate text-[12px] text-ash">
                  {rediscover.domain} · {t('si.rediscover.saved', { date: new Date(rediscover.createdAt).toLocaleDateString(locale, { month: 'short', day: 'numeric' }) })}
                </span>
                <span className="mt-1 inline-flex items-center gap-1 text-[12px] text-mist">
                  {t('si.rediscover.open')} <ArrowRight size={12} strokeWidth={2} className="rtl:-scale-x-100" aria-hidden />
                </span>
              </span>
            </button>
            <button
              type="button"
              className="save-shuffle btn-icon absolute end-2.5 top-2.5"
              aria-label={t('si.rediscover.another')}
              onClick={() => setRediscoverSeed((s) => s + 1)}
            >
              <Shuffle size={14} strokeWidth={2} />
            </button>
          </section>
        ) : null}

        {body}
      </ModuleLayout>

      {dropping ? (
        <div className="save-drop pointer-events-none fixed inset-0 z-40 flex items-center justify-center" aria-hidden>
          <div className="save-drop-card flex flex-col items-center gap-3 rounded-[22px] px-10 py-8">
            <BookmarkPlus size={30} strokeWidth={1.6} />
            <p className="text-[16px] font-medium">{t('si.dropToSave')}</p>
          </div>
        </div>
      ) : null}

      <div className="pointer-events-none fixed bottom-5 left-1/2 z-[60] flex -translate-x-1/2 flex-col items-center gap-2" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={cn('save-toast pointer-events-auto flex items-center gap-3 rounded-full px-4 py-2 text-[13px]', t.tone === 'ok' && 'is-ok')}>
            {t.tone === 'ok' ? <BookmarkPlus size={14} strokeWidth={2} aria-hidden /> : null}
            <span>{t.text}</span>
            {t.action ? (
              <button
                type="button"
                className="font-medium text-accent hover:underline"
                onClick={() => {
                  t.action?.run();
                  setToasts((prev) => prev.filter((x) => x.id !== t.id));
                }}
              >
                {t.action.label}
              </button>
            ) : null}
          </div>
        ))}
      </div>

      <LinkPreview
        link={preview}
        collections={collections.map(([n]) => n)}
        onClose={() => setPreviewId(null)}
        onPatch={(id, patch) => updateRecord('links', id, patch)}
        onDelete={trash}
        onVisit={visit}
      />
    </div>
  );
}
