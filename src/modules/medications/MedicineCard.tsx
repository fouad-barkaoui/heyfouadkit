import { Check, Hourglass } from 'lucide-react';
import { StatusBadge } from '@/components/ui/BadgeChip';
import type { Medicine } from '@/lib/types';
import { cn } from '@/lib/utils';
import { formatDaysShort, frequencyLabel } from './medsMeta';

export function MedicineCard({ medicine, onClick }: { medicine: Medicine; onClick: () => void }): JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-3 rounded-[10px] bg-[rgb(var(--tint-rgb)/0.022)] p-3 text-left shadow-[inset_0_0_0_1px_var(--color-graphite)]',
        'transition-[background-color,box-shadow] duration-150 hover:bg-[rgb(var(--tint-rgb)/0.04)] hover:shadow-[inset_0_0_0_1px_var(--color-smoke)]',
        medicine.completed && 'opacity-55',
      )}
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[9px] bg-[rgb(var(--tint-rgb)/0.05)] text-accent">
        {medicine.completed ? (
          <Check size={15} strokeWidth={2} className="text-pulse" />
        ) : (
          <Hourglass size={14} strokeWidth={1.8} />
        )}
      </span>
      <div className="min-w-0 flex-1">
        <p className={cn('truncate text-[13.5px] text-paper', medicine.completed && 'line-through')}>
          {medicine.name}
        </p>
        <p className="mt-0.5 truncate text-[11.5px] text-ash">
          {medicine.dosage} {medicine.unit}
          {medicine.type === 'scheduled' ? ` · ${formatDaysShort(medicine.days)}` : ''}
        </p>
      </div>
      <StatusBadge tone={medicine.type === 'as_needed' ? 'info' : 'accent'} className="shrink-0">
        {frequencyLabel(medicine)}
      </StatusBadge>
    </button>
  );
}
