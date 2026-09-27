import gsap from 'gsap';
import { useLayoutEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { MAGNITUDE_HUE } from './tokens';

export interface BarDatum {
  label: string;
  value: number;
  color?: string;
  hint?: string;
}

/**
 * Horizontal magnitude bars. One hue by default (this compares size, not
 * identity); every bar carries a direct value label, so the fill is decoration
 * rather than the only signal.
 */
export function BarList({
  data,
  unit = '',
  className,
}: {
  data: BarDatum[];
  unit?: string;
  className?: string;
}): JSX.Element {
  const root = useRef<HTMLUListElement>(null);
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...data.map((d) => d.value));

  useLayoutEffect(() => {
    const el = root.current;
    if (!el) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        '[data-bar-fill]',
        { scaleX: 0 },
        { scaleX: 1, duration: 0.75, ease: 'power3.out', stagger: 0.05, transformOrigin: 'left center' },
      );
    }, el);
    return () => ctx.revert();
  }, [data]);

  return (
    <ul ref={root} className={cn('m-0 list-none space-y-2.5 p-0', className)}>
      {data.map((datum, i) => {
        const pct = (datum.value / max) * 100;
        return (
          <li
            key={datum.label}
            className="relative"
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
            onFocus={() => setHover(i)}
            onBlur={() => setHover(null)}
            tabIndex={0}
          >
            <div className="mb-1 flex items-baseline justify-between gap-3">
              <span className="truncate text-[12.5px] text-mist">{datum.label}</span>
              <span className="num shrink-0 text-[12.5px] text-paper">
                {datum.value}
                {unit ? <span className="text-ash"> {unit}</span> : null}
              </span>
            </div>
            <div className="h-[7px] w-full overflow-hidden rounded-[4px] bg-[rgb(var(--tint-rgb)/0.045)]">
              <div
                data-bar-fill
                className="h-full rounded-[4px] transition-[filter] duration-150"
                style={{
                  width: `${pct}%`,
                  background: datum.color ?? MAGNITUDE_HUE,
                  filter: hover === i ? 'brightness(1.25)' : 'none',
                }}
              />
            </div>
            {hover === i && datum.hint ? (
              <div className="pointer-events-none absolute -top-1 right-0 z-10 -translate-y-full rounded-[6px] bg-obsidian px-2 py-1 text-[11.5px] text-mist shadow-[inset_0_0_0_1px_var(--color-graphite),0_2px_4px_rgba(0,0,0,0.4)]">
                {datum.hint}
              </div>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
