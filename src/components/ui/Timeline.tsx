import { useLayoutEffect, useRef, type ReactNode } from 'react';
import gsap from 'gsap';
import { Check, Circle, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

export type TimelineState = 'done' | 'active' | 'pending';

export interface TimelineEntry {
  id: string;
  timestamp: string;
  title: string;
  description?: string;
  state: TimelineState;
  meta?: ReactNode;
  actions?: ReactNode;
  onClick?: () => void;
}

const NODE_STYLE: Record<TimelineState, { ring: string; fill: string; ink: string }> = {
  done: { ring: 'rgba(228,242,34,0.55)', fill: '#e4f222', ink: 'var(--ink-fixed)' },
  active: { ring: 'rgba(228,242,34,0.45)', fill: 'rgba(228,242,34,0.10)', ink: 'var(--color-accent)' },
  pending: { ring: 'var(--color-graphite)', fill: 'transparent', ink: 'var(--color-ash)' },
};

/**
 * Vertical timeline — circular state nodes on a drawn connector rail, with the
 * timestamp above the title and a muted description beneath.
 * The rail draws itself downward on mount; nodes settle in behind it.
 */
export function Timeline({ entries, className }: { entries: TimelineEntry[]; className?: string }): JSX.Element {
  const root = useRef<HTMLOListElement>(null);

  useLayoutEffect(() => {
    const el = root.current;
    if (!el) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        '[data-tl-rail]',
        { scaleY: 0 },
        { scaleY: 1, duration: 0.85, ease: 'power3.inOut', transformOrigin: 'top center' },
      );
      gsap.fromTo(
        '[data-tl-node]',
        { scale: 0.4, opacity: 0 },
        { scale: 1, opacity: 1, duration: 0.5, ease: 'back.out(2.2)', stagger: 0.075, delay: 0.1 },
      );
      gsap.fromTo(
        '[data-tl-body]',
        { x: el.closest('[dir="rtl"]') ? 8 : -8, opacity: 0 },
        { x: 0, opacity: 1, duration: 0.5, ease: 'power3.out', stagger: 0.075, delay: 0.14 },
      );
    }, el);
    return () => ctx.revert();
  }, [entries.length]);

  return (
    <ol ref={root} className={cn('relative', className)}>
      {entries.map((entry, index) => {
        const isLast = index === entries.length - 1;
        const style = NODE_STYLE[entry.state];
        return (
          <li key={entry.id} className="relative flex gap-4 pb-7 last:pb-0">
            {!isLast ? (
              <span
                data-tl-rail
                aria-hidden
                className="absolute start-[13px] top-[26px] bottom-[-2px] w-px"
                style={{
                  background:
                    entry.state === 'pending'
                      ? 'linear-gradient(to bottom, var(--color-graphite), color-mix(in srgb, var(--color-graphite) 35%, transparent))'
                      : 'linear-gradient(to bottom, rgba(228,242,34,0.35), color-mix(in srgb, var(--color-graphite) 60%, transparent))',
                }}
              />
            ) : null}

            <span
              data-tl-node
              aria-hidden
              className="relative z-10 mt-[1px] flex h-[27px] w-[27px] shrink-0 items-center justify-center rounded-full"
              style={{ background: style.fill, boxShadow: `inset 0 0 0 1.25px ${style.ring}`, color: style.ink }}
            >
              {entry.state === 'done' ? (
                <Check size={13} strokeWidth={2.6} />
              ) : entry.state === 'active' ? (
                <Clock size={13} strokeWidth={2} />
              ) : (
                <Circle size={7} strokeWidth={2} fill="currentColor" />
              )}
            </span>

            <div
              data-tl-body
              className={cn(
                'group min-w-0 flex-1 pt-[1px]',
                entry.onClick && 'cursor-pointer',
              )}
              onClick={entry.onClick}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="mono text-[11.5px] text-ash">{entry.timestamp}</p>
                  <p
                    className={cn(
                      'mt-[3px] truncate text-[14.5px] font-medium tracking-[-0.012em]',
                      entry.state === 'pending' ? 'text-mist' : 'text-paper',
                    )}
                  >
                    {entry.title}
                  </p>
                  {entry.description ? (
                    <p className="mt-1 line-clamp-2 text-[12.5px] leading-[1.55] text-ash">
                      {entry.description}
                    </p>
                  ) : null}
                  {entry.meta ? <div className="mt-2 flex flex-wrap items-center gap-1.5">{entry.meta}</div> : null}
                </div>
                {entry.actions ? (
                  <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity duration-150 group-hover:opacity-100 focus-within:opacity-100">
                    {entry.actions}
                  </div>
                ) : null}
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
