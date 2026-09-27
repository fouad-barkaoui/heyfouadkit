import { HeartPulse } from 'lucide-react';
import { StatusBadge } from '@/components/ui/BadgeChip';
import type { Medicine, TreatmentPlan } from '@/lib/types';
import { cn } from '@/lib/utils';

export function TreatmentPlanCard({
  plan,
  medicines,
  onClick,
}: {
  plan: TreatmentPlan;
  medicines: Medicine[];
  onClick: () => void;
}): JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full flex-col gap-2.5 rounded-[12px] bg-[rgb(var(--tint-rgb)/0.022)] p-4 text-left shadow-[inset_0_0_0_1px_var(--color-graphite)]',
        'transition-[background-color,box-shadow] duration-150 hover:bg-[rgb(var(--tint-rgb)/0.04)] hover:shadow-[inset_0_0_0_1px_var(--color-smoke)]',
        plan.status === 'completed' && 'opacity-55',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[9px] bg-lavender/15 text-lavender">
          <HeartPulse size={16} strokeWidth={1.8} />
        </span>
        <StatusBadge tone={plan.status === 'active' ? 'success' : 'neutral'}>
          {plan.status === 'active' ? 'Active' : 'Completed'}
        </StatusBadge>
      </div>
      <div>
        <p className="truncate text-[14px] text-paper">{plan.condition}</p>
        <p className="mt-0.5 truncate text-[11.5px] text-ash">{plan.prescriber}</p>
      </div>
      <p className="text-[11px] text-ash">
        {medicines.length} medicine{medicines.length === 1 ? '' : 's'}
      </p>
    </button>
  );
}
