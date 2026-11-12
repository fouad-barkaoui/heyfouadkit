import gsap from 'gsap';
import { useLayoutEffect, useRef, useState } from 'react';
import { fmtDate, useI18n } from '@/components/ui/useI18n';
import { rampStep, SEQUENTIAL } from './tokens';

export interface HeatCell {
  date: string;
  count: number;
}

/** Translation keys; blank rows stay unlabelled. */
const DAY_LABELS = ['sh.chart.mon', '', 'sh.chart.wed', '', 'sh.chart.fri', '', ''];

/**
 * Calendar heatmap — a single-hue sequential ramp, lightest step meaning
 * "near zero". Every cell exposes its date and count on hover.
 */
export function ActivityHeatmap({ cells, weeks = 18 }: { cells: HeatCell[]; weeks?: number }): JSX.Element {
  const root = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<HeatCell | null>(null);
  const { t, locale } = useI18n();
  const items = (count: number): string => t(count === 1 ? 'sh.chart.itemOne' : 'sh.chart.itemMany', { count });
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

  return (
    <div ref={root} className="relative">
      {/* Day labels fill the first column, then one column per week: cells grow with the card. */}
      <div className="overflow-x-auto pb-1">
        <div
          className="grid gap-[3px]"
          style={{
            gridTemplateRows: 'repeat(7, auto)',
            gridAutoFlow: 'column',
            gridTemplateColumns: `auto repeat(${weeks}, minmax(12px, 26px))`,
            justifyContent: 'start',
          }}
        >
          {DAY_LABELS.map((label, i) => (
            // eslint-disable-next-line react/no-array-index-key
            <span key={i} className="me-1.5 flex items-center text-[11px] leading-none text-ash/70">
              {label ? t(label) : ''}
            </span>
          ))}
          {cells.slice(0, weeks * 7).map((cell) => (
            <span
              key={cell.date}
              data-heat-cell
              tabIndex={0}
              role="img"
              aria-label={`${fmtDate(cell.date, locale)}: ${items(cell.count)}`}
              onMouseEnter={() => setHover(cell)}
              onMouseLeave={() => setHover(null)}
              onFocus={() => setHover(cell)}
              onBlur={() => setHover(null)}
              className="aspect-square w-full rounded-[3px] outline-offset-2 transition-[filter] duration-120 hover:brightness-150"
              style={{ background: rampStep(cell.count, max) }}
            />
          ))}
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2 text-[11px] text-ash">
        <span>{t('sh.chart.less')}</span>
        <span className="h-[10px] w-[10px] rounded-[2px] bg-[rgb(var(--tint-rgb)/0.035)]" aria-hidden />
        {SEQUENTIAL.map((step) => (
          <span key={step} className="h-[10px] w-[10px] rounded-[2px]" style={{ background: step }} aria-hidden />
        ))}
        <span>{t('sh.chart.more')}</span>
        {hover ? (
          <span className="ms-auto text-mist">
            {fmtDate(hover.date, locale)}: <span className="num">{hover.count}</span>{' '}
            {t(hover.count === 1 ? 'sh.chart.item' : 'sh.chart.items')}
          </span>
        ) : null}
      </div>
    </div>
  );
}
