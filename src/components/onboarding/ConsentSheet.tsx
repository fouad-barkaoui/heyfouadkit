import * as Dialog from '@radix-ui/react-dialog';
import { Check, CheckCircle2, ChevronDown, Loader2, X, type LucideIcon } from 'lucide-react';
import { useEffect, useId, useRef, useState, type PointerEvent, type ReactNode } from 'react';
import { MARK_SRC } from '@/components/ui/BrandMark';
import { KanzWordmark } from '@/components/ui/KanzWordmark';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/state/languageStore';

export type ConsentTone = 'green' | 'gold';

/**
 * The consent dialog — a light card, whatever the app theme, laid out like a
 * payments-grade "accept terms" step: a partnership banner up top, a short
 * title and explanation, the legal line boxed with a lock, then one black
 * primary action and a quiet cancel. The banner drifts and parallaxes, the
 * dotted orbit flows, "terms of use" expands in place, and Accept resolves
 * into a checkmark before the sheet closes.
 */
export function ConsentSheet({
  open,
  tone = 'green',
  partner,
  title,
  body,
  boxIcon: BoxIcon,
  box,
  details,
  acceptLabel,
  cancelLabel,
  onAccept,
  onCancel,
  zIndex = 70,
}: {
  open: boolean;
  tone?: ConsentTone;
  /** Right-hand word-mark in the banner, e.g. "CLOUD". */
  partner: string;
  title: string;
  body: ReactNode;
  boxIcon: LucideIcon;
  /** The legal line. Receive a toggle so "terms of use" can open `details`. */
  box: (link: (label: ReactNode) => ReactNode) => ReactNode;
  details?: ReactNode;
  acceptLabel: string;
  cancelLabel?: string;
  onAccept: () => void | Promise<void>;
  onCancel: () => void;
  zIndex?: number;
}): JSX.Element {
  const { t } = useLanguage();
  const [expanded, setExpanded] = useState(false);
  const [phase, setPhase] = useState<'idle' | 'working' | 'done'>('idle');
  const artRef = useRef<HTMLDivElement>(null);
  const noiseId = `consent-noise-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;

  useEffect(() => {
    if (open) {
      setPhase('idle');
      setExpanded(false);
    }
  }, [open]);

  const accept = async (): Promise<void> => {
    if (phase !== 'idle') return;
    setPhase('working');
    await new Promise((r) => window.setTimeout(r, 260));
    setPhase('done');
    await new Promise((r) => window.setTimeout(r, 620));
    await onAccept();
  };

  const onArtMove = (e: PointerEvent<HTMLDivElement>): void => {
    const el = artRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty('--px', String((e.clientX - r.left) / r.width - 0.5));
    el.style.setProperty('--py', String((e.clientY - r.top) / r.height - 0.5));
  };
  const onArtLeave = (): void => {
    artRef.current?.style.setProperty('--px', '0');
    artRef.current?.style.setProperty('--py', '0');
  };

  const toggle = (label: ReactNode): ReactNode => (
    // A span (not a <button>) so the link wraps mid-sentence like real text.
    <span
      role="button"
      tabIndex={0}
      onClick={() => setExpanded((v) => !v)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          setExpanded((v) => !v);
        }
      }}
      aria-expanded={expanded}
      className="consent-link"
    >
      {label}
    </span>
  );

  return (
    <Dialog.Root open={open} onOpenChange={(next) => { if (!next && phase === 'idle') onCancel(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="consent-overlay fixed inset-0" style={{ zIndex }} />
        <Dialog.Content
          onInteractOutside={(e) => e.preventDefault()}
          onOpenAutoFocus={(e) => e.preventDefault()}
          className="consent-card fixed left-1/2 top-1/2 w-[calc(100vw-24px)] max-w-[392px] -translate-x-1/2 -translate-y-1/2"
          style={{ zIndex }}
        >
          <div
            ref={artRef}
            className={cn('consent-art relative overflow-hidden', `is-${tone}`)}
            onPointerMove={onArtMove}
            onPointerLeave={onArtLeave}
          >
            <div className="consent-art-bg absolute inset-0" aria-hidden />
            <svg className="consent-grain absolute inset-0 h-full w-full" aria-hidden>
              <filter id={noiseId}>
                <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch" />
                <feColorMatrix values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.55 0" />
              </filter>
              <rect width="100%" height="100%" filter={`url(#${noiseId})`} />
            </svg>
            <svg className="consent-orbit absolute inset-0 h-full w-full" viewBox="0 0 380 150" preserveAspectRatio="none" aria-hidden>
              <ellipse cx="190" cy="76" rx="150" ry="48" transform="rotate(-14 190 76)" className="consent-orbit-path" />
              <ellipse cx="190" cy="76" rx="150" ry="48" transform="rotate(-14 190 76)" className="consent-orbit-flow" />
            </svg>
            <span className="consent-plus absolute" aria-hidden>+</span>
            <span className="consent-spark consent-spark-a absolute" aria-hidden />
            <span className="consent-spark consent-spark-b absolute" aria-hidden />

            <div className="consent-brand absolute flex items-center gap-2">
              <span className="consent-brand-mark overflow-hidden rounded-[7px]">
                <img src={MARK_SRC} alt="" width={26} height={26} draggable={false} />
              </span>
              <KanzWordmark height={15} gem="currentColor" className="text-white" />
            </div>
            <span className="consent-partner absolute text-[19px] font-bold tracking-[0.02em] text-white">{partner}</span>

            <Dialog.Close asChild>
              <button
                type="button"
                aria-label={t('ob.close')}
                disabled={phase !== 'idle'}
                className="consent-close absolute right-2.5 top-2.5 flex h-7 w-7 items-center justify-center rounded-full text-white"
              >
                <X size={16} strokeWidth={2} />
              </button>
            </Dialog.Close>
          </div>

          <div className="px-[18px] pb-[18px] pt-4">
            <Dialog.Title className="consent-title">{title}</Dialog.Title>
            <Dialog.Description asChild>
              <div className="consent-body">{body}</div>
            </Dialog.Description>

            <div className="consent-box mt-4">
              <BoxIcon size={17} strokeWidth={1.7} className="text-[#1d1c1a]" aria-hidden />
              <div className="consent-box-text mt-2.5">{box(toggle)}</div>
              {details ? (
                <div className={cn('consent-details grid', expanded && 'is-open')}>
                  <div className="min-h-0 overflow-hidden">
                    <div className="consent-details-inner">{details}</div>
                  </div>
                </div>
              ) : null}
              {details ? (
                <button
                  type="button"
                  onClick={() => setExpanded((v) => !v)}
                  className="consent-more mt-2"
                  aria-expanded={expanded}
                >
                  {expanded ? t('ob.hideDetails') : t('ob.readDetails')}
                  <ChevronDown size={13} strokeWidth={2} className={cn('transition-transform duration-300', expanded && 'rotate-180')} />
                </button>
              ) : null}
            </div>

            <button
              type="button"
              onClick={() => void accept()}
              className={cn('consent-accept mt-4', phase !== 'idle' && 'is-busy', phase === 'done' && 'is-done')}
              aria-live="polite"
            >
              <span className="consent-accept-label flex items-center justify-center gap-2">
                {phase === 'working' ? (
                  <Loader2 size={16} className="animate-spin" aria-hidden />
                ) : phase === 'done' ? (
                  <Check size={17} strokeWidth={2.6} className="consent-check" aria-hidden />
                ) : (
                  <CheckCircle2 size={16} strokeWidth={1.9} aria-hidden />
                )}
                {phase === 'done' ? t('ob.allSet') : acceptLabel}
              </span>
            </button>
            <button type="button" onClick={onCancel} disabled={phase !== 'idle'} className="consent-cancel mt-2">
              {cancelLabel ?? t('ob.cancel')}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
