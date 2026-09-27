import { Table2 } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * Every chart ships with a table view — identity and value are then never
 * carried by colour alone.
 */
export function ChartFrame({
  title,
  caption,
  legend,
  table,
  children,
  className,
}: {
  title: string;
  caption?: string;
  legend?: ReactNode;
  table: { columns: string[]; rows: (string | number)[][] };
  children: ReactNode;
  className?: string;
}): JSX.Element {
  const [showTable, setShowTable] = useState(false);

  return (
    <figure className={cn('surface-card m-0 p-4', className)}>
      <figcaption className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-[13.5px] font-medium tracking-[-0.012em] text-paper">{title}</h3>
          {caption ? <p className="mt-0.5 text-[11.5px] leading-[1.5] text-ash">{caption}</p> : null}
        </div>
        <button
          type="button"
          aria-pressed={showTable}
          onClick={() => setShowTable((v) => !v)}
          className={cn(
            'flex shrink-0 items-center gap-1.5 rounded-[5px] px-2 py-1 text-[11.5px] transition-colors duration-150',
            showTable ? 'bg-[rgb(var(--tint-rgb)/0.08)] text-mist' : 'text-ash hover:bg-[rgb(var(--tint-rgb)/0.05)] hover:text-mist',
          )}
        >
          <Table2 size={12} strokeWidth={1.8} aria-hidden />
          {showTable ? 'Chart' : 'Table'}
        </button>
      </figcaption>

      {legend ? <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1.5">{legend}</div> : null}

      {showTable ? (
        <div className="scroll-y max-h-[260px] overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-graphite text-[11px] uppercase tracking-[0.06em] text-ash">
                {table.columns.map((col) => (
                  <th key={col} className="px-2 py-1.5 font-medium">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {table.rows.map((row) => (
                <tr key={String(row[0])} className="border-b border-graphite/50 last:border-b-0">
                  {row.map((cell, ci) => (
                    // eslint-disable-next-line react/no-array-index-key
                    <td key={ci} className={cn('px-2 py-1.5 text-[12px]', ci === 0 ? 'text-mist' : 'num text-ash')}>
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        children
      )}
    </figure>
  );
}

export function LegendSwatch({ color, label }: { color: string; label: string }): JSX.Element {
  return (
    <span className="flex items-center gap-1.5 text-[11.5px] text-mist">
      <span className="h-[8px] w-[8px] rounded-[2px]" style={{ background: color }} aria-hidden />
      {label}
    </span>
  );
}
