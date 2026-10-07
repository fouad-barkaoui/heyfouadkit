import * as Dialog from '@radix-ui/react-dialog';
import { ArrowLeft, ArrowRight, Compass, Lock, Newspaper, Pill, Send, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { MARK_SRC } from '@/components/ui/BrandMark';
import type { ModuleId } from '@/lib/types';
import { MODULE_MAP } from '@/modules/registry';
import { useLanguage } from '@/state/languageStore';

/**
 * The first thing a newcomer sees: a five-step story about what Kanz is,
 * told one card at a time, ending on News. Each step has its own small
 * animated scene; arrows, swipe and the keyboard move between them.
 */

type StepId = 'start' | 'free' | 'pro' | 'soon' | 'idea';
const STEPS: StepId[] = ['start', 'free', 'pro', 'soon', 'idea'];

const ORBIT: ModuleId[] = ['todo', 'calendar', 'habits', 'saveit', 'notebook', 'articles', 'courses', 'docs'];
const FREE: ModuleId[] = ['todo', 'calendar', 'habits', 'saveit', 'notebook', 'articles', 'courses', 'docs', 'vault'];

/* ── scenes ──────────────────────────────────────────────────────────── */

function SceneStart(): JSX.Element {
  return (
    <div className="sh2-orbit">
      <span className="sh2-ring is-outer" />
      <span className="sh2-ring is-inner" />
      <div className="sh2-orbit-track">
        {ORBIT.map((id, i) => {
          const Icon = MODULE_MAP[id].icon;
          return (
            <span key={id} className="sh2-planet" style={{ ['--a' as string]: `${(360 / ORBIT.length) * i}deg` }}>
              <span className="sh2-planet-in">
                <Icon size={16} strokeWidth={1.7} />
              </span>
            </span>
          );
        })}
      </div>
      <span className="sh2-core">
        <img src={MARK_SRC} alt="" width={72} height={72} />
      </span>
    </div>
  );
}

function SceneFree(): JSX.Element {
  const { t } = useLanguage();
  return (
    <div className="sh2-tiles">
      {FREE.map((id, i) => {
        const m = MODULE_MAP[id];
        return (
          <span key={id} className="sh2-tile" style={{ ['--i' as string]: i }} data-hot={i === 4 || undefined}>
            <m.icon size={17} strokeWidth={1.7} />
            <span>{m.short}</span>
          </span>
        );
      })}
      <span className="sh2-free-badge">{t('nf.tour.free.badge')}</span>
    </div>
  );
}

function ScenePro(): JSX.Element {
  const { t } = useLanguage();
  return (
    <div className="sh2-vault">
      <div className="sh2-vault-card">
        <span className="sh2-vault-icon">
          <Pill size={20} strokeWidth={1.7} />
        </span>
        <div className="min-w-0">
          <p className="sh2-vault-name">{MODULE_MAP.medications.label}</p>
          <p className="sh2-vault-sub">{t('nf.tour.pro.chip')}</p>
        </div>
        <span className="sh2-vault-rows" aria-hidden>
          <i />
          <i />
          <i />
        </span>
      </div>
      <span className="sh2-lock">
        <Lock size={18} strokeWidth={2} />
        Pro
      </span>
    </div>
  );
}

function SceneSoon(): JSX.Element {
  const { t } = useLanguage();
  return (
    <div className="sh2-salary">
      <div className="sh2-salary-card">
        <div className="sh2-salary-top">
          <span className="sh2-salary-icon">
            <MODULE_MAP.salary.icon size={16} strokeWidth={1.8} />
          </span>
          <span className="sh2-salary-name">{MODULE_MAP.salary.label}</span>
          <span className="sh2-beta">{t('sh.flag.beta')}</span>
        </div>
        <p className="sh2-salary-label">{t('sal.hero.today')}</p>
        <p className="sh2-salary-num num">164</p>
        <div className="sh2-split" aria-hidden>
          <i className="is-needs" />
          <i className="is-wants" />
          <i className="is-savings" />
        </div>
        <div className="sh2-split-key" aria-hidden>
          <span>
            <b className="is-needs" />
            50%
          </span>
          <span>
            <b className="is-wants" />
            30%
          </span>
          <span>
            <b className="is-savings" />
            20%
          </span>
        </div>
      </div>
    </div>
  );
}

function SceneIdea(): JSX.Element {
  const { t } = useLanguage();
  return (
    <div className="sh2-chat">
      <div className="sh2-bubble is-typing" aria-hidden>
        <i />
        <i />
        <i />
      </div>
      <div className="sh2-bubble is-msg">
        <span>{t('nf.tour.idea.chip')}</span>
        <span className="sh2-send">
          <Send size={13} strokeWidth={2} />
        </span>
      </div>
      <Send className="sh2-plane" size={22} strokeWidth={1.6} aria-hidden />
    </div>
  );
}

const SCENE: Record<StepId, () => JSX.Element> = {
  start: SceneStart,
  free: SceneFree,
  pro: ScenePro,
  soon: SceneSoon,
  idea: SceneIdea,
};

/* ── dialog ──────────────────────────────────────────────────────────── */

export function StartHereModal({
  open,
  onOpen,
  onLater,
}: {
  open: boolean;
  onOpen: () => void;
  onLater: () => void;
}): JSX.Element {
  const { t, language } = useLanguage();
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState<1 | -1>(1);
  const touch = useRef<number | null>(null);
  const last = step === STEPS.length - 1;
  const id = STEPS[step];
  const View = SCENE[id];

  const go = useCallback(
    (next: number) => {
      const n = Math.max(0, Math.min(STEPS.length - 1, next));
      if (n === step) return;
      setDir(n > step ? 1 : -1);
      setStep(n);
    },
    [step],
  );

  useEffect(() => {
    if (open) setStep(0);
  }, [open]);

  // Arrow keys follow reading direction.
  const onKey = (e: React.KeyboardEvent): void => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    const forward = (e.key === 'ArrowRight') !== (language === 'ar');
    go(step + (forward ? 1 : -1));
  };

  return (
    <Dialog.Root open={open} onOpenChange={(o) => (o ? undefined : onLater())}>
      <Dialog.Portal>
        <Dialog.Overlay className="sh2-overlay" />
        <Dialog.Content
          className="sh2-dialog"
          aria-describedby="sh2-text"
          onKeyDown={onKey}
          onTouchStart={(e) => (touch.current = e.touches[0]?.clientX ?? null)}
          onTouchEnd={(e) => {
            const start = touch.current;
            touch.current = null;
            const end = e.changedTouches[0]?.clientX;
            if (start === null || end === undefined || Math.abs(end - start) < 50) return;
            const forward = (end < start) !== (language === 'ar');
            go(step + (forward ? 1 : -1));
          }}
        >
          <div className="sh2-stage" data-step={id}>
            <div className="sh2-progress" role="tablist" aria-label={t('nf.tour.title')}>
              {STEPS.map((s, i) => (
                <button
                  key={s}
                  type="button"
                  role="tab"
                  aria-selected={i === step}
                  aria-label={t(`nf.tour.${s}.title`)}
                  data-state={i < step ? 'done' : i === step ? 'now' : undefined}
                  onClick={() => go(i)}
                >
                  <i />
                </button>
              ))}
            </div>
            <Dialog.Close className="sh2-close" aria-label={t('nf.start.later')}>
              <X size={16} strokeWidth={2} />
            </Dialog.Close>
            <div key={id} className="sh2-scene" data-dir={dir}>
              <View />
            </div>
          </div>

          <div className="sh2-body">
            <Dialog.Title className="sh2-kicker">
              <Compass size={13} strokeWidth={2} aria-hidden />
              {t('nf.tour.title')}
              <span className="sh2-count num">
                {/* Isolated so "01 / 05" keeps its order in Arabic. */}
                {`\u2066${String(step + 1).padStart(2, '0')} / ${String(STEPS.length).padStart(2, '0')}\u2069`}
              </span>
            </Dialog.Title>
            <div key={id} className="sh2-copy" data-dir={dir}>
              <h2 className="sh2-title">{t(`nf.tour.${id}.title`)}</h2>
              <p id="sh2-text" className="sh2-text" aria-live="polite">
                {t(`nf.tour.${id}.text`)}
              </p>
            </div>
            <div className="sh2-actions">
              {step === 0 ? (
                <button type="button" className="sh2-btn is-quiet" onClick={onLater}>
                  {t('nf.start.later')}
                </button>
              ) : (
                <button type="button" className="sh2-btn is-quiet" onClick={() => go(step - 1)}>
                  <ArrowLeft size={15} strokeWidth={2} className="rtl:-scale-x-100" aria-hidden />
                  {t('nf.tour.back')}
                </button>
              )}
              {last ? (
                <button type="button" className="sh2-btn is-primary" onClick={onOpen} autoFocus>
                  <Newspaper size={15} strokeWidth={2} aria-hidden />
                  {t('nf.start.go')}
                </button>
              ) : (
                <button type="button" className="sh2-btn is-primary" onClick={() => go(step + 1)}>
                  {t('nf.tour.next')}
                  <ArrowRight size={15} strokeWidth={2} className="rtl:-scale-x-100" aria-hidden />
                </button>
              )}
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
