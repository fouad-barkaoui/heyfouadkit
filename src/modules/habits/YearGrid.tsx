import { useMemo, useState, type CSSProperties } from 'react';
import type { Habit } from '@/lib/types';
import { useLanguage } from '@/state/languageStore';
import { yearGrid, type YearCell } from './habitMath';

/** Row labels: only Mon / Wed / Fri are shown (2026-09-27 is a Sunday). */
function dayLabels(locale: string, isArabic: boolean): string[] {
  return [0, 1, 2, 3, 4, 5, 6].map((d) =>
    d % 2 === 1 ? new Date(2026, 8, 27 + d).toLocaleDateString(locale, { weekday: isArabic ? 'narrow' : 'short' }) : '',
  );
}

/**
 * GitHub-style contribution year. One hue (the habit's, or the brand accent
 * for "all habits"), five steps of intensity — so it reads the same in light
 * and dark themes, and never relies on colour alone: every cell has a label.
 */
export function YearGrid({ habits, color }: { habits: Habit[]; color: string }): JSX.Element {
  const { t, locale, isArabic } = useLanguage();
  const cols = useMemo(() => yearGrid(habits), [habits]);
  const [hover, setHover] = useState<{ cell: YearCell; x: number; y: number } | null>(null);

  const level = (c: YearCell): number => {
    if (!c.inRange || c.count === 0) return 0;
    const denom = Math.max(1, c.scheduled || habits.length);
    const r = c.count / denom;
    return r >= 1 ? 4 : r >= 0.66 ? 3 : r >= 0.33 ? 2 : 1;
  };

  const total = useMemo(() => cols.flat().reduce((s, c) => s + (c.inRange ? c.count : 0), 0), [cols]);

  // Month label on the first column whose first day is in a new month.
  // Skip a label that would collide with the previous one (needs ~3 columns).
  let lastAt = -9;
  const monthLabels = cols.map((col, i) => {
    const first = col[0]!.date;
    const prev = i > 0 ? cols[i - 1]![0]!.date : null;
    const isNew = !prev || prev.getMonth() !== first.getMonth();
    if (!isNew || i - lastAt < 3) return '';
    // The partial first month is dropped if the next month starts right after it.
    if (i === 0 && cols.slice(1, 3).some((c) => c[0]!.date.getMonth() !== first.getMonth())) return '';
    lastAt = i;
    return first.toLocaleDateString(locale, { month: 'short' });
  });

  return (
    <div className="hb-year relative" style={{ ['--hb' as string]: color } as CSSProperties}>
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-[13px] text-mist">
          <span className="num font-medium text-paper">{total}</span> {t('hab.checkinsLastYear')}
        </p>
        <div className="flex items-center gap-1.5 text-[11px] text-ash" aria-hidden>
          {t('hab.less')}
          {[0, 1, 2, 3, 4].map((l) => (
            <span key={l} className="hb-cell" data-l={l} />
          ))}
          {t('hab.more')}
        </div>
      </div>
      <div className="scroll-x -mx-1 overflow-x-auto px-1 pb-1">
        <div className="inline-grid gap-[3px]" style={{ gridTemplateColumns: `22px repeat(${cols.length}, 11px)` }}>
          <span />
          {monthLabels.map((m, i) => (
            <span key={i} className="h-[14px] overflow-visible whitespace-nowrap text-[10px] leading-none text-ash">
              {m}
            </span>
          ))}
          {dayLabels(locale, isArabic).map((d, r) => (
            <FragmentRow key={r} label={d} cells={cols.map((c) => c[r]!)} level={level} onHover={setHover} />
          ))}
        </div>
      </div>
      {hover ? (
        <div
          className="hb-tip pointer-events-none fixed z-50 rounded-[8px] px-2.5 py-1.5 text-[11.5px]"
          style={{ left: hover.x, top: hover.y - 40 }}
        >
          <span className="font-medium text-paper">
            {t(hover.cell.count === 1 ? 'hab.checkin.one' : 'hab.checkin', { count: hover.cell.count })}
          </span>{' '}
          <span className="text-ash">
            · {hover.cell.date.toLocaleDateString(locale, { weekday: 'short', month: 'short', day: 'numeric' })}
          </span>
        </div>
      ) : null}
    </div>
  );
}

function FragmentRow({
  label,
  cells,
  level,
  onHover,
}: {
  label: string;
  cells: YearCell[];
  level: (c: YearCell) => number;
  onHover: (h: { cell: YearCell; x: number; y: number } | null) => void;
}): JSX.Element {
  const { t, locale, isArabic } = useLanguage();
  return (
    <>
      <span className="pe-1 text-end text-[10px] leading-[11px] text-ash">{label}</span>
      {cells.map((c, i) => (
        <span
          key={c.key}
          className="hb-cell"
          data-l={level(c)}
          data-out={!c.inRange || undefined}
          style={{ animationDelay: `${Math.min(i, 52) * 9}ms` }}
          role="img"
          aria-label={t('hab.cellAria', {
            date: !isArabic ? c.key : c.date.toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' }),
            count: c.count,
          })}
          onPointerEnter={(e) => {
            if (!c.inRange) return;
            const r = (e.target as HTMLElement).getBoundingClientRect();
            onHover({ cell: c, x: r.left + r.width / 2, y: r.top });
          }}
          onPointerLeave={() => onHover(null)}
        />
      ))}
    </>
  );
}
