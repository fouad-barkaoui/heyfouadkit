import { Star } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/** A row in the context panel — the list half of the three-pane shell. */
export function PanelItem({
  active,
  title,
  meta,
  footer,
  starred,
  onToggleStar,
  onSelect,
}: {
  active: boolean;
  title: string;
  meta?: ReactNode;
  footer?: ReactNode;
  starred?: boolean;
  onToggleStar?: () => void;
  onSelect: () => void;
}): JSX.Element {
  return (
    <div
      data-stagger
      data-active={active}
      className={cn(
        'group relative mb-[3px] cursor-pointer rounded-[6px] px-2.5 py-2 transition-colors duration-120',
        active ? 'bg-obsidian shadow-[inset_0_0_0_1px_rgb(var(--tint-rgb) / 0.055)]' : 'hover:bg-[rgb(var(--tint-rgb)/0.035)]',
      )}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect();
        }
      }}
      role="button"
      tabIndex={0}
      aria-current={active ? 'true' : undefined}
    >
      {active ? (
        <span className="absolute left-0 top-1/2 h-[16px] w-[2px] -translate-y-1/2 rounded-r-full bg-acid" aria-hidden />
      ) : null}

      <div className="flex items-start gap-2">
        <p
          className={cn(
            'min-w-0 flex-1 truncate text-[13px] leading-[1.45]',
            active ? 'text-paper' : 'text-mist',
          )}
        >
          {title}
        </p>
        {onToggleStar ? (
          <button
            type="button"
            aria-label={starred ? 'Remove from vault' : 'Add to vault'}
            className={cn(
              'mt-[1px] shrink-0 rounded-[4px] p-[1px] transition-opacity duration-150',
              starred ? 'text-accent opacity-100' : 'text-ash opacity-0 group-hover:opacity-100 focus-visible:opacity-100',
            )}
            onClick={(e) => {
              e.stopPropagation();
              onToggleStar();
            }}
          >
            <Star size={12.5} strokeWidth={1.8} fill={starred ? 'currentColor' : 'none'} aria-hidden />
          </button>
        ) : null}
      </div>

      {meta ? <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-ash">{meta}</div> : null}
      {footer ? <div className="mt-1.5">{footer}</div> : null}
    </div>
  );
}
