import { Camera, Check, Cloud, Crown, Gem, Link2, Pill, Share2, Sparkles, Star, Users } from 'lucide-react';
import { lazy, Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState, type PointerEvent } from 'react';
import { Avatar } from '@/components/ui/Avatar';
import { dominantColor } from '@/data/avatar';
import { isAdminUser } from '@/lib/access';
import { cn } from '@/lib/utils';
import { getDisplayName, useAuth } from '@/state/authStore';
import { useUI } from '@/state/uiStore';
import { useWorkspace } from '@/state/workspaceStore';
import type { MedallionTilt } from '@/three/GoldMedallion';

const GoldMedallionCanvas = lazy(async () => ({
  default: (await import('@/three/GoldMedallion')).GoldMedallionCanvas,
}));

type Tab = 'overview' | 'activity' | 'perks';
const TABS: { id: Tab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'activity', label: 'Activity' },
  { id: 'perks', label: 'Perks' },
];

const PERKS: { icon: typeof Pill; title: string; body: string }[] = [
  { icon: Pill, title: 'Medications Catalog', body: 'Doses, schedules and treatment plans — unlocked.' },
  { icon: Cloud, title: '250 MB private cloud', body: 'Files up to 50 MB each, synced to every device.' },
  { icon: Users, title: 'Live team workspaces', body: 'Invite people and edit together in real time.' },
  { icon: Gem, title: 'Gold profile', body: 'This badge, and a gold ring wherever you appear.' },
];

function webglAvailable(): boolean {
  try {
    const c = document.createElement('canvas');
    return Boolean(c.getContext('webgl2') ?? c.getContext('webgl'));
  } catch {
    return false;
  }
}

/** Flat seal for no-WebGL browsers and the first paint before three.js arrives. */
function SealSvg({ size }: { size: number }): JSX.Element {
  const path = useMemo(() => {
    const pts: string[] = [];
    const steps = 360;
    for (let i = 0; i <= steps; i++) {
      const a = (i / steps) * Math.PI * 2;
      const crest = Math.pow(Math.abs(Math.cos((22 * a) / 2)), 0.65);
      const r = (0.87 + 0.115 * crest) * (50 / 1.2);
      pts.push(`${(50 + Math.cos(a) * r).toFixed(2)},${(50 + Math.sin(a) * r).toFixed(2)}`);
    }
    return `M${pts.join('L')}Z`;
  }, []);
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} className="absolute inset-0" aria-hidden>
      <defs>
        <linearGradient id="seal-gold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f7d98b" />
          <stop offset="0.45" stopColor="#e2a948" />
          <stop offset="1" stopColor="#b97a24" />
        </linearGradient>
      </defs>
      <path d={path} fill="url(#seal-gold)" />
      <circle cx="50" cy="50" r="32.6" fill="none" stroke="#c98d2e" strokeWidth="1.4" />
    </svg>
  );
}

/**
 * Pro member spotlight — the gold rosette card. A real-time three.js seal
 * (brushed-gold PBR, orbiting sheen light, drifting motes) tilts toward the
 * pointer; the person's own picture sits in its centre and tilts with it.
 */
export function ProSpotlight({ className, compact = false }: { className?: string; compact?: boolean }): JSX.Element {
  const { user, avatarUrl } = useAuth();
  const { workspace, recordCount } = useWorkspace();
  const { setAccountOpen } = useUI();
  const name = getDisplayName(user) || 'You';
  const [tab, setTab] = useState<Tab>('overview');
  const [flipKey, setFlipKey] = useState(0);
  const [shared, setShared] = useState<'idle' | 'copied' | 'shared'>('idle');
  const [aura, setAura] = useState<string | null>(null);

  const reduced = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const [gl] = useState(() => typeof window !== 'undefined' && webglAvailable());

  const tilt = useRef<MedallionTilt>({ tx: 0, ty: 0, rx: 0, ry: 0, spin: 0 });
  const overlay = useRef<HTMLDivElement | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let alive = true;
    if (!avatarUrl) {
      setAura(null);
      return;
    }
    void dominantColor(avatarUrl).then((c) => {
      if (alive) setAura(c);
    });
    return () => {
      alive = false;
    };
  }, [avatarUrl]);

  /* ── Tabs: gold pill slides between them ───────────────────────────── */
  const tabsRef = useRef<HTMLDivElement>(null);
  const [pill, setPill] = useState({ x: 0, w: 0, ready: false });
  useLayoutEffect(() => {
    const el = tabsRef.current?.querySelector<HTMLElement>(`[data-tab="${tab}"]`);
    if (!el) return;
    setPill((p) => ({ x: el.offsetLeft, w: el.offsetWidth, ready: p.w > 0 }));
  }, [tab]);
  useEffect(() => {
    const host = tabsRef.current;
    if (!host || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => {
      const el = host.querySelector<HTMLElement>('[data-active="true"]');
      if (el) setPill((p) => ({ ...p, x: el.offsetLeft, w: el.offsetWidth }));
    });
    ro.observe(host);
    return () => ro.disconnect();
  }, []);

  const onPointerMove = (e: PointerEvent<HTMLDivElement>): void => {
    const r = e.currentTarget.getBoundingClientRect();
    const nx = ((e.clientX - r.left) / r.width) * 2 - 1;
    const ny = ((e.clientY - r.top) / r.height) * 2 - 1;
    tilt.current.tx = Math.max(-1, Math.min(1, nx));
    tilt.current.ty = Math.max(-1, Math.min(1, ny));
    cardRef.current?.style.setProperty('--gx', `${((e.clientX - r.left) / r.width) * 100}%`);
    cardRef.current?.style.setProperty('--gy', `${((e.clientY - r.top) / r.height) * 100}%`);
  };
  const onPointerLeave = (): void => {
    tilt.current.tx = 0;
    tilt.current.ty = 0;
  };

  const share = async (): Promise<void> => {
    setFlipKey((k) => k + 1);
    const url = window.location.origin;
    const text = `${name} is a Kanz Pro member.`;
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Kanz Pro', text, url });
        setShared('shared');
      } else {
        await navigator.clipboard.writeText(`${text} ${url}`);
        setShared('copied');
      }
    } catch {
      /* dismissed share sheet — nothing to report */
      return;
    }
    window.setTimeout(() => setShared('idle'), 1800);
  };

  const stats = useMemo(() => {
    const done = workspace.todos.filter((t) => t.status === 'completed').length;
    return [
      { label: 'Tasks done', value: done },
      { label: 'Notes', value: workspace.notes.length },
      { label: 'Docs', value: workspace.docs.length },
      { label: 'Records', value: recordCount },
    ];
  }, [workspace, recordCount]);

  const since = user?.created_at
    ? new Date(user.created_at).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
    : null;
  const month = new Date().toLocaleDateString(undefined, { month: 'long' });

  const MEDAL = compact ? 188 : 216;
  const persp = Math.round(MEDAL * 1.87);

  return (
    <section
      ref={cardRef}
      aria-label="Pro member spotlight"
      className={cn('pro-card relative overflow-hidden', compact ? 'p-4' : 'p-5', className)}
      style={aura ? { ['--aura' as string]: aura } : undefined}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
    >
      <div className="pro-card-glare pointer-events-none absolute inset-0" aria-hidden />

      <header className="relative flex items-center gap-2.5">
        <span className="pro-star flex h-8 w-8 items-center justify-center" aria-hidden>
          <Star size={19} strokeWidth={1.8} />
        </span>
        <h2 className="min-w-0 flex-1 truncate text-[16px] font-semibold tracking-[-0.018em] pro-ink">{isAdminUser(user) ? 'Admin Spotlight' : 'Pro Spotlight'}</h2>
        <button type="button" onClick={() => void share()} className="pro-share">
          {shared === 'idle' ? (
            <>
              <Share2 size={13} strokeWidth={1.9} aria-hidden /> Share
            </>
          ) : (
            <>
              {shared === 'copied' ? <Link2 size={13} strokeWidth={2} aria-hidden /> : <Check size={13} strokeWidth={2.2} aria-hidden />}
              {shared === 'copied' ? 'Copied' : 'Shared'}
            </>
          )}
        </button>
      </header>

      <div ref={tabsRef} role="tablist" aria-label="Spotlight" className="pro-tabs relative mt-4 grid grid-cols-3 p-1">
        <span
          className="pro-tab-pill absolute bottom-1 top-1"
          aria-hidden
          style={{
            transform: `translateX(${pill.x - 4}px)`,
            width: pill.w,
            left: 4,
            transitionDuration: pill.ready ? undefined : '0ms',
          }}
        />
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            data-tab={t.id}
            data-active={tab === t.id}
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className="pro-tab relative z-[1]"
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="relative mt-5 text-center">
        <p className="truncate text-[22px] font-semibold leading-tight tracking-[-0.024em] pro-ink">{name}</p>
        <p className="mt-1 flex items-center justify-center gap-1.5 text-[12.5px] pro-sub">
          <Crown size={12.5} strokeWidth={2} className="pro-crown" aria-hidden />
          {isAdminUser(user) ? 'Admin · ' : ''}Kanz Pro{since ? ` · since ${since}` : ''}
        </p>
      </div>

      <div key={tab} className="relative anim-rise">
        {tab === 'overview' ? (
          <>
            <div className="pro-stage relative mx-auto mt-3" style={{ height: MEDAL + 20 }}>
              <div className="pro-grid pointer-events-none absolute inset-0" aria-hidden />
              <div className="pro-ribbon pro-ribbon-l" aria-hidden />
              <div className="pro-ribbon pro-ribbon-r" aria-hidden />
              <div className="pro-aura pointer-events-none absolute left-1/2 top-1/2" aria-hidden style={{ width: MEDAL, height: MEDAL }} />
              <div
                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
                style={{ width: MEDAL, height: MEDAL, perspective: persp }}
              >
                {gl ? (
                  <Suspense fallback={<SealSvg size={MEDAL} />}>
                    <GoldMedallionCanvas tilt={tilt} overlay={overlay} reduced={reduced} flipKey={flipKey} />
                  </Suspense>
                ) : (
                  <SealSvg size={MEDAL} />
                )}
                <div
                  ref={overlay}
                  className="pro-medal-face pointer-events-none absolute inset-0 flex items-center justify-center"
                  style={{ transformStyle: 'preserve-3d' }}
                >
                  <span className="pro-medal-ring flex items-center justify-center rounded-full" style={{ width: MEDAL * 0.545, height: MEDAL * 0.545 }}>
                    <span className="pro-medal-well flex items-center justify-center rounded-full" style={{ width: MEDAL * 0.44, height: MEDAL * 0.44 }}>
                      {avatarUrl ? (
                        <Avatar src={avatarUrl} name={name} size={Math.round(MEDAL * 0.36)} />
                      ) : (
                        <button
                          type="button"
                          onClick={() => setAccountOpen(true)}
                          className="pro-medal-add pointer-events-auto flex flex-col items-center justify-center gap-1 rounded-full"
                          style={{ width: Math.round(MEDAL * 0.36), height: Math.round(MEDAL * 0.36) }}
                          aria-label="Add your profile picture"
                        >
                          <Camera size={Math.round(MEDAL * 0.09)} strokeWidth={1.8} aria-hidden />
                          <span className="text-[10.5px] font-medium leading-none">Add photo</span>
                        </button>
                      )}
                    </span>
                  </span>
                </div>
              </div>
            </div>
            <p className="mt-2 text-center text-[13px] pro-sub">
              Top-tier member of {month} <Sparkles size={12} className="inline -mt-0.5 pro-crown" aria-hidden />
            </p>
          </>
        ) : tab === 'activity' ? (
          <div className="mt-5 grid grid-cols-2 gap-2.5">
            {stats.map((s, i) => (
              <div key={s.label} className="pro-stat anim-rise p-3 text-start" style={{ animationDelay: `${i * 50}ms` }}>
                <p className="num text-[24px] font-semibold leading-none tracking-[-0.02em] pro-ink">{s.value}</p>
                <p className="mt-1.5 text-[11.5px] uppercase tracking-[0.06em] pro-sub">{s.label}</p>
              </div>
            ))}
          </div>
        ) : (
          <ul className="mt-5 space-y-2">
            {PERKS.map(({ icon: Icon, title, body }, i) => (
              <li key={title} className="pro-stat anim-rise flex items-start gap-3 p-3 text-start" style={{ animationDelay: `${i * 50}ms` }}>
                <span className="pro-perk-icon flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px]">
                  <Icon size={15} strokeWidth={1.9} aria-hidden />
                </span>
                <span className="min-w-0">
                  <span className="block text-[13px] font-medium pro-ink">{title}</span>
                  <span className="mt-0.5 block text-[11.5px] leading-[1.45] pro-sub">{body}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
