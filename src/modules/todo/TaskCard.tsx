import { Check, Pencil, Repeat, Star } from 'lucide-react';
import { useRef } from 'react';
import { StatusBadge } from '@/components/ui/BadgeChip';
import { ConfirmDelete } from '@/components/ui/ConfirmDelete';
import { IconButton } from '@/components/ui/Button';
import type { Todo } from '@/lib/types';
import { cn, refCode } from '@/lib/utils';
import { completionBurst } from './burst';
import { dueInfo, PRIORITY_LABEL, PRIORITY_TONE } from './taskMeta';

export function TaskCheckbox({
  done,
  onToggle,
  size = 17,
}: {
  done: boolean;
  onToggle: () => void;
  size?: number;
}): JSX.Element {
  const ref = useRef<HTMLButtonElement>(null);
  return (
    <button
      ref={ref}
      type="button"
      role="checkbox"
      aria-checked={done}
      aria-label={done ? 'Mark as not done' : 'Mark as done'}
      onClick={(e) => {
        e.stopPropagation();
        if (!done && ref.current) completionBurst(ref.current);
        onToggle();
      }}
      className={cn(
        'flex shrink-0 items-center justify-center rounded-[5px] transition-all duration-150',
        done
          ? 'bg-acid text-void'
          : 'text-transparent shadow-[inset_0_0_0_1.25px_var(--color-smoke)] hover:shadow-[inset_0_0_0_1.25px_#8a8f98]',
      )}
      style={{ width: size, height: size }}
    >
      <Check size={size - 6} strokeWidth={3} aria-hidden />
    </button>
  );
}

export function TaskCard({
  todo,
  onToggleDone,
  onEdit,
  onDelete,
  onToggleStar,
  draggable = false,
  compact = false,
}: {
  todo: Todo;
  onToggleDone: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onToggleStar: () => void;
  draggable?: boolean;
  compact?: boolean;
}): JSX.Element {
  const due = dueInfo(todo);
  const done = todo.status === 'completed';

  return (
    <article
      data-stagger
      draggable={draggable}
      onDragStart={(e) => {
        e.dataTransfer.setData('text/plain', todo.id);
        e.dataTransfer.effectAllowed = 'move';
      }}
      className={cn(
        'group relative rounded-[8px] bg-[rgb(var(--tint-rgb)/0.022)] p-3 shadow-[inset_0_0_0_1px_var(--color-graphite)]',
        'transition-[background-color,box-shadow] duration-150 hover:bg-[rgb(var(--tint-rgb)/0.04)] hover:shadow-[inset_0_0_0_1px_var(--color-smoke)]',
        draggable && 'cursor-grab active:cursor-grabbing',
        done && 'opacity-60',
      )}
    >
      <div className="flex items-start gap-2.5">
        <TaskCheckbox done={done} onToggle={onToggleDone} />

        <div className="min-w-0 flex-1">
          <p
            className={cn(
              'text-[13.5px] leading-[1.45] tracking-[-0.011em]',
              done ? 'text-ash line-through' : 'text-paper',
            )}
          >
            {todo.title}
          </p>

          {!compact && todo.description ? (
            <p className="mt-1 line-clamp-2 text-[12px] leading-[1.55] text-ash">{todo.description}</p>
          ) : null}

          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <StatusBadge tone={PRIORITY_TONE[todo.priority]}>{PRIORITY_LABEL[todo.priority]}</StatusBadge>
            {due ? <StatusBadge tone={due.tone}>{due.label}</StatusBadge> : null}
            {todo.recurrence !== 'none' ? (
              <span className="inline-flex items-center gap-1 rounded-[4px] bg-[rgb(var(--tint-rgb)/0.05)] px-1.5 py-[2px] text-[11px] text-fog">
                <Repeat size={10} strokeWidth={1.9} aria-hidden />
                {todo.recurrence}
              </span>
            ) : null}
            <span className="mono ml-auto text-[10.5px] text-ash/70">{refCode('TSK', todo.id)}</span>
          </div>
        </div>
      </div>

      <div className="absolute right-2 top-2 flex items-center gap-0.5 opacity-0 transition-opacity duration-150 group-hover:opacity-100 focus-within:opacity-100">
        <IconButton
          label={todo.isInteresting ? 'Remove from vault' : 'Add to vault'}
          className={cn('h-6 w-6', todo.isInteresting && 'text-accent opacity-100')}
          onClick={onToggleStar}
        >
          <Star size={12.5} strokeWidth={1.9} fill={todo.isInteresting ? 'currentColor' : 'none'} />
        </IconButton>
        <IconButton label="Edit task" className="h-6 w-6" onClick={onEdit}>
          <Pencil size={12.5} strokeWidth={1.9} />
        </IconButton>
        <ConfirmDelete onConfirm={onDelete} label="Delete task" size={12.5} />
      </div>
    </article>
  );
}
