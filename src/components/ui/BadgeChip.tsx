import { cn, tint } from '@/lib/utils';
import type { Badge } from '@/lib/types';
import { DynamicIcon } from './Icon';

/**
 * Badge pill — rounded, soft tinted fill, coloured hairline stroke, leading
 * icon. Every colour is derived from the badge's single stored hex.
 */
export function BadgeChip({
  badge,
  size = 'md',
  interactive = false,
  active = false,
  onClick,
  className,
}: {
  badge: Badge;
  size?: 'sm' | 'md';
  interactive?: boolean;
  active?: boolean;
  onClick?: () => void;
  className?: string;
}): JSX.Element {
  const style = {
    backgroundColor: tint(badge.colorHex, active ? 0.2 : 0.11),
    color: badge.colorHex,
    boxShadow: `inset 0 0 0 1px ${tint(badge.colorHex, active ? 0.55 : 0.3)}`,
  };

  const content = (
    <>
      <DynamicIcon name={badge.iconName} size={size === 'sm' ? 11 : 12.5} />
      <span className="truncate">{badge.name}</span>
    </>
  );

  const base = cn(
    'inline-flex items-center gap-1.5 rounded-full font-normal max-w-full',
    size === 'sm' ? 'px-2 py-[2px] text-[11px]' : 'px-2.5 py-[3px] text-[12px]',
    interactive && 'cursor-pointer transition-[box-shadow,background-color] duration-150',
    className,
  );

  if (interactive) {
    return (
      <button type="button" onClick={onClick} className={base} style={style} data-active={active}>
        {content}
      </button>
    );
  }

  return (
    <span className={base} style={style}>
      {content}
    </span>
  );
}

/** Neutral metadata tag — greys only, per the "no chromatic body copy" rule. */
export function Tag({ children, className }: { children: React.ReactNode; className?: string }): JSX.Element {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-[4px] bg-white/5 px-1.5 py-[1px] text-[11px] text-fog',
        className,
      )}
    >
      {children}
    </span>
  );
}

const STATUS_COLOR = {
  neutral: '#8a8f98',
  success: '#27a644',
  danger: '#eb5757',
  info: '#6366f1',
  accent: '#e4f222',
  violet: '#8b5cf6',
  teal: '#02b8cc',
} as const;

export type StatusTone = keyof typeof STATUS_COLOR;

export function StatusDot({ tone, className }: { tone: StatusTone; className?: string }): JSX.Element {
  return (
    <span
      className={cn('inline-block h-[6px] w-[6px] shrink-0 rounded-full', className)}
      style={{ backgroundColor: STATUS_COLOR[tone], boxShadow: `0 0 8px ${tint(STATUS_COLOR[tone], 0.7)}` }}
      aria-hidden
    />
  );
}

export function StatusBadge({
  tone,
  children,
  className,
}: {
  tone: StatusTone;
  children: React.ReactNode;
  className?: string;
}): JSX.Element {
  const color = STATUS_COLOR[tone];
  return (
    <span
      className={cn('inline-flex items-center gap-1.5 rounded-[4px] px-1.5 py-[2px] text-[11px]', className)}
      style={{ backgroundColor: tint(color, 0.12), color, boxShadow: `inset 0 0 0 1px ${tint(color, 0.26)}` }}
    >
      {children}
    </span>
  );
}
