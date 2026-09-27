import gsap from 'gsap';
import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { CHART_INK, MAGNITUDE_HUE } from './tokens';

export interface TrendPoint {
  label: string;
  value: number;
}

const W = 720;
const H = 180;
const PAD = { top: 12, right: 10, bottom: 22, left: 30 };

/**
 * Single-series area trend with a crosshair tooltip. One series, so the title
 * names it and no legend box is needed.
 */
export function AreaTrend({ data, unit = '' }: { data: TrendPoint[]; unit?: string }): JSX.Element {
  const [hover, setHover] = useState<number | null>(null);
  const pathRef = useRef<SVGPathElement>(null);
  const areaRef = useRef<SVGPathElement>(null);

  const max = Math.max(1, ...data.map((d) => d.value));
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;

  const points = useMemo(
    () =>
      data.map((d, i) => ({
        ...d,
        x: PAD.left + (data.length <= 1 ? innerW / 2 : (i / (data.length - 1)) * innerW),
        y: PAD.top + innerH - (d.value / max) * innerH,
      })),
    [data, max, innerW, innerH],
  );

  const line = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const area = `${line} L${(points.at(-1)?.x ?? PAD.left).toFixed(1)},${PAD.top + innerH} L${PAD.left},${PAD.top + innerH} Z`;

  useLayoutEffect(() => {
    const path = pathRef.current;
    const fill = areaRef.current;
    if (!path) return;
    const length = path.getTotalLength?.() ?? 0;
    const ctx = gsap.context(() => {
      if (length > 0) {
        gsap.fromTo(
          path,
          { strokeDasharray: length, strokeDashoffset: length },
          { strokeDashoffset: 0, duration: 1.1, ease: 'power2.out' },
        );
      }
      if (fill) gsap.fromTo(fill, { opacity: 0 }, { opacity: 1, duration: 0.9, delay: 0.25, ease: 'power2.out' });
    });
    return () => ctx.revert();
  }, [line]);

  const ticks = [0, 0.5, 1].map((t) => ({ value: Math.round(max * t), y: PAD.top + innerH - t * innerH }));
  const labelEvery = Math.max(1, Math.ceil(data.length / 7));
  const point = hover !== null ? points[hover] : null;

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        style={{ height: 180 }}
        role="img"
        aria-label={`Trend over ${data.length} points, peak ${max}${unit ? ` ${unit}` : ''}`}
        onMouseLeave={() => setHover(null)}
        onMouseMove={(event) => {
          const rect = event.currentTarget.getBoundingClientRect();
          const x = ((event.clientX - rect.left) / rect.width) * W;
          let nearest = 0;
          let best = Number.POSITIVE_INFINITY;
          points.forEach((p, i) => {
            const d = Math.abs(p.x - x);
            if (d < best) {
              best = d;
              nearest = i;
            }
          });
          setHover(nearest);
        }}
      >
        {ticks.map((tick) => (
          <g key={tick.value}>
            <line
              x1={PAD.left}
              x2={W - PAD.right}
              y1={tick.y}
              y2={tick.y}
              stroke={CHART_INK.grid}
              strokeWidth={1}
            />
            <text x={PAD.left - 6} y={tick.y + 3.5} textAnchor="end" fontSize="10" fill={CHART_INK.faint}>
              {tick.value}
            </text>
          </g>
        ))}

        <defs>
          <linearGradient id="trend-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={MAGNITUDE_HUE} stopOpacity="0.28" />
            <stop offset="100%" stopColor={MAGNITUDE_HUE} stopOpacity="0" />
          </linearGradient>
        </defs>

        <path ref={areaRef} d={area} fill="url(#trend-fill)" />
        <path
          ref={pathRef}
          d={line}
          fill="none"
          stroke={MAGNITUDE_HUE}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {point ? (
          <>
            <line
              x1={point.x}
              x2={point.x}
              y1={PAD.top}
              y2={PAD.top + innerH}
              stroke={CHART_INK.axis}
              strokeWidth={1}
            />
            <circle cx={point.x} cy={point.y} r={4.5} fill={MAGNITUDE_HUE} stroke={CHART_INK.surface} strokeWidth={2} />
          </>
        ) : null}

        {points.map((p, i) =>
          i % labelEvery === 0 ? (
            <text key={p.label} x={p.x} y={H - 6} textAnchor="middle" fontSize="10" fill={CHART_INK.faint}>
              {p.label}
            </text>
          ) : null,
        )}
      </svg>

      {point ? (
        <div
          className="pointer-events-none absolute top-1 z-10 -translate-x-1/2 rounded-[6px] bg-obsidian px-2 py-1.5 text-[11.5px] shadow-[inset_0_0_0_1px_var(--color-graphite),0_2px_4px_rgba(0,0,0,0.4)]"
          style={{ left: `${(point.x / W) * 100}%` }}
        >
          <span className="block text-ash">{point.label}</span>
          <span className="num block text-paper">
            {point.value}
            {unit ? ` ${unit}` : ''}
          </span>
        </div>
      ) : null}
    </div>
  );
}
