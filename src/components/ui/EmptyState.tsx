import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function EmptyState({
  icon,
  title,
  hint,
  action,
  className,
}: {
  icon: ReactNode;
  title: string;
  hint?: string;
  action?: ReactNode;
  className?: string;
}): JSX.Element {
  return (
    <div className={cn('anim-rise flex flex-col items-center justify-center px-6 py-16 text-center', className)}>
      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-[10px] bg-[rgb(var(--tint-rgb)/0.03)] text-ash shadow-[inset_0_0_0_1px_var(--color-graphite)]">
        {icon}
      </div>
      <p className="text-[14px] text-mist">{title}</p>
      {hint ? <p className="mt-1.5 max-w-[320px] text-[12.5px] leading-[1.6] text-ash">{hint}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
