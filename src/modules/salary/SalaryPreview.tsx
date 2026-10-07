import {
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  Clock,
  FlaskConical,
  Lightbulb,
  Pause,
  PiggyBank,
  Play,
  ShieldCheck,
  Wallet,
} from 'lucide-react';
import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { MenuButton } from '@/components/shell/MenuButton';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/state/languageStore';
import { useUI } from '@/state/uiStore';

/**
 * What everyone else sees while the Salary Planner is in beta: a banner and
 * a short animated walk-through of the admin version, built from sample
 * numbers. Every frame is computed from one clock, so pausing, jumping to a
 * chapter and "reduced motion" (which shows each scene's last frame) all
 * come for free.
 */

type SceneId = 'setup' | 'overview' | 'plan' | 'spending' | 'goals' | 'whatif';
const SCENES: SceneId[] = ['setup', 'overview', 'plan', 'spending', 'goals', 'whatif'];
const DURATION = 6500;

const Clock$ = createContext(DURATION);
const clamp = (x: number): number => Math.min(1, Math.max(0, x));
const ease = (x: number): number => 1 - (1 - x) ** 3;
/** 0 → 1 between `a` and `b` ms of the current scene. */
function useStep(a: number, b: number): number {
  const t = useContext(Clock$);
  return ease(clamp((t - a) / (b - a)));
}

function useFmt(): (n: number) => string {
  const { locale } = useLanguage();
  const f = useMemo(() => new Intl.NumberFormat(locale, { style: 'currency', currency: 'MAD', maximumFractionDigits: 0 }), [locale]);
  return (n) => f.format(Math.round(n));
}

function Count({ to, from = 0, a, b }: { to: number; from?: number; a: number; b: number }): JSX.Element {
  const fmt = useFmt();
  const p = useStep(a, b);
  return <span className="num">{fmt(from + (to - from) * p)}</span>;
}

/** Fades and lifts a child in at `at` ms. */
function In({ at, children, className, dur = 450 }: { at: number; children: ReactNode; className?: string; dur?: number }): JSX.Element {
  const p = useStep(at, at + dur);
  return (
    <div className={className} style={{ opacity: p, transform: `translateY(${(1 - p) * 10}px)` }}>
      {children}
    </div>
  );
}

function Bar({ pct, a, b, tone, over }: { pct: number; a: number; b: number; tone: string; over?: boolean }): JSX.Element {
  const p = useStep(a, b);
  return (
    <span className="spv-track">
      <i className={cn(tone, over && p > 0.98 && 'is-over')} style={{ width: `${Math.min(100, pct * p)}%` }} />
    </span>
  );
}

/* ── scenes ──────────────────────────────────────────────────────────── */

function SceneSetup(): JSX.Element {
  const { t } = useLanguage();
  const fmt = useFmt();
  const typed = useStep(300, 1700);
  const digits = '12000';
  const shown = digits.slice(0, Math.round(typed * digits.length));
  const press = useStep(2000, 2250);
  const split = useStep(2500, 3700);
  return (
    <div className="spv-setup">
      <p className="spv-label">{t('sal.setup.salary')}</p>
      <div className="spv-input num">
        {shown ? fmt(Number(shown)) : ''}
        <span className="spv-caret" style={{ opacity: typed < 1 ? 1 : 0 }} />
      </div>
      <div className="spv-row">
        {['50 / 30 / 20', '60 / 20 / 20', '70 / 20 / 10'].map((r, i) => (
          <span key={r} dir="ltr" className={cn('spv-pill', i === 0 && 'is-on')}>
            {r}
          </span>
        ))}
      </div>
      <span className="spv-btn" style={{ transform: `scale(${1 - Math.sin(press * Math.PI) * 0.06})` }}>
        {t('sal.setup.go')}
      </span>
      <div className="spv-stack" style={{ opacity: split > 0 ? 1 : 0 }}>
        <i className="is-needs" style={{ flexGrow: 50 * split + 0.001 }} />
        <i className="is-wants" style={{ flexGrow: 30 * split + 0.001 }} />
        <i className="is-savings" style={{ flexGrow: 20 * split + 0.001 }} />
      </div>
      <In at={3500} className="spv-legend">
        <span>
          <b className="spv-dot is-needs" /> {t('sal.bucket.needs')} <span className="num">{fmt(6000)}</span>
        </span>
        <span>
          <b className="spv-dot is-wants" /> {t('sal.bucket.wants')} <span className="num">{fmt(3600)}</span>
        </span>
        <span>
          <b className="spv-dot is-savings" /> {t('sal.bucket.savings')} <span className="num">{fmt(2400)}</span>
        </span>
      </In>
    </div>
  );
}

function SceneOverview(): JSX.Element {
  const { t } = useLanguage();
  const draw = useStep(1200, 4200);
  const pts = [0, 3600, 3700, 4100, 4400, 4800, 5200, 5600, 5900, 6300, 6800];
  const W = 260;
  const H = 120;
  const top = 12000;
  const path = pts.map((v, i) => `${i ? 'L' : 'M'}${(i / 30) * W},${H - (v / top) * H}`).join('');
  return (
    <div className="spv-overview">
      <div className="spv-card spv-hero">
        <p className="spv-eyebrow">
          <Wallet size={13} strokeWidth={1.8} aria-hidden /> {t('sal.hero.today')}
        </p>
        <p className="spv-big">
          <Count to={164} a={200} b={1600} />
        </p>
        <In at={1500} className="spv-row">
          <span className="spv-chip">
            <CalendarClock size={12} strokeWidth={1.8} aria-hidden /> {t('spv.payday')}
          </span>
          <span className="spv-chip">
            <PiggyBank size={12} strokeWidth={1.8} aria-hidden /> {t('sal.rate', { pct: 20 })}
          </span>
        </In>
      </div>
      <div className="spv-card">
        <p className="spv-eyebrow">{t('sal.pace.title')}</p>
        <svg viewBox={`0 0 ${W} ${H}`} className="spv-chart" aria-hidden>
          <line x1="0" y1={H - 2} x2={W} y2={4} className="spv-even" pathLength={1} strokeDasharray="0.02 0.02" />
          <path d={path} className="spv-line" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - draw} />
        </svg>
        <div className="spv-legend is-small">
          <span>
            <b className="spv-key" /> {t('sal.pace.actual')}
          </span>
          <span>
            <b className="spv-key is-dash" /> {t('sal.pace.even')}
          </span>
        </div>
      </div>
    </div>
  );
}

function ScenePlan(): JSX.Element {
  const { t } = useLanguage();
  const cols: { b: 'needs' | 'wants' | 'savings'; rows: [string, number][] }[] = [
    { b: 'needs', rows: [['sal.cat.rent', 3000], ['sal.cat.groceries', 1450], ['sal.cat.transport', 600], ['sal.cat.phone', 480]] },
    { b: 'wants', rows: [['sal.cat.eatingOut', 1100], ['sal.cat.shopping', 1100], ['sal.cat.leisure', 900]] },
    { b: 'savings', rows: [['sal.cat.emergency', 1200], ['sal.cat.invest', 600], ['sal.cat.goals', 600]] },
  ];
  const fmt = useFmt();
  const done = useStep(4300, 4700);
  return (
    <div className="spv-plan">
      <div className="spv-cols">
        {cols.map((c, ci) => (
          <div key={c.b} className="spv-card">
            <p className="spv-eyebrow">
              <b className={cn('spv-dot', `is-${c.b}`)} /> {t(`sal.bucket.${c.b}`)}
            </p>
            {c.rows.map(([k, v], ri) => (
              <In key={k} at={300 + ci * 900 + ri * 220} className="spv-line-row">
                <span className="truncate">{t(k)}</span>
                <span className="num">{fmt(v)}</span>
              </In>
            ))}
          </div>
        ))}
      </div>
      <div className="spv-assign" style={{ opacity: done, transform: `scale(${0.94 + done * 0.06})` }}>
        <CheckCircle2 size={15} strokeWidth={2} aria-hidden /> {t('sal.stat.allAssigned')}
      </div>
    </div>
  );
}

function SceneSpending(): JSX.Element {
  const { t } = useLanguage();
  const fmt = useFmt();
  const txns: [string, string, number][] = [
    ['sal.cat.groceries', 'spv.note.market', 420],
    ['sal.cat.transport', 'spv.note.taxi', 95],
    ['sal.cat.eatingOut', 'spv.note.cafe', 180],
    ['sal.cat.shopping', 'spv.note.shoes', 1250],
  ];
  const over = useStep(4300, 4700);
  return (
    <div className="spv-spending">
      <div className="spv-card">
        <p className="spv-eyebrow">{t('sal.log.title')}</p>
        {txns.map(([k, n, v], i) => (
          <In key={k} at={200 + i * 700} className="spv-txn">
            <span className="min-w-0">
              <span className="block truncate">{t(k)}</span>
              <span className="block truncate text-ash">{t(n)}</span>
            </span>
            <span className="num">{fmt(v)}</span>
          </In>
        ))}
      </div>
      <div className="spv-card">
        <p className="spv-eyebrow">{t('sal.byCat.title')}</p>
        {(
          [
            ['sal.cat.groceries', 'is-needs', 29, 900],
            ['sal.cat.transport', 'is-needs', 16, 1600],
            ['sal.cat.eatingOut', 'is-wants', 16, 2300],
            ['sal.cat.shopping', 'is-wants', 114, 3000],
          ] as const
        ).map(([k, tone, pct, at]) => (
          <div key={k} className="spv-meter">
            <span className="spv-meter-top">
              <span>{t(k)}</span>
              <span className="num text-ash">{pct}%</span>
            </span>
            <Bar pct={pct} a={at} b={at + 900} tone={tone} over={pct > 100} />
          </div>
        ))}
        <p className="spv-warn" style={{ opacity: over }}>
          {t('sal.over', { amount: fmt(150) })}
        </p>
      </div>
    </div>
  );
}

function Ring({ pct, a, b, done }: { pct: number; a: number; b: number; done?: boolean }): JSX.Element {
  const p = useStep(a, b);
  const r = 24;
  const c = 2 * Math.PI * r;
  return (
    <span className="spv-ring">
      <svg viewBox="0 0 60 60" aria-hidden>
        <circle cx="30" cy="30" r={r} className="spv-ring-track" />
        <circle
          cx="30"
          cy="30"
          r={r}
          className={cn('spv-ring-fill', done && 'is-done')}
          strokeDasharray={`${pct * p * c} ${c}`}
          transform="rotate(-90 30 30)"
        />
      </svg>
      <span className="num">{Math.round(pct * p * 100)}%</span>
    </span>
  );
}

function SceneGoals(): JSX.Element {
  const { t } = useLanguage();
  return (
    <div className="spv-goals">
      <div className="spv-card spv-goal">
        <Ring pct={0.3} a={300} b={1800} />
        <div className="min-w-0">
          <p className="spv-goal-name">
            <ShieldCheck size={13} strokeWidth={1.8} aria-hidden /> {t('sal.cat.emergency')}
          </p>
          <In at={1600} className="spv-goal-meta">
            {t('spv.goal.cover')}
          </In>
        </div>
      </div>
      <div className="spv-card spv-goal">
        <Ring pct={0.62} a={1400} b={3000} />
        <div className="min-w-0">
          <p className="spv-goal-name">{t('spv.goal.laptop')}</p>
          <In at={2900} className="spv-goal-meta is-ok">
            <CheckCircle2 size={12} strokeWidth={2} aria-hidden /> {t('spv.goal.onTrack')}
          </In>
        </div>
      </div>
      <div className="spv-card spv-goal">
        <Ring pct={0.18} a={2600} b={4100} />
        <div className="min-w-0">
          <p className="spv-goal-name">{t('spv.goal.car')}</p>
          <In at={4000} className="spv-goal-meta is-late">
            <Clock size={12} strokeWidth={2} aria-hidden /> {t('spv.goal.late')}
          </In>
        </div>
      </div>
    </div>
  );
}

function SceneWhatIf(): JSX.Element {
  const { t } = useLanguage();
  const slide = useStep(400, 2200);
  const pct = Math.round(slide * 10);
  return (
    <div className="spv-whatif">
      <div className="spv-card">
        <p className="spv-label">
          {t('sal.what.raise')} <b className="num">+{pct}%</b>
        </p>
        <span className="spv-slider">
          <i style={{ width: `${(pct / 60) * 100}%` }} />
          <b style={{ insetInlineStart: `${(pct / 60) * 100}%` }} />
        </span>
        <div className="spv-compare">
          <span>{t('sal.stat.income')}</span>
          <Count from={12000} to={13200} a={400} b={2200} />
          <span>{t('sal.bucket.savings')}</span>
          <Count from={2400} to={3000} a={1200} b={2800} />
        </div>
      </div>
      <In at={3000} className="spv-card spv-sooner">
        <p className="spv-eyebrow">{t('sal.what.goals')}</p>
        <p className="spv-sooner-line">
          <span>{t('sal.cat.emergency')}</span>
          <b>{t('sal.what.sooner', { n: 4 })}</b>
        </p>
        <p className="spv-sooner-line">
          <span>{t('spv.goal.laptop')}</span>
          <b>{t('sal.what.sooner', { n: 3 })}</b>
        </p>
      </In>
    </div>
  );
}

const SCENE_VIEW: Record<SceneId, () => JSX.Element> = {
  setup: SceneSetup,
  overview: SceneOverview,
  plan: ScenePlan,
  spending: SceneSpending,
  goals: SceneGoals,
  whatif: SceneWhatIf,
};

/* ── player ──────────────────────────────────────────────────────────── */

function usePrefersReducedMotion(): boolean {
  const [reduce, setReduce] = useState(() => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false);
  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (!mq) return;
    const on = (): void => setReduce(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return reduce;
}

function Player(): JSX.Element {
  const { t } = useLanguage();
  const reduce = usePrefersReducedMotion();
  const [{ scene, time }, setPos] = useState({ scene: 0, time: 0 });
  const [playing, setPlaying] = useState(!reduce);
  const last = useRef<number | null>(null);

  useEffect(() => {
    if (reduce) setPlaying(false);
  }, [reduce]);

  useEffect(() => {
    if (!playing) {
      last.current = null;
      return;
    }
    let raf = 0;
    const tick = (now: number): void => {
      const dt = last.current === null ? 0 : Math.min(64, now - last.current);
      last.current = now;
      setPos((prev) => {
        const next = prev.time + dt;
        return next >= DURATION ? { scene: (prev.scene + 1) % SCENES.length, time: 0 } : { scene: prev.scene, time: next };
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing]);

  const id = SCENES[scene];
  const View = SCENE_VIEW[id];
  // Without motion (or when paused on a fresh chapter) show the finished frame.
  const clock = reduce ? DURATION : time;

  const go = (i: number): void => {
    setPos({ scene: i, time: 0 });
    if (!reduce) setPlaying(true);
  };

  return (
    <section className="spv-player" aria-roledescription={t('spv.player')} aria-label={t('spv.title')}>
      <div className="spv-stage" data-scene={id}>
        <div className="spv-window">
          <div className="spv-window-bar" aria-hidden>
            <i />
            <i />
            <i />
            <span>
              {t('nav.salary')} · {t(`sal.tab.${id === 'setup' ? 'plan' : id}`)}
            </span>
          </div>
          <div className="spv-window-body" aria-hidden>
            <Clock$.Provider value={clock}>
              <View key={`${id}`} />
            </Clock$.Provider>
          </div>
        </div>
        <button
          type="button"
          className="spv-play"
          onClick={() => setPlaying((p) => !p)}
          aria-label={playing ? t('spv.pause') : t('spv.play')}
          title={playing ? t('spv.pause') : t('spv.play')}
        >
          {playing ? <Pause size={15} strokeWidth={2} /> : <Play size={15} strokeWidth={2} />}
        </button>
      </div>

      <div className="spv-caption" aria-live="polite">
        <p className="spv-caption-step num">
          <span dir="ltr">
            {scene + 1} / {SCENES.length}
          </span>
        </p>
        <h3 className="spv-caption-title">{t(`spv.scene.${id}.title`)}</h3>
        <p className="spv-caption-text">{t(`spv.scene.${id}.text`)}</p>
      </div>

      <div className="spv-chapters" role="tablist" aria-label={t('spv.chapters')}>
        {SCENES.map((s, i) => {
          const fill = i < scene ? 1 : i === scene ? clock / DURATION : 0;
          return (
            <button
              key={s}
              type="button"
              role="tab"
              aria-selected={i === scene}
              data-active={i === scene || undefined}
              className="spv-chapter"
              onClick={() => go(i)}
            >
              <span className="spv-chapter-bar" aria-hidden>
                <i style={{ width: `${fill * 100}%` }} />
              </span>
              <span className="spv-chapter-name">{t(`spv.scene.${s}.short`)}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

export function SalaryPreview(): JSX.Element {
  const { t } = useLanguage();
  const { setModule } = useUI();
  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-col bg-void/78 backdrop-blur-2xl">
      <header className="flex items-center gap-3 border-b border-graphite px-4 py-3.5 md:px-7 md:py-4">
        <MenuButton className="md:hidden" />
        <div className="min-w-0 flex-1">
          <h1 className="flex min-w-0 items-center gap-2 text-[19px] font-medium leading-tight tracking-[-0.016em] text-paper md:text-[21px]">
            <span className="truncate">{t('nav.salary')}</span>
            <span className="sp-beta-pill shrink-0">{t('sal.beta')}</span>
          </h1>
          <p className="mt-1 truncate text-[12.5px] text-ash">{t('sal.subtitle')}</p>
        </div>
      </header>

      <div className="scroll-y nb-grid-bg min-h-0 flex-1">
        <div className="sp-wrap spv-wrap">
          <div className="sp-beta" role="note">
            <FlaskConical size={15} strokeWidth={1.8} aria-hidden />
            <span>
              <strong>{t('spv.banner.title')}</strong> {t('spv.banner.text')}
            </span>
          </div>

          <div className="spv-intro">
            <h2 className="spv-title">{t('spv.title')}</h2>
            <p className="spv-sub">{t('spv.sub')}</p>
          </div>

          <Player />

          <div className="spv-foot">
            <span className="spv-foot-icon" aria-hidden>
              <Lightbulb size={17} strokeWidth={1.7} />
            </span>
            <p className="min-w-0 flex-1">
              <strong>{t('spv.idea.title')}</strong> {t('spv.idea.text')}
            </p>
            <button type="button" className="btn btn-ghost" onClick={() => setModule('contact')}>
              {t('nf.idea.action')}
              <ChevronRight size={14} strokeWidth={1.8} className="rtl:-scale-x-100" aria-hidden />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
