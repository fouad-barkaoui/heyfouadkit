import { cn } from '@/lib/utils';

/** Public path of the Kanz star used as the app's logo. */
export const MARK_SRC = '/kanz-mark-256.png';

export const BRAND_NAME = 'Kanz';

/**
 * The app's logo: the faceted Kanz star on its dark tile. A light sheen sweeps
 * across it on hover, and the tile lifts a touch.
 */
export function BrandMark({
  size = 36,
  className,
  round = false,
}: {
  size?: number;
  className?: string;
  round?: boolean;
}): JSX.Element {
  return (
    <span
      className={cn('brand-mark relative flex shrink-0 items-center justify-center overflow-hidden', className)}
      style={{ width: size, height: size, borderRadius: round ? 9999 : Math.round(size * 0.3) }}
      aria-hidden
    >
      <img
        src={MARK_SRC}
        alt=""
        width={size}
        height={size}
        draggable={false}
        decoding="async"
        className="h-full w-full select-none object-cover"
      />
    </span>
  );
}
