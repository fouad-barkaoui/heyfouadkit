import { useState } from 'react';
import { cn } from '@/lib/utils';
import { getInitials } from '@/state/authStore';

/** Stable hue from a name, so a person's fallback tile never changes colour. */
function hueFor(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 360;
  return h;
}

/**
 * A person's picture, or their initials on a tile tinted from their name.
 * `pro` wraps it in the gold ring used everywhere a Pro account appears.
 */
export function Avatar({
  src,
  name,
  size = 32,
  pro = false,
  className,
}: {
  src: string | null | undefined;
  name: string;
  size?: number;
  pro?: boolean;
  className?: string;
}): JSX.Element {
  // Keyed by src so a stale load/error from a previous picture can't leak
  // into the next one (no reset effect racing the image's own load event).
  const [loadedSrc, setLoadedSrc] = useState<string | null>(null);
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const loaded = Boolean(src) && loadedSrc === src;
  const showImage = Boolean(src) && failedSrc !== src;
  const hue = hueFor(name || '?');

  return (
    <span
      className={cn('avatar relative inline-flex shrink-0 items-center justify-center rounded-full', pro && 'avatar-pro', className)}
      style={{ width: size, height: size, ['--hue' as string]: hue }}
      aria-hidden
    >
      <span className="avatar-inner absolute inset-0 overflow-hidden rounded-full">
        {showImage ? (
          <img
            key={src ?? ''}
            ref={(el) => {
              if (el && el.complete && el.naturalWidth > 0 && src && loadedSrc !== src) setLoadedSrc(src);
            }}
            src={src ?? undefined}
            alt=""
            draggable={false}
            decoding="async"
            onLoad={() => setLoadedSrc(src ?? null)}
            onError={() => setFailedSrc(src ?? null)}
            className={cn(
              'h-full w-full select-none object-cover transition-[opacity,transform] duration-500 ease-[var(--ease-out-quint)]',
              loaded ? 'scale-100 opacity-100' : 'scale-[1.06] opacity-0',
            )}
          />
        ) : (
          <span
            className="avatar-fallback flex h-full w-full items-center justify-center font-medium text-white"
            style={{ fontSize: Math.max(9, Math.round(size * 0.38)) }}
          >
            {getInitials(name)}
          </span>
        )}
      </span>
    </span>
  );
}
