import * as Dialog from '@radix-ui/react-dialog';
import { Check, Clock, Copy, ExternalLink, FolderOpen, Star, Trash2, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { TagInput } from '@/components/ui/TagInput';
import type { SavedLink } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/state/languageStore';
import { formatDateTimeT, KIND_META } from './linkIntel';
import { KindBadge, LinkMedia, SiteIcon } from './LinkVisuals';

/**
 * The "open" state of a saved link: videos and audio play right here in a
 * sandboxed player; everything else shows its preview, and every field
 * (title, note, tags, collection) edits in place and saves on its own.
 */
export function LinkPreview({
  link,
  collections,
  onClose,
  onPatch,
  onDelete,
  onVisit,
}: {
  link: SavedLink | null;
  collections: string[];
  onClose: () => void;
  onPatch: (id: string, patch: Partial<SavedLink>) => void;
  onDelete: (link: SavedLink) => void;
  onVisit: (link: SavedLink) => void;
}): JSX.Element {
  const { t, locale } = useLanguage();
  /* "Inbox" is stored in English; show it in the UI language. */
  const showColl = (c: string): string => (c === 'Inbox' ? t('si.inbox') : c);
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [collection, setCollection] = useState('');
  const [playing, setPlaying] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!link) return;
    setTitle(link.title);
    setNote(link.note);
    setCollection(showColl(link.collection));
    setPlaying(Boolean(link.embedUrl));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [link?.id]);

  const commit = (patch: Partial<SavedLink>): void => {
    if (link) onPatch(link.id, patch);
  };

  const color = link ? (link.accent ?? KIND_META[link.kind].color) : '#888';

  return (
    <Dialog.Root open={Boolean(link)} onOpenChange={(o) => (!o ? onClose() : undefined)}>
      <Dialog.Portal>
        <Dialog.Overlay className="save-preview-overlay fixed inset-0 z-50" />
        <Dialog.Content
          className="save-preview modal-frame fixed left-1/2 top-1/2 z-50 flex max-h-[92dvh] w-[calc(100vw-20px)] max-w-[1080px] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-[18px] lg:flex-row"
          style={{ ['--c' as string]: color }}
          aria-describedby={undefined}
        >
          {link ? (
            <>
              <div className="save-preview-stage relative min-h-0 lg:flex-[1.55]">
                {playing && link.embedUrl ? (
                  <div className={cn('relative w-full', link.kind === 'audio' ? 'h-[352px]' : 'aspect-video')}>
                    <iframe
                      src={link.embedUrl}
                      title={link.title}
                      className="absolute inset-0 h-full w-full border-0"
                      allow="autoplay; encrypted-media; picture-in-picture; fullscreen; clipboard-write"
                      allowFullScreen
                      referrerPolicy="strict-origin-when-cross-origin"
                      sandbox="allow-scripts allow-same-origin allow-presentation allow-popups allow-popups-to-escape-sandbox"
                    />
                  </div>
                ) : (
                  <button
                    type="button"
                    className="block w-full"
                    onClick={() => (link.embedUrl ? setPlaying(true) : onVisit(link))}
                    aria-label={link.embedUrl ? t('si.playHere') : t('si.openWebsite')}
                  >
                    <LinkMedia link={link} ratio="16 / 9" />
                  </button>
                )}
                <div className="save-preview-glow pointer-events-none absolute inset-x-0 -bottom-24 h-40" aria-hidden />
              </div>

              <div className="scroll-y flex min-h-0 flex-1 flex-col gap-4 p-5">
                <div className="flex items-start gap-2">
                  <div className="flex min-w-0 flex-1 items-center gap-2 text-[12px] text-ash">
                    <SiteIcon link={link} size={16} />
                    <span className="truncate">{link.siteName || link.domain}</span>
                    <KindBadge kind={link.kind} />
                  </div>
                  <Dialog.Close className="btn-icon shrink-0" aria-label={t('si.close')}>
                    <X size={16} strokeWidth={1.8} />
                  </Dialog.Close>
                </div>

                <div>
                  <Dialog.Title className="sr-only">{link.title}</Dialog.Title>
                  <textarea
                    value={title}
                    rows={2}
                    onChange={(e) => setTitle(e.target.value)}
                    onBlur={() => title.trim() && title !== link.title && commit({ title: title.trim().slice(0, 300) })}
                    aria-label={t('si.title')}
                    className="save-title-input w-full resize-none bg-transparent text-[19px] font-medium leading-[1.3] tracking-[-0.018em] text-paper outline-none"
                  />
                  {link.description ? <p className="mt-1 text-[13px] leading-[1.6] text-fog">{link.description}</p> : null}
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => onVisit(link)}
                    className="mono mt-2 block truncate text-[11.5px] text-ash underline-offset-2 hover:text-mist hover:underline"
                  >
                    {link.url}
                  </a>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button type="button" className="btn btn-primary" onClick={() => onVisit(link)}>
                    <ExternalLink size={13} strokeWidth={2} /> {t('si.openSite')}
                  </button>
                  <button
                    type="button"
                    className={cn('btn btn-ghost', link.isInteresting && 'text-[#f5a524]')}
                    onClick={() => commit({ isInteresting: !link.isInteresting })}
                    aria-pressed={link.isInteresting}
                  >
                    <Star size={13} strokeWidth={2} fill={link.isInteresting ? 'currentColor' : 'none'} />
                    {link.isInteresting ? t('si.favorite') : t('si.addFavorite')}
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => {
                      void navigator.clipboard?.writeText(link.url).then(() => {
                        setCopied(true);
                        window.setTimeout(() => setCopied(false), 1200);
                      });
                    }}
                  >
                    {copied ? <Check size={13} strokeWidth={2.4} /> : <Copy size={13} strokeWidth={2} />}
                    {copied ? t('si.copied') : t('si.copy')}
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => commit({ status: link.status === 'read' ? 'unread' : 'read' })}
                  >
                    {link.status === 'read' ? t('si.markUnread') : t('si.markRead')}
                  </button>
                </div>

                <div>
                  <label htmlFor="save-note" className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.06em] text-ash">
                    {t('si.note')}
                  </label>
                  <textarea
                    id="save-note"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    onBlur={() => note !== link.note && commit({ note: note.slice(0, 10000) })}
                    placeholder={t('si.notePlaceholder')}
                    rows={4}
                    className="field resize-y text-[13px] leading-[1.6]"
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="save-coll" className="mb-1.5 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.06em] text-ash">
                      <FolderOpen size={12} strokeWidth={2} aria-hidden /> {t('si.collection')}
                    </label>
                    <input
                      id="save-coll"
                      list="save-collections"
                      value={collection}
                      onChange={(e) => setCollection(e.target.value)}
                      onBlur={() => {
                        const typed = collection.trim().slice(0, 80);
                        const v = !typed || typed === t('si.inbox') ? 'Inbox' : typed;
                        setCollection(showColl(v));
                        if (v !== link.collection) commit({ collection: v });
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                      }}
                      className="field text-[13px]"
                    />
                    <datalist id="save-collections">
                      {collections.map((c) => (
                        <option key={c} value={showColl(c)} />
                      ))}
                    </datalist>
                  </div>
                  <div>
                    <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.06em] text-ash">{t('si.tags')}</span>
                    <TagInput tags={link.tags} onChange={(tags) => commit({ tags })} placeholder={t('si.addTag')} />
                  </div>
                </div>

                <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-graphite pt-3 text-[11.5px] text-ash">
                  <span>{t('si.savedAt', { date: formatDateTimeT(link.createdAt, locale) })}</span>
                  {link.openedAt ? <span>{t('si.openedAt', { date: formatDateTimeT(link.openedAt, locale) })}</span> : null}
                  {link.readingMinutes ? (
                    <span className="inline-flex items-center gap-1">
                      <Clock size={11} strokeWidth={2} aria-hidden /> {t('si.minRead', { count: link.readingMinutes })}
                    </span>
                  ) : null}
                  <button
                    type="button"
                    className="ms-auto inline-flex items-center gap-1.5 rounded-[6px] px-2 py-1 text-coral hover:bg-coral/10"
                    onClick={() => onDelete(link)}
                  >
                    <Trash2 size={12.5} strokeWidth={2} /> {t('si.moveToTrash')}
                  </button>
                </div>
              </div>
            </>
          ) : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
