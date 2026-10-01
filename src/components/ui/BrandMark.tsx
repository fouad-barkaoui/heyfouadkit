import { cn } from '@/lib/utils';

/** Public path of the avatar used as the app's logo (head-and-shoulders crop). */
export const AVATAR_SRC = '/avatar-256.png';

export const BRAND_NAME = 'Kanz';

/**
 * The app's logo: Fouad's avatar on a soft paper tile. A light sheen sweeps
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
        src={AVATAR_SRC}
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
