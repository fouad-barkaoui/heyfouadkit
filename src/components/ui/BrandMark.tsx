import { cn } from '@/lib/utils';

/**
 * The "B" monogram — Barkaoui's Kit. A geometric B drawn as a single
 * even-odd path on a 32-unit grid: one stem, a slightly smaller upper bowl
 * sitting on a fuller lower bowl, counters cut out so it reads at 14px.
 * The same path feeds the rail logo, the loader and the favicon/PWA icons.
 */
export const B_PATH =
  'M9 6.5H17.9C21.2 6.5 23.2 8.4 23.2 11.1C23.2 12.9 22.3 14.3 20.8 15.05C22.9 15.7 24.4 17.4 24.4 19.9C24.4 23.1 22 25.5 18.4 25.5H9Z' +
  'M13 10V14H17.4C18.7 14 19.45 13.25 19.45 12C19.45 10.75 18.7 10 17.4 10Z' +
  'M13 17.2V22H17.9C19.55 22 20.55 21.1 20.55 19.6C20.55 18.1 19.55 17.2 17.9 17.2Z';

export function BMonogram({ size, fill = 'currentColor' }: { size: number; fill?: string }): JSX.Element {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} aria-hidden>
      <path d={B_PATH} fill={fill} fillRule="evenodd" transform="translate(-0.7 0)" />
    </svg>
  );
}

/** Acid tile with the monogram — the app's logo. A slow sheen sweeps it on hover. */
export function BrandMark({ size = 36, className }: { size?: number; className?: string }): JSX.Element {
  return (
    <span
      className={cn('brand-mark relative flex shrink-0 items-center justify-center overflow-hidden bg-acid', className)}
      style={{ width: size, height: size, borderRadius: Math.round(size * 0.3) }}
      aria-hidden
    >
      <BMonogram size={Math.round(size * 0.62)} fill="#08090a" />
    </span>
  );
}
