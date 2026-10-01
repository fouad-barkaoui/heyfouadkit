import * as Dialog from '@radix-ui/react-dialog';
import { BookmarkPlus, Camera, Crown, Orbit, Play, Sparkles, Users, X, type LucideIcon } from 'lucide-react';
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { MARK_SRC } from '@/components/ui/BrandMark';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/state/languageStore';

export type WhatsNewAction = 'saveit' | 'account' | null;

/** `label`, `title`, `body` and `action.label` are translation keys. */
interface Feature {
  id: string;
  label: string;
  icon: LucideIcon;
  status: 'new' | 'dev';
  title: string;
  body: string;
  action?: { label: string; to: WhatsNewAction };
  hue: [string, string];
  art: () => ReactNode;
}

/* ── Hero art — small, looping, pure CSS ─────────────────────────────── */

function SaveItArt(): JSX.Element {
  const { t } = useLanguage();
  return (
    <div className="wn-art-saveit">
      <div className="wn-bar">
        <span className="wn-bar-icon" aria-hidden>
          <BookmarkPlus size={13} strokeWidth={2} />
        </span>
        <span className="wn-typing">youtube.com/watch?v=aircAruvnKk</span>
        <span className="wn-bar-btn">{t('ob.wn.art.save')}</span>
      </div>
      <div className="wn-cards">
        <div className="wn-card wn-card-a">
          <div className="wn-card-media">
            <span className="wn-card-play">
              <Play size={10} fill="currentColor" strokeWidth={0} />
            </span>
          </div>
          <div className="wn-card-line w-[80%]" />
          <div className="wn-card-line w-[55%]" />
        </div>
        <div className="wn-card wn-card-b">
          <div className="wn-card-media is-b" />
          <div className="wn-card-line w-[70%]" />
          <div className="wn-card-line w-[45%]" />
        </div>
        <div className="wn-card wn-card-c">
          <div className="wn-card-media is-c" />
          <div className="wn-card-line w-[85%]" />
          <div className="wn-card-line w-[40%]" />
        </div>
      </div>
    </div>
  );
}

function ConstellationArt(): JSX.Element {
  const stars = [
    [22, 30, '#f25f5c'],
    [30, 44, '#f25f5c'],
    [18, 52, '#f25f5c'],
    [58, 26, '#7c83ff'],
    [66, 38, '#7c83ff'],
    [52, 44, '#ffcf6b'],
    [78, 62, '#2dd4a0'],
    [86, 50, '#2dd4a0'],
    [40, 70, '#38bdf8'],
    [50, 78, '#38bdf8'],
  ] as const;
  return (
    <div className="wn-art-space">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full" aria-hidden>
        <polyline points="22,30 30,44 18,52" className="wn-thread" />
        <polyline points="58,26 66,38 52,44" className="wn-thread" />
        <polyline points="30,44 52,44 78,62" className="wn-thread is-tag" />
        <polyline points="40,70 50,78 86,50" className="wn-thread" />
      </svg>
      {stars.map(([x, y, c], i) => (
        <span
          key={i}
          className="wn-star"
          style={{ left: `${x}%`, top: `${y}%`, ['--c' as string]: c, ['--d' as string]: `${i * 0.23}s` } as CSSProperties}
        />
      ))}
    </div>
  );
}

function ProfileArt(): JSX.Element {
  const { t } = useLanguage();
  return (
    <div className="wn-art-profile">
      <span className="wn-seal">
        <span className="wn-seal-ring">
          <img src={MARK_SRC} alt="" />
        </span>
      </span>
      <span className="wn-chip">
        <Crown size={10} strokeWidth={2.4} /> {t('ob.wn.art.admin')}
      </span>
    </div>
  );
}

function TeamArt(): JSX.Element {
  const { t } = useLanguage();
  return (
    <div className="wn-art-team">
      <div className="wn-avatars">
        {['#7c83ff', '#2dd4a0', '#f5a524', '#f25f5c'].map((c, i) => (
          <span key={c} className="wn-av" style={{ ['--c' as string]: c, ['--i' as string]: i } as CSSProperties} />
        ))}
        <span className="wn-av is-add">+</span>
      </div>
      <div className="wn-build">
        <span className="wn-build-bar" />
      </div>
      <span className="wn-build-label">{t('ob.wn.art.building')}</span>
    </div>
  );
}

const FEATURES: Feature[] = [
  {
    id: 'saveit',
    label: 'ob.wn.saveit.label',
    icon: BookmarkPlus,
    status: 'new',
    title: 'ob.wn.saveit.title',
    body: 'ob.wn.saveit.body',
    action: { label: 'ob.wn.saveit.action', to: 'saveit' },
    hue: ['#6d28d9', '#f59e0b'],
    art: SaveItArt,
  },
  {
    id: 'constellation',
    label: 'ob.wn.constellation.label',
    icon: Orbit,
    status: 'new',
    title: 'ob.wn.constellation.title',
    body: 'ob.wn.constellation.body',
    action: { label: 'ob.wn.constellation.action', to: 'saveit' },
    hue: ['#0b1030', '#3b82f6'],
    art: ConstellationArt,
  },
  {
    id: 'profile',
    label: 'ob.wn.profile.label',
    icon: Camera,
    status: 'new',
    title: 'ob.wn.profile.title',
    body: 'ob.wn.profile.body',
    action: { label: 'ob.wn.profile.action', to: 'account' },
    hue: ['#78350f', '#eab308'],
    art: ProfileArt,
  },
  {
    id: 'team',
    label: 'ob.wn.team.label',
    icon: Users,
    status: 'dev',
    title: 'ob.wn.team.title',
    body: 'ob.wn.team.body',
    hue: ['#134e4a', '#14b8a6'],
    art: TeamArt,
  },
];

/**
 * "What's new" — shown once per person (for life, per release) right after
 * signing in. A feature list on the left, a live preview on the right.
 */
export function WhatsNewModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: (action: WhatsNewAction) => void;
}): JSX.Element {
  const { t } = useLanguage();
  const [active, setActive] = useState(0);
  const feature = FEATURES[active]!;
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) setActive(0);
  }, [open]);

  const move = (delta: number): void => {
    setActive((i) => {
      const next = (i + delta + FEATURES.length) % FEATURES.length;
      window.requestAnimationFrame(() => listRef.current?.querySelectorAll<HTMLButtonElement>('button')[next]?.focus());
      return next;
    });
  };

  const Art = feature.art;

  return (
    <Dialog.Root open={open} onOpenChange={(o) => (!o ? onClose(null) : undefined)}>
      <Dialog.Portal>
        <Dialog.Overlay className="wn-overlay fixed inset-0 z-[72]" />
        <Dialog.Content
          onInteractOutside={(e) => e.preventDefault()}
          className="wn-modal modal-frame fixed left-1/2 top-1/2 z-[72] flex max-h-[calc(100dvh-24px)] w-[calc(100vw-24px)] max-w-[780px] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-[18px] md:flex-row"
          aria-describedby={undefined}
        >
          {/* Feature list */}
          <div className="wn-side flex shrink-0 flex-col p-5 md:w-[264px] md:p-6">
            <span className="wn-kicker inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-[10.5px] font-medium uppercase tracking-[0.1em]">
              <Sparkles size={11} strokeWidth={2.2} aria-hidden /> {t('ob.wn.kicker')}
            </span>
            <Dialog.Title className="mt-3 text-[22px] font-semibold leading-[1.2] tracking-[-0.024em] text-paper md:text-[24px]">
              {t('ob.wn.title')}
            </Dialog.Title>
            <div
              ref={listRef}
              role="tablist"
              aria-orientation="vertical"
              className="mt-5 flex gap-1.5 overflow-x-auto pb-1 md:mt-7 md:flex-col md:overflow-visible md:pb-0"
              onKeyDown={(e) => {
                if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
                  e.preventDefault();
                  move(1);
                } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
                  e.preventDefault();
                  move(-1);
                }
              }}
            >
              {FEATURES.map((f, i) => {
                const Icon = f.icon;
                return (
                  <button
                    key={f.id}
                    type="button"
                    role="tab"
                    aria-selected={active === i}
                    tabIndex={active === i ? 0 : -1}
                    onClick={() => setActive(i)}
                    className="wn-item flex shrink-0 items-center gap-2.5 rounded-[10px] px-3 py-2 text-start text-[13.5px]"
                  >
                    <Icon size={15} strokeWidth={1.8} aria-hidden />
                    <span className="flex-1 whitespace-nowrap">{t(f.label)}</span>
                    {f.status === 'dev' ? (
                      <span className="wn-tag is-dev">{t('ob.wn.soon')}</span>
                    ) : (
                      <span className="wn-tag">{t('ob.wn.new')}</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Preview */}
          <div className="flex min-h-0 min-w-0 flex-1 flex-col">
            <div
              key={feature.id}
              className="wn-hero relative h-[210px] shrink-0 overflow-hidden md:h-[248px]"
              style={{ ['--h1' as string]: feature.hue[0], ['--h2' as string]: feature.hue[1] } as CSSProperties}
            >
              <div className="wn-hero-grain absolute inset-0" aria-hidden />
              <span className="wn-sparkle" style={{ left: '8%', top: '14%' }} aria-hidden />
              <span className="wn-sparkle is-sm" style={{ left: '88%', top: '22%', animationDelay: '0.8s' }} aria-hidden />
              <span className="wn-sparkle is-sm" style={{ left: '14%', top: '80%', animationDelay: '1.6s' }} aria-hidden />
              <span className="wn-sparkle" style={{ left: '82%', top: '78%', animationDelay: '2.2s' }} aria-hidden />
              <div className="absolute inset-0 flex items-center justify-center p-6">
                <Art />
              </div>
              <Dialog.Close
                className="wn-close absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full"
                aria-label={t('ob.close')}
              >
                <X size={16} strokeWidth={2} />
              </Dialog.Close>
            </div>

            <div key={`${feature.id}-copy`} className="wn-copy scroll-y flex min-h-0 flex-1 flex-col p-5 md:p-6">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-[16.5px] font-semibold tracking-[-0.014em] text-paper">{t(feature.title)}</h3>
                {feature.status === 'dev' ? <span className="wn-tag is-dev">{t('ob.wn.inDev')}</span> : null}
              </div>
              <p className="mt-2 text-[13.5px] leading-[1.65] text-fog">{t(feature.body)}</p>

              <div className="mt-auto flex items-center justify-between gap-3 pt-6">
                <span className="mono text-[11px] text-ash">
                  {active + 1} / {FEATURES.length}
                </span>
                <div className="flex gap-2">
                  {feature.action ? (
                    <button type="button" className="btn btn-ghost" onClick={() => onClose(feature.action!.to)}>
                      {t(feature.action.label)}
                    </button>
                  ) : null}
                  {active < FEATURES.length - 1 ? (
                    <button type="button" className={cn('btn btn-primary')} onClick={() => setActive(active + 1)}>
                      {t('ob.wn.next')}
                    </button>
                  ) : (
                    <button type="button" className="btn btn-primary" onClick={() => onClose(null)}>
                      {t('ob.wn.gotIt')}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
