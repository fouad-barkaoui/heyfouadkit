import { useLayoutEffect, useRef, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

/*
 * Native Web Animations instead of GSAP here: this wrapper sits on the boot
 * path, and opacity/transform keyframes run on the compositor, so module
 * switches stay smooth even while the new module is still mounting. (The old
 * full-pane blur was the single most expensive frame in the app — gone.)
 */

const EASE_OUT = 'cubic-bezier(0.22, 1, 0.36, 1)';

function reducedMotion(): boolean {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

/** Module-to-module transition: the pane settles in from just below. */
export function ViewTransition({
  id,
  children,
  className,
}: {
  id: string;
  children: ReactNode;
  className?: string;
}): JSX.Element {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || typeof el.animate !== 'function' || reducedMotion()) return;
    const anim = el.animate(
      [
        { opacity: 0, transform: 'translate3d(0, 12px, 0) scale(0.996)' },
        { opacity: 1, transform: 'none' },
      ],
      { duration: 420, easing: EASE_OUT },
    );
    return () => anim.cancel();
  }, [id]);

  return (
    <div ref={ref} className={cn('flex h-full min-h-0 min-w-0 flex-1', className)}>
      {children}
    </div>
  );
}

/**
 * Staggers descendants marked `data-stagger` into view. Re-runs whenever
 * `deps` changes, so filtering a list re-reveals it rather than snapping.
 * Long lists only stagger the first screenful; the rest just appear.
 */
export function useStagger(deps: unknown[] = []): React.RefObject<HTMLDivElement> {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || reducedMotion()) return;
    const targets = Array.from(el.querySelectorAll<HTMLElement>('[data-stagger]')).slice(0, 24);
    if (targets.length === 0 || typeof targets[0]!.animate !== 'function') return;
    const anims = targets.map((t, i) =>
      t.animate(
        [
          { opacity: 0, transform: 'translate3d(0, 10px, 0)' },
          { opacity: 1, transform: 'none' },
        ],
        { duration: 380, delay: i * 32, easing: EASE_OUT, fill: 'backwards' },
      ),
    );
    return () => anims.forEach((a) => a.cancel());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return ref;
}
