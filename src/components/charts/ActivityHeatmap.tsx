import gsap from 'gsap';
import { useLayoutEffect, useRef, useState } from 'react';
import { formatDate } from '@/lib/utils';
import { rampStep, SEQUENTIAL } from './tokens';

export interface HeatCell {
  date: string;
  count: number;
}

const DAY_LABELS = ['Mon', '', 'Wed', '', 'Fri', '', ''];

/**
 * Calendar heatmap — a single-hue sequential ramp, lightest step meaning
 * "near zero". Every cell exposes its date and count on hover.
 */
export function ActivityHeatmap({ cells, weeks = 18 }: { cells: HeatCell[]; weeks?: number }): JSX.Element {
  const root = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<HeatCell | null>(null);
  const max = Math.max(1, ...cells.map((c) => c.count));

  useLayoutEffect(() => {
    const el = root.current;
    if (!el) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        '[data-heat-cell]',
        { opacity: 0, scale: 0.6 },
        { opacity: 1, scale: 1, duration: 0.3, ease: 'power2.out', stagger: { each: 0.0035, from: 'start' } },
      );
    }, el);
    return () => ctx.revert();
  }, [cells]);

  const columns: HeatCell[][] = [];
  for (let w = 0; w < weeks; w += 1) columns.push(cells.slice(w * 7, w * 7 + 7));

  return (
    <div ref={root} className="relative">
      <div className="flex gap-[3px] overflow-x-auto pb-1">
        <div className="mr-1 flex shrink-0 flex-col gap-[3px] pt-[1px]">
          {DAY_LABELS.map((label, i) => (
            // eslint-disable-next-line react/no-array-index-key
            <span key={i} className="h-[12px] text-[9px] leading-[12px] text-ash/70">
              {label}
            </span>
          ))}
        </div>
        {columns.map((week, wi) => (
          // eslint-disable-next-line react/no-array-index-key
          <div key={wi} className="flex shrink-0 flex-col gap-[3px]">
            {week.map((cell) => (
              <span
                key={cell.date}
                data-heat-cell
                tabIndex={0}
                role="img"
                aria-label={`${formatDate(cell.date)}: ${cell.count} item${cell.count === 1 ? '' : 's'}`}
                onMouseEnter={() => setHover(cell)}
                onMouseLeave={() => setHover(null)}
                onFocus={() => setHover(cell)}
                onBlur={() => setHover(null)}
                className="h-[12px] w-[12px] rounded-[3px] outline-offset-2 transition-[filter] duration-120 hover:brightness-150"
                style={{ background: rampStep(cell.count, max) }}
              />
            ))}
          </div>
        ))}
      </div>

      <div className="mt-3 flex items-center gap-2 text-[11px] text-ash">
        <span>Less</span>
        <span className="h-[10px] w-[10px] rounded-[2px] bg-[rgb(var(--tint-rgb)/0.035)]" aria-hidden />
        {SEQUENTIAL.map((step) => (
          <span key={step} className="h-[10px] w-[10px] rounded-[2px]" style={{ background: step }} aria-hidden />
        ))}
        <span>More</span>
        {hover ? (
          <span className="ml-auto text-mist">
            {formatDate(hover.date)} — <span className="num">{hover.count}</span> item
            {hover.count === 1 ? '' : 's'}
          </span>
        ) : null}
      </div>
    </div>
  );
}
