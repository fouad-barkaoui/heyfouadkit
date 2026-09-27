import gsap from 'gsap';
import { Flip } from 'gsap/Flip';
import { useLayoutEffect, useRef, useState } from 'react';
import { StatusDot } from '@/components/ui/BadgeChip';
import type { TaskStatus, Todo } from '@/lib/types';
import { cn } from '@/lib/utils';
import { TaskCard } from './TaskCard';
import { KANBAN_COLUMNS, PRIORITY_WEIGHT, STATUS_LABEL, STATUS_TONE } from './taskMeta';

gsap.registerPlugin(Flip);

export function KanbanBoard({
  todos,
  onMove,
  onToggleDone,
  onEdit,
  onDelete,
  onToggleStar,
}: {
  todos: Todo[];
  onMove: (id: string, status: TaskStatus) => void;
  onToggleDone: (todo: Todo) => void;
  onEdit: (todo: Todo) => void;
  onDelete: (id: string) => void;
  onToggleStar: (id: string) => void;
}): JSX.Element {
  const root = useRef<HTMLDivElement>(null);
  const [dropTarget, setDropTarget] = useState<TaskStatus | null>(null);
  const signature = todos.map((t) => `${t.id}:${t.status}`).join('|');
  const lastState = useRef<Flip.FlipState | null>(null);

  // GSAP Flip: cards travel to their new column instead of teleporting.
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
    <div ref={root} className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {KANBAN_COLUMNS.map((status) => {
        const column = todos
          .filter((t) => t.status === status)
          .sort((a, b) => PRIORITY_WEIGHT[b.priority] - PRIORITY_WEIGHT[a.priority]);

        return (
          <section
            key={status}
            onDragOver={(e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = 'move';
              if (dropTarget !== status) setDropTarget(status);
            }}
            onDragLeave={() => setDropTarget((c) => (c === status ? null : c))}
            onDrop={(e) => {
              e.preventDefault();
              const id = e.dataTransfer.getData('text/plain');
              setDropTarget(null);
              if (id) onMove(id, status);
            }}
            className={cn(
              'flex min-h-[220px] flex-col rounded-[10px] bg-[rgb(var(--tint-rgb)/0.012)] p-2.5 transition-[box-shadow,background-color] duration-150',
              dropTarget === status
                ? 'bg-acid/[0.045] shadow-[inset_0_0_0_1px_rgba(228,242,34,0.35)]'
                : 'shadow-[inset_0_0_0_1px_var(--color-graphite)]',
            )}
          >
            <header className="mb-2.5 flex items-center gap-2 px-1">
              <StatusDot tone={STATUS_TONE[status]} />
              <h3 className="text-[12.5px] font-medium tracking-[-0.011em] text-mist">{STATUS_LABEL[status]}</h3>
              <span className="mono num ml-auto rounded-[4px] bg-[rgb(var(--tint-rgb)/0.05)] px-1.5 py-[1px] text-[10.5px] text-ash">
                {column.length}
              </span>
            </header>

            <div className="flex flex-col gap-2">
              {column.map((todo) => (
                <div key={todo.id} data-flip-card>
                  <TaskCard
                    todo={todo}
                    draggable
                    compact
                    onToggleDone={() => onToggleDone(todo)}
                    onEdit={() => onEdit(todo)}
                    onDelete={() => onDelete(todo.id)}
                    onToggleStar={() => onToggleStar(todo.id)}
                  />
                </div>
              ))}
              {column.length === 0 ? (
                <p className="px-1 py-5 text-center text-[11.5px] text-ash/70">Drop a card here</p>
              ) : null}
            </div>
          </section>
        );
      })}
    </div>
  );
}
