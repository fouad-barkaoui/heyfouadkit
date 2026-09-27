import { ChevronLeft, PanelLeftClose, PanelLeftOpen, Search } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { useUI } from '@/state/uiStore';
import { ScrollIndex } from '@/components/motion/ScrollIndex';
import { MenuButton } from './MenuButton';

/**
 * The three-pane knowledge-base shell: rail (outside) · context panel · content.
 * On narrow screens the two panes become one stack — the panel is the list
 * view, the content is the detail view, with a back affordance between them.
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

  return (
    <div className="flex h-full min-h-0 w-full min-w-0">
      {/* ── Context panel ─────────────────────────────────────────────── */}
      <aside
        className={cn(
          'flex h-full min-h-0 flex-col overflow-hidden border-graphite bg-void/72 backdrop-blur-2xl',
          'w-full shrink-0',
          panelExpanded ? 'border-r md:w-[248px] lg:w-[286px]' : 'md:w-0 md:border-r-0',
          detailOpenOnMobile && 'hidden md:flex',
        )}
        style={{ transition: 'width 220ms var(--ease-snap), border-color 220ms var(--ease-snap)' }}
      >
        <div className="flex items-center gap-2 px-4 pb-2.5 pt-3.5">
          <MenuButton className="md:hidden" />
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
            aria-label="Collapse panel"
            className="btn-icon hidden shrink-0 md:inline-flex"
          >
            <PanelLeftClose size={14} strokeWidth={1.7} />
          </button>
        </div>

        {panelSearch ? (
          <div className="relative px-4 pb-2.5">
            <Search
              size={13.5}
              strokeWidth={1.7}
              className="pointer-events-none absolute left-[26px] top-1/2 -translate-y-1/2 text-ash"
              aria-hidden
            />
            <input
              value={panelSearch.value}
              onChange={(e) => panelSearch.onChange(e.target.value)}
              placeholder={panelSearch.placeholder ?? 'Search…'}
              aria-label={panelSearch.placeholder ?? 'Search'}
              className="field py-[7px] pl-[30px] text-[13px]"
            />
          </div>
        ) : null}

        {panelFilters ? <div className="px-4 pb-3">{panelFilters}</div> : null}

        <div className="scroll-y fade-edges min-h-0 flex-1 px-3 pb-4">{panel}</div>
      </aside>

      {/* ── Content pane ──────────────────────────────────────────────── */}
      <section
        className={cn(
          'flex h-full min-h-0 min-w-0 flex-1 flex-col bg-void/78 backdrop-blur-2xl',
          !detailOpenOnMobile && 'hidden md:flex',
        )}
      >
        <header className="flex flex-wrap items-start gap-x-3 gap-y-2.5 border-b border-graphite px-4 py-3.5 md:flex-nowrap md:px-7 md:py-4">
          {onMobileBack ? (
            <button type="button" className="btn-icon md:hidden" aria-label="Back to list" onClick={onMobileBack}>
              <ChevronLeft size={17} strokeWidth={1.8} />
            </button>
          ) : (
            <MenuButton className="md:hidden" />
          )}
          {!panelExpanded ? (
            <button
              type="button"
              className="btn-icon hidden shrink-0 md:inline-flex"
              aria-label="Show panel"
              onClick={togglePanel}
            >
              <PanelLeftOpen size={16} strokeWidth={1.7} />
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
