import gsap from 'gsap';
import { useLayoutEffect, useRef, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * Module-to-module transition. The pane lifts in from below with the blur
 * clearing — the same "camera settling" feel the 3D field has behind it.
 */
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
    if (!el) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        el,
        { opacity: 0, y: 14, filter: 'blur(10px)', scale: 0.994 },
        { opacity: 1, y: 0, filter: 'blur(0px)', scale: 1, duration: 0.52, ease: 'power3.out' },
      );
    }, el);
    return () => ctx.revert();
  }, [id]);

  return (
    <div ref={ref} className={cn('flex h-full min-h-0 min-w-0 flex-1', className)}>
      {children}
    </div>
  );
}

/**
 * Staggers direct descendants marked `data-stagger` into view. Re-runs whenever
 * `deps` changes, so filtering a list re-reveals it rather than snapping.
 */
export function useStagger(deps: unknown[] = []): React.RefObject<HTMLDivElement> {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const targets = el.querySelectorAll('[data-stagger]');
    if (targets.length === 0) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        targets,
        { opacity: 0, y: 12 },
        {
          opacity: 1,
          y: 0,
          duration: 0.44,
          ease: 'power3.out',
          stagger: { each: 0.035, from: 'start' },
          overwrite: 'auto',
        },
      );
    }, el);
    return () => ctx.revert();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return ref;
}
