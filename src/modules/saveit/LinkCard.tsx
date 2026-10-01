import { Check, Clock, Copy, ExternalLink, Star, Trash2 } from 'lucide-react';
import { useRef, useState, type CSSProperties, type MouseEvent, type PointerEvent } from 'react';
import type { SavedLink } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/state/languageStore';
import { KIND_META, relativeTimeT } from './linkIntel';
import { KindBadge, LinkMedia, SiteIcon } from './LinkVisuals';

export interface LinkActions {
  onOpen: (link: SavedLink) => void;
  onToggleStar: (link: SavedLink) => void;
  onDelete: (link: SavedLink) => void;
  onVisit: (link: SavedLink) => void;
}

function useCopy(): [boolean, (text: string) => void] {
  const [copied, setCopied] = useState(false);
  return [
    copied,
    (text) => {
      void navigator.clipboard?.writeText(text).then(() => {
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1200);
      });
    },
  ];
}

function stop(fn: () => void) {
  return (e: MouseEvent) => {
    e.stopPropagation();
    fn();
  };
}

/** Masonry card: tilts toward the pointer, the picture parallaxes inside it. */
export function LinkCard({
  link,
  enriching,
  highlighted,
  index,
  ...actions
}: LinkActions & { link: SavedLink; enriching: boolean; highlighted: boolean; index: number }): JSX.Element {
  const ref = useRef<HTMLElement>(null);
  const { t, locale } = useLanguage();
  const [copied, copy] = useCopy();
  const ratio = link.kind === 'video' ? '16 / 9' : link.kind === 'repo' ? '2 / 1' : link.image ? undefined : '16 / 10';

  const onMove = (e: PointerEvent<HTMLElement>): void => {
    if (e.pointerType !== 'mouse') return;
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    el.style.setProperty('--rx', `${(0.5 - y) * 7}deg`);
    el.style.setProperty('--ry', `${(x - 0.5) * 9}deg`);
    el.style.setProperty('--mx', `${x * 100}%`);
    el.style.setProperty('--my', `${y * 100}%`);
  };
  const onLeave = (): void => {
    ref.current?.style.setProperty('--rx', '0deg');
    ref.current?.style.setProperty('--ry', '0deg');
  };

  return (
    <article
      ref={ref}
      data-link-id={link.id}
      className={cn('save-card group relative mb-4 break-inside-avoid', highlighted && 'is-highlighted', enriching && 'is-enriching')}
      style={{ ['--i' as string]: Math.min(index, 18), ['--k' as string]: KIND_META[link.kind].color } as CSSProperties}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
    >
      <button
        type="button"
        className="save-card-inner block w-full text-start"
        onClick={() => actions.onOpen(link)}
        aria-label={t('si.openLink', { title: link.title })}
      >
        <LinkMedia link={link} ratio={ratio} className={cn(!ratio && 'max-h-[320px] min-h-[120px]')} />
        <div className="relative p-3.5">
          <div className="mb-2 flex items-center gap-2 text-[11.5px] text-ash">
            <SiteIcon link={link} size={15} />
            <span className="min-w-0 truncate">{link.siteName || link.domain}</span>
            <span aria-hidden>·</span>
            <span className="shrink-0">{relativeTimeT(link.createdAt, locale)}</span>
            {link.status === 'unread' ? <span className="save-unread ms-auto" title={t('si.unread')} aria-label={t('si.unread')} /> : null}
          </div>
          {enriching ? (
            <div className="space-y-1.5 py-0.5" aria-label={t('si.fetching')}>
              <div className="save-skel h-3.5 w-[92%]" />
              <div className="save-skel h-3.5 w-[64%]" />
            </div>
          ) : (
            <h3 className="line-clamp-2 text-[14px] font-medium leading-[1.35] tracking-[-0.012em] text-paper">{link.title}</h3>
          )}
          {link.description && !enriching ? (
            <p className="mt-1.5 line-clamp-2 text-[12.5px] leading-[1.5] text-ash">{link.description}</p>
          ) : null}
          {link.note ? (
            <p className="save-note mt-2.5 line-clamp-3 rounded-[8px] px-2.5 py-2 text-[12px] leading-[1.5] text-mist">{link.note}</p>
          ) : null}
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <KindBadge kind={link.kind} />
            {link.readingMinutes ? (
              <span className="inline-flex items-center gap-1 text-[11px] text-ash">
                <Clock size={11} strokeWidth={2} aria-hidden /> {t('si.minRead', { count: link.readingMinutes })}
              </span>
            ) : null}
            {link.tags.slice(0, 3).map((t) => (
              <span key={t} className="text-[11px] text-ash">
                #{t}
              </span>
            ))}
          </div>
        </div>
      </button>

      <div className="save-card-actions absolute right-2 top-2 flex gap-1">
        <button
          type="button"
          className={cn('save-fab', link.isInteresting && 'is-on')}
          aria-label={link.isInteresting ? t('si.unfavorite') : t('si.favorite')}
          aria-pressed={link.isInteresting}
          onClick={stop(() => actions.onToggleStar(link))}
        >
          <Star size={14} strokeWidth={2} fill={link.isInteresting ? 'currentColor' : 'none'} />
        </button>
        <button type="button" className="save-fab" aria-label={t('si.copyLink')} onClick={stop(() => copy(link.url))}>
          {copied ? <Check size={14} strokeWidth={2.4} /> : <Copy size={14} strokeWidth={2} />}
        </button>
        <button type="button" className="save-fab" aria-label={t('si.openWebsite')} onClick={stop(() => actions.onVisit(link))}>
          <ExternalLink size={14} strokeWidth={2} />
        </button>
        <button type="button" className="save-fab is-danger" aria-label={t('si.moveToTrash')} onClick={stop(() => actions.onDelete(link))}>
          <Trash2 size={14} strokeWidth={2} />
        </button>
      </div>
      {link.isInteresting ? <Star size={14} className="save-star-flag" fill="currentColor" aria-hidden /> : null}
    </article>
  );
}

export function LinkRow({
  link,
  enriching,
  highlighted,
  ...actions
}: LinkActions & { link: SavedLink; enriching: boolean; highlighted: boolean }): JSX.Element {
  const [copied, copy] = useCopy();
  const { t } = useLanguage();
  return (
    <div
      data-link-id={link.id}
      data-stagger
      className={cn('save-row group relative flex items-center gap-3 rounded-[12px] p-2 pe-3', highlighted && 'is-highlighted')}
    >
      <button type="button" onClick={() => actions.onOpen(link)} className="flex min-w-0 flex-1 items-center gap-3 text-start">
        <LinkMedia link={link} ratio="16 / 10" className="w-[112px] shrink-0 rounded-[8px] sm:w-[132px]" showPlay={false} />
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2 text-[11.5px] text-ash">
            <SiteIcon link={link} size={13} />
            <span className="truncate">{link.domain}</span>
            {link.status === 'unread' ? <span className="save-unread" aria-label={t('si.unread')} /> : null}
          </span>
          <span className={cn('mt-0.5 block truncate text-[13.5px] text-paper', enriching && 'opacity-60')}>{link.title}</span>
          <span className="mt-1 flex items-center gap-2">
            <KindBadge kind={link.kind} />
            <span className="truncate text-[11.5px] text-ash">{link.description || link.url}</span>
          </span>
        </span>
      </button>
      <div className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          className={cn('btn-icon', link.isInteresting && 'text-[#f5a524]')}
          aria-label={link.isInteresting ? t('si.unfavorite') : t('si.favorite')}
          onClick={() => actions.onToggleStar(link)}
        >
          <Star size={14} strokeWidth={2} fill={link.isInteresting ? 'currentColor' : 'none'} />
        </button>
        <button type="button" className="btn-icon" aria-label={t('si.copyLink')} onClick={() => copy(link.url)}>
          {copied ? <Check size={14} strokeWidth={2.4} /> : <Copy size={14} strokeWidth={2} />}
        </button>
        <button type="button" className="btn-icon" aria-label={t('si.openWebsite')} onClick={() => actions.onVisit(link)}>
          <ExternalLink size={14} strokeWidth={2} />
        </button>
        <button type="button" className="btn-icon btn-icon-danger" aria-label={t('si.moveToTrash')} onClick={() => actions.onDelete(link)}>
          <Trash2 size={14} strokeWidth={2} />
        </button>
      </div>
    </div>
  );
}
