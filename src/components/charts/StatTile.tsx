import gsap from 'gsap';
import { useLayoutEffect, useRef, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

/** Headline number — the form to reach for when there is nothing to compare. */
export function StatTile({
  icon,
  label,
  value,
  detail,
  suffix,
  className,
}: {
  icon: ReactNode;
  label: string;
  value: number;
  detail?: ReactNode;
  suffix?: string;
  className?: string;
}): JSX.Element {
  const numberRef = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const el = numberRef.current;
    if (!el) return;
    const counter = { v: 0 };
    const ctx = gsap.context(() => {
      gsap.to(counter, {
        v: value,
        duration: 0.9,
        ease: 'power3.out',
        onUpdate: () => {
          el.textContent = String(Math.round(counter.v));
        },
      });
    });
    return () => ctx.revert();
  }, [value]);

  return (
    <div
      data-stagger
      className={cn(
        'surface-card flex flex-col p-4 transition-[box-shadow] duration-150 hover:shadow-[inset_0_0_0_1px_var(--color-smoke)]',
        className,
      )}
    >
      <div className="mb-3 flex items-center gap-2.5">
        <span className="flex h-7 w-7 items-center justify-center rounded-[7px] bg-[rgb(var(--tint-rgb)/0.045)] text-fog">
          {icon}
        </span>
        <span className="text-[11.5px] uppercase tracking-[0.07em] text-ash">{label}</span>
      </div>
      <p className="num text-[30px] font-medium leading-none tracking-[-0.022em] text-paper">
        <span ref={numberRef}>0</span>
        {suffix ? <span className="ml-1 text-[15px] text-ash">{suffix}</span> : null}
      </p>
      {detail ? <p className="mt-2 text-[11.5px] leading-[1.5] text-ash">{detail}</p> : null}
    </div>
  );
}
