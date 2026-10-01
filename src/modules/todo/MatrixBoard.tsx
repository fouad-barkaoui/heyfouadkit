import { StatusDot } from '@/components/ui/BadgeChip';
import type { Todo } from '@/lib/types';
import { useLanguage } from '@/state/languageStore';
import { TaskCard } from './TaskCard';
import { matrixQuadrant, QUADRANTS } from './taskMeta';

/** Eisenhower matrix — importance from priority, urgency from the due date. */
export function MatrixBoard({
  todos,
  onToggleDone,
  onEdit,
  onDelete,
  onToggleStar,
}: {
  todos: Todo[];
  onToggleDone: (todo: Todo) => void;
  onEdit: (todo: Todo) => void;
  onDelete: (id: string) => void;
  onToggleStar: (id: string) => void;
}): JSX.Element {
  const { t } = useLanguage();
  const open = todos.filter((t) => t.status !== 'completed' && t.status !== 'archived');

  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
      {QUADRANTS.map((quadrant) => {
        const items = open.filter((t) => matrixQuadrant(t) === quadrant.id);
        return (
          <section
            key={quadrant.id}
            className="flex min-h-[190px] flex-col rounded-[10px] bg-[rgb(var(--tint-rgb)/0.012)] p-3 shadow-[inset_0_0_0_1px_var(--color-graphite)]"
          >
            <header className="mb-3 flex items-baseline gap-2">
              <StatusDot tone={quadrant.tone} className="translate-y-[-2px]" />
              <h3 className="text-[13px] font-medium tracking-[-0.012em] text-paper">{t(quadrant.titleKey)}</h3>
              <span className="text-[11.5px] text-ash">{t(quadrant.hintKey)}</span>
              <span className="mono num ml-auto text-[11px] text-ash">{items.length}</span>
            </header>
            <div className="flex flex-col gap-2">
              {items.map((todo) => (
                <TaskCard
                  key={todo.id}
                  todo={todo}
                  compact
                  onToggleDone={() => onToggleDone(todo)}
                  onEdit={() => onEdit(todo)}
                  onDelete={() => onDelete(todo.id)}
                  onToggleStar={() => onToggleStar(todo.id)}
                />
              ))}
              {items.length === 0 ? (
                <p className="py-5 text-center text-[11.5px] text-ash/70">{t('task.matrix.empty')}</p>
              ) : null}
            </div>
          </section>
        );
      })}
    </div>
  );
}
