import {
  AppWindow,
  AudioLines,
  Code2,
  FileText,
  Globe,
  Image as ImageIcon,
  MessagesSquare,
  Newspaper,
  PlayCircle,
  type LucideIcon,
} from 'lucide-react';
import { useState, type CSSProperties } from 'react';
import type { LinkKind, SavedLink } from '@/lib/types';
import { cn } from '@/lib/utils';
import { KIND_META } from './linkIntel';

export const KIND_ICON: Record<LinkKind, LucideIcon> = {
  video: PlayCircle,
  article: Newspaper,
  repo: Code2,
  social: MessagesSquare,
  audio: AudioLines,
  pdf: FileText,
  image: ImageIcon,
  website: AppWindow,
};

export function KindBadge({ kind, className }: { kind: LinkKind; className?: string }): JSX.Element {
  const Icon = KIND_ICON[kind];
  const meta = KIND_META[kind];
  return (
    <span
      className={cn('save-kind inline-flex items-center gap-1 rounded-full px-2 py-[2px] text-[10.5px] font-medium', className)}
      style={{ ['--k' as string]: meta.color } as CSSProperties}
    >
      <Icon size={11} strokeWidth={2} aria-hidden />
      {meta.label}
    </span>
  );
}

/** Site icon with a lettered fallback when the favicon can't load. */
export function SiteIcon({ link, size = 16 }: { link: Pick<SavedLink, 'favicon' | 'domain'>; size?: number }): JSX.Element {
  const [failed, setFailed] = useState(false);
  if (!link.favicon || failed) {
    return (
      <span
        className="inline-flex shrink-0 items-center justify-center rounded-[4px] bg-[rgb(var(--tint-rgb)/0.1)] font-semibold uppercase text-mist"
        style={{ width: size, height: size, fontSize: Math.round(size * 0.55) }}
        aria-hidden
      >
        {link.domain.charAt(0) || <Globe size={size * 0.7} />}
      </span>
    );
  }
  return (
    <img
      src={link.favicon}
      alt=""
      width={size}
      height={size}
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className="shrink-0 rounded-[4px] bg-white/90 object-contain"
      style={{ width: size, height: size }}
    />
  );
}

/**
 * The card's picture: the page's preview image, or — when there isn't one or
 * it's hotlink-blocked — a generated poster in the site's own colour.
 */
export function LinkMedia({
  link,
  className,
  ratio,
  showPlay = true,
}: {
  link: SavedLink;
  className?: string;
  ratio?: string;
  showPlay?: boolean;
}): JSX.Element {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const color = link.accent ?? KIND_META[link.kind].color;
  const Icon = KIND_ICON[link.kind];
  const playable = showPlay && Boolean(link.embedUrl);

  return (
    <div
      className={cn('save-media relative overflow-hidden', className)}
      style={{ aspectRatio: ratio, ['--c' as string]: color } as CSSProperties}
    >
      {link.image && !failed ? (
        <>
          <div className={cn('save-media-shimmer absolute inset-0', loaded && 'opacity-0')} aria-hidden />
          <img
            src={link.image}
            alt=""
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            onLoad={() => setLoaded(true)}
            onError={() => setFailed(true)}
            className={cn(
              'save-media-img h-full w-full object-cover transition-[opacity,transform] duration-700 ease-[var(--ease-out-quint)]',
              loaded ? 'opacity-100' : 'scale-[1.04] opacity-0',
            )}
          />
        </>
      ) : (
        <div className="save-poster absolute inset-0 flex flex-col items-center justify-center gap-2 p-4 text-center" aria-hidden>
          <span className="save-poster-icon flex h-12 w-12 items-center justify-center rounded-[14px]">
            {link.favicon ? <SiteIcon link={link} size={26} /> : <Icon size={22} strokeWidth={1.7} />}
          </span>
          <span className="mono max-w-full truncate text-[11px] uppercase tracking-[0.12em] text-white/80">{link.domain}</span>
        </div>
      )}
      {playable ? (
        <span className="save-play absolute inset-0 flex items-center justify-center" aria-hidden>
          <span className="save-play-btn flex h-12 w-12 items-center justify-center rounded-full">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden>
              <path d="M8 5.5v13a1 1 0 0 0 1.52.85l10.4-6.5a1 1 0 0 0 0-1.7L9.52 4.65A1 1 0 0 0 8 5.5Z" />
            </svg>
          </span>
        </span>
      ) : null}
    </div>
  );
}
