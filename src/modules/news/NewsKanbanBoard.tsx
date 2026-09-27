import gsap from 'gsap';
import { Flip } from 'gsap/Flip';
import { useLayoutEffect, useRef, useState } from 'react';
import { StatusDot } from '@/components/ui/BadgeChip';
import type { NewsItem, NewsStage } from '@/lib/types';
import { cn } from '@/lib/utils';
import { NewsCard } from './NewsCard';
import { NEWS_STAGES, STAGE_LABEL, STAGE_TONE } from './newsMeta';

gsap.registerPlugin(Flip);

export function NewsKanbanBoard({
  items,
  onMove,
  onEdit,
  onDelete,
  onToggleStar,
}: {
  items: NewsItem[];
  onMove: (id: string, stage: NewsStage) => void;
  onEdit: (item: NewsItem) => void;
  onDelete: (id: string) => void;
  onToggleStar: (id: string) => void;
}): JSX.Element {
  const root = useRef<HTMLDivElement>(null);
  const [dropTarget, setDropTarget] = useState<NewsStage | null>(null);
  const signature = items.map((i) => `${i.id}:${i.stage}`).join('|');
  const lastState = useRef<Flip.FlipState | null>(null);

  useLayoutEffect(() => {
    const el = root.current;
    if (!el) return;
    if (lastState.current) {
      Flip.from(lastState.current, {
        duration: 0.45,
        ease: 'power3.inOut',
        absolute: true,
        onEnter: (targets) =>
          gsap.fromTo(targets, { opacity: 0, scale: 0.94 }, { opacity: 1, scale: 1, duration: 0.32 }),
        onLeave: (targets) => gsap.to(targets, { opacity: 0, scale: 0.94, duration: 0.22 }),
      });
    }
    lastState.current = Flip.getState(el.querySelectorAll('[data-flip-card]'));
  }, [signature]);

  return (
    <div ref={root} className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
      {NEWS_STAGES.map((stage) => {
        const column = items
          .filter((i) => i.stage === stage)
          .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

        return (
          <section
            key={stage}
            onDragOver={(e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = 'move';
              if (dropTarget !== stage) setDropTarget(stage);
            }}
            onDragLeave={() => setDropTarget((c) => (c === stage ? null : c))}
            onDrop={(e) => {
              e.preventDefault();
              const id = e.dataTransfer.getData('text/plain');
              setDropTarget(null);
              if (id) onMove(id, stage);
            }}
            className={cn(
              'flex min-h-[220px] flex-col rounded-[10px] bg-[rgb(var(--tint-rgb)/0.012)] p-2.5 transition-[box-shadow,background-color] duration-150',
              dropTarget === stage
                ? 'bg-acid/[0.045] shadow-[inset_0_0_0_1px_rgba(228,242,34,0.35)]'
                : 'shadow-[inset_0_0_0_1px_var(--color-graphite)]',
            )}
          >
            <header className="mb-2.5 flex items-center gap-2 px-1">
              <StatusDot tone={STAGE_TONE[stage]} />
              <h3 className="text-[12.5px] font-medium tracking-[-0.011em] text-mist">{STAGE_LABEL[stage]}</h3>
              <span className="mono num ml-auto rounded-[4px] bg-[rgb(var(--tint-rgb)/0.05)] px-1.5 py-[1px] text-[10.5px] text-ash">
                {column.length}
              </span>
            </header>

            <div className="flex flex-col gap-2">
              {column.map((item) => (
                <div key={item.id} data-flip-card>
                  <NewsCard
                    item={item}
                    draggable
                    compact
                    onEdit={() => onEdit(item)}
                    onDelete={() => onDelete(item.id)}
                    onToggleStar={() => onToggleStar(item.id)}
                  />
                </div>
              ))}
              {column.length === 0 ? (
                <p className="px-1 py-5 text-center text-[11.5px] text-ash/70">Drop a story here</p>
              ) : null}
            </div>
          </section>
        );
      })}
    </div>
  );
}
