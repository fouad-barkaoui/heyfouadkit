import { Pencil, Star } from 'lucide-react';
import { StatusBadge } from '@/components/ui/BadgeChip';
import { IconButton } from '@/components/ui/Button';
import { ConfirmDelete } from '@/components/ui/ConfirmDelete';
import type { NewsItem } from '@/lib/types';
import { cn, excerpt, relativeTime } from '@/lib/utils';
import { STAGE_LABEL, STAGE_TONE } from './newsMeta';

export function NewsCard({
  item,
  onEdit,
  onDelete,
  onToggleStar,
  draggable = false,
  compact = false,
}: {
  item: NewsItem;
  onEdit: () => void;
  onDelete: () => void;
  onToggleStar: () => void;
  draggable?: boolean;
  compact?: boolean;
}): JSX.Element {
  return (
    <article
      data-stagger
      draggable={draggable}
      onDragStart={(e) => {
        e.dataTransfer.setData('text/plain', item.id);
        e.dataTransfer.effectAllowed = 'move';
      }}
      onClick={onEdit}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onEdit();
      }}
      className={cn(
        'group relative cursor-pointer rounded-[8px] bg-[rgb(var(--tint-rgb)/0.022)] p-3 shadow-[inset_0_0_0_1px_var(--color-graphite)]',
        'transition-[background-color,box-shadow] duration-150 hover:bg-[rgb(var(--tint-rgb)/0.04)] hover:shadow-[inset_0_0_0_1px_var(--color-smoke)]',
        draggable && 'cursor-grab active:cursor-grabbing',
      )}
    >
      <p className="pr-12 text-[13.5px] leading-[1.4] tracking-[-0.011em] text-paper">{item.title}</p>

      {!compact && item.content ? (
        <p className="mt-1.5 line-clamp-2 text-[12px] leading-[1.55] text-ash">{excerpt(item.content, 110)}</p>
      ) : null}

      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
        <StatusBadge tone={STAGE_TONE[item.stage]}>{STAGE_LABEL[item.stage]}</StatusBadge>
        {item.tags.slice(0, 2).map((tag) => (
          <span key={tag} className="rounded-[4px] bg-white/5 px-1.5 py-[1px] text-[11px] text-fog">
            {tag}
          </span>
        ))}
        <span className="ml-auto text-[10.5px] text-ash/70">{relativeTime(item.updatedAt)}</span>
      </div>

      <div className="absolute right-2 top-2 flex items-center gap-0.5 opacity-0 transition-opacity duration-150 group-hover:opacity-100 focus-within:opacity-100">
        <IconButton
          label={item.isInteresting ? 'Remove from vault' : 'Add to vault'}
          className={cn('h-6 w-6', item.isInteresting && 'text-accent opacity-100')}
          onClick={(e) => {
            e.stopPropagation();
            onToggleStar();
          }}
        >
          <Star size={12.5} strokeWidth={1.9} fill={item.isInteresting ? 'currentColor' : 'none'} />
        </IconButton>
        <IconButton
          label="Edit story"
          className="h-6 w-6"
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
        >
          <Pencil size={12.5} strokeWidth={1.9} />
        </IconButton>
        <span onClick={(e) => e.stopPropagation()}>
          <ConfirmDelete onConfirm={onDelete} label="Delete story" size={12.5} />
        </span>
      </div>
    </article>
  );
}
