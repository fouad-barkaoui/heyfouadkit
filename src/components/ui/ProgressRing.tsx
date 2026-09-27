import gsap from 'gsap';
import { useLayoutEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

/** Circular completion indicator — the arc sweeps to its value on change. */
export function ProgressRing({
  value,
  size = 44,
  stroke = 3,
  color = '#e4f222',
  label,
  className,
}: {
  value: number;
  size?: number;
  stroke?: number;
  color?: string;
  label?: string;
  className?: string;
}): JSX.Element {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const arc = useRef<SVGCircleElement>(null);
  const clamped = Math.max(0, Math.min(100, value));

  useLayoutEffect(() => {
    const el = arc.current;
    if (!el) return;
    const target = circumference * (1 - clamped / 100);
    gsap.to(el, { strokeDashoffset: target, duration: 0.85, ease: 'power3.out' });
  }, [clamped, circumference]);

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--color-graphite)" strokeWidth={stroke} />
        <circle
          ref={arc}
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference}
        />
      </svg>
      <span
        className="num absolute inset-0 flex items-center justify-center text-[11px] font-medium text-paper"
        aria-label={label}
      >
        {Math.round(clamped)}
        <span className="text-[8px] text-ash">%</span>
      </span>
    </div>
  );
}

/** Linear meter for inline use in list rows. */
export function ProgressBar({ value, className }: { value: number; className?: string }): JSX.Element {
  const bar = useRef<HTMLSpanElement>(null);
  const clamped = Math.max(0, Math.min(100, value));

  useLayoutEffect(() => {
    if (!bar.current) return;
    gsap.to(bar.current, { width: `${clamped}%`, duration: 0.7, ease: 'power3.out' });
  }, [clamped]);

  return (
    <span
      className={cn('block h-[3px] w-full overflow-hidden rounded-full bg-[rgb(var(--tint-rgb)/0.07)]', className)}
      role="progressbar"
      aria-valuenow={Math.round(clamped)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <span ref={bar} className="block h-full rounded-full bg-acid" style={{ width: 0 }} />
    </span>
  );
}
