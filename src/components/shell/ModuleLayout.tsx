import { ChevronLeft, PanelLeftClose, PanelLeftOpen, Search, X } from 'lucide-react';
import { useEffect, useState, type MouseEvent, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { useUI } from '@/state/uiStore';
import { ScrollIndex } from '@/components/motion/ScrollIndex';
import { useI18n } from '@/components/ui/useI18n';

/**
 * A module's two panes: the list column and the content.
 * On narrow screens the two panes become one stack — the panel is the list
 * view, the content is the detail view, with a back affordance between them.
 * Pages that open straight into their content get a header button that slides
 * the panel over it, so filters, folders and collections stay reachable.
 */
export function ModuleLayout({
  panelTitle,
  panelCount,
  panelActions,
  panelFilters,
  panelSearch,
  panel,
  title,
  subtitle,
  actions,
  toolbar,
  children,
  detailOpenOnMobile = false,
  onMobileBack,
  contentPadding = true,
}: {
  panelTitle: string;
  panelCount?: number;
  panelActions?: ReactNode;
  panelFilters?: ReactNode;
  panelSearch?: { value: string; onChange: (v: string) => void; placeholder?: string };
  panel: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  toolbar?: ReactNode;
  children: ReactNode;
  detailOpenOnMobile?: boolean;
  onMobileBack?: () => void;
  contentPadding?: boolean;
}): JSX.Element {
  const { panelExpanded, togglePanel } = useUI();
  const { t } = useI18n();
  const [mobilePanel, setMobilePanel] = useState(false);
  const canOpenPanel = detailOpenOnMobile && !onMobileBack;

  useEffect(() => {
    if (!mobilePanel) return;
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') setMobilePanel(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mobilePanel]);

  /** Picking something in the open panel (a folder, a filter) returns to the content. */
  const closeAfterPick = (e: MouseEvent<HTMLElement>): void => {
    if (!mobilePanel) return;
    const hit = (e.target as HTMLElement).closest('button, a, [role="button"], [role="option"], [role="tab"]');
    if (!hit || hit.closest('form, [aria-haspopup]') || hit.getAttribute('aria-haspopup')) return;
    setMobilePanel(false);
  };

  return (
    <div className="relative flex h-full min-h-0 w-full min-w-0">
      {/* ── Context panel ─────────────────────────────────────────────── */}
      <aside
        className={cn(
          'flex h-full min-h-0 flex-col overflow-hidden border-graphite bg-void',
          'w-full shrink-0',
          panelExpanded ? 'border-r md:w-[248px] lg:w-[286px]' : 'md:w-0 md:border-r-0',
          detailOpenOnMobile && !mobilePanel && 'hidden md:flex',
          mobilePanel && 'max-md:absolute max-md:inset-0 max-md:z-20',
        )}
        onClick={closeAfterPick}
        style={{ transition: 'width 220ms var(--ease-snap), border-color 220ms var(--ease-snap)' }}
      >
        <div className="flex items-center gap-2 px-4 pb-2.5 pt-3.5">
          <h2 className="flex-1 truncate text-[13px] font-medium tracking-[-0.011em] text-paper">
            {panelTitle}
          </h2>
          {typeof panelCount === 'number' ? (
            <span className="mono num rounded-[4px] bg-white/5 px-1.5 py-[1px] text-[11px] text-ash">
              {panelCount}
            </span>
          ) : null}
          {panelActions}
          <button
            type="button"
            onClick={togglePanel}
            aria-label={t('sh.panel.collapse')}
            className="btn-icon hidden shrink-0 md:inline-flex"
          >
            <PanelLeftClose size={14} strokeWidth={1.7} className="rtl:-scale-x-100" />
          </button>
          {mobilePanel ? (
            <button
              type="button"
              onClick={() => setMobilePanel(false)}
              aria-label={t('sh.panel.close')}
              className="btn-icon shrink-0 md:hidden"
            >
              <X size={16} strokeWidth={1.8} />
            </button>
          ) : null}
        </div>

        {panelSearch ? (
          <div className="relative px-4 pb-2.5">
            <Search
              size={13.5}
              strokeWidth={1.7}
              className="pointer-events-none absolute start-[26px] top-1/2 -translate-y-1/2 text-ash"
              aria-hidden
            />
            <input
              value={panelSearch.value}
              onChange={(e) => panelSearch.onChange(e.target.value)}
              placeholder={panelSearch.placeholder ?? t('sh.searchEllipsis')}
              aria-label={panelSearch.placeholder ?? t('shell.search')}
              className="field py-[7px] ps-[30px] text-[13px]"
            />
          </div>
        ) : null}

        {panelFilters ? <div className="px-4 pb-3">{panelFilters}</div> : null}

        <div className="scroll-y fade-edges min-h-0 flex-1 px-3 pb-4">{panel}</div>
      </aside>

      {/* ── Content pane ──────────────────────────────────────────────── */}
      <section
        className={cn(
          'flex h-full min-h-0 min-w-0 flex-1 flex-col bg-void',
          !detailOpenOnMobile && 'hidden md:flex',
        )}
      >
        <header className="flex flex-wrap items-start gap-x-3 gap-y-2.5 border-b border-graphite px-4 py-3.5 md:min-h-[79px] md:flex-nowrap md:px-7 md:py-4">
          {onMobileBack ? (
            <button type="button" className="btn-icon md:hidden" aria-label={t('sh.panel.back')} onClick={onMobileBack}>
              <ChevronLeft size={17} strokeWidth={1.8} className="rtl:-scale-x-100" />
            </button>
          ) : null}
          {canOpenPanel ? (
            <button
              type="button"
              className="btn-icon shrink-0 md:hidden"
              aria-label={t('sh.panel.show')}
              aria-expanded={mobilePanel}
              onClick={() => setMobilePanel(true)}
            >
              <PanelLeftOpen size={16} strokeWidth={1.7} className="rtl:-scale-x-100" />
            </button>
          ) : null}
          {!panelExpanded ? (
            <button
              type="button"
              className="btn-icon hidden shrink-0 md:inline-flex"
              aria-label={t('sh.panel.show')}
              onClick={togglePanel}
            >
              <PanelLeftOpen size={16} strokeWidth={1.7} className="rtl:-scale-x-100" />
            </button>
          ) : null}
          <div className="min-w-0 flex-1 basis-[190px]">
            <h1 className="truncate text-[17px] font-medium leading-tight tracking-[-0.016em] text-paper md:text-[19px]">
              {title}
            </h1>
            {subtitle ? <div className="mt-1 text-[12.5px] text-ash">{subtitle}</div> : null}
          </div>
          {actions ? <div className="ml-auto flex shrink-0 items-center gap-2">{actions}</div> : null}
        </header>

        {toolbar ? (
          <div className="flex shrink-0 items-center gap-2 border-b border-graphite px-4 py-2.5 md:px-7">
            {toolbar}
          </div>
        ) : null}

        <div className={cn('scroll-y min-h-0 flex-1', contentPadding && 'px-4 py-5 md:px-7 md:py-6')}>
          <ScrollIndex />
          {children}
        </div>
      </section>
    </div>
  );
}
