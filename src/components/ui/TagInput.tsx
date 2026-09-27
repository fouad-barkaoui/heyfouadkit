import { X } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

export function TagInput({
  tags,
  onChange,
  placeholder = 'Add a tag…',
  className,
}: {
  tags: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  className?: string;
}): JSX.Element {
  const [draft, setDraft] = useState('');

  const commit = (): void => {
    const value = draft.trim().replace(/^#/, '').toLowerCase();
    if (!value || tags.includes(value)) {
      setDraft('');
      return;
    }
    onChange([...tags, value]);
    setDraft('');
  };

  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-1.5 rounded-[6px] border border-[rgb(var(--tint-rgb)/0.08)] bg-[rgb(var(--tint-rgb)/0.02)] px-2 py-[6px]',
        className,
      )}
    >
      {tags.map((tag) => (
        <span
          key={tag}
          className="inline-flex items-center gap-1 rounded-[4px] bg-[rgb(var(--tint-rgb)/0.06)] py-[2px] pl-1.5 pr-1 text-[11.5px] text-mist"
        >
          <span className="text-ash">#</span>
          {tag}
          <button
            type="button"
            aria-label={`Remove tag ${tag}`}
            onClick={() => onChange(tags.filter((t) => t !== tag))}
            className="rounded-[3px] text-ash transition-colors hover:text-coral"
          >
            <X size={11} strokeWidth={2} aria-hidden />
          </button>
        </span>
      ))}
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            commit();
          } else if (e.key === 'Backspace' && !draft && tags.length > 0) {
            onChange(tags.slice(0, -1));
          }
        }}
        placeholder={tags.length === 0 ? placeholder : ''}
        aria-label="Add tag"
        className="min-w-[90px] flex-1 bg-transparent text-[12.5px] text-mist outline-none placeholder:text-ash"
      />
    </div>
  );
}
