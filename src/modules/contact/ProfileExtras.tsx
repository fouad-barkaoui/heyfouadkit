import {
  Briefcase,
  Check,
  Clock,
  Copy,
  Globe,
  Languages,
  Mail,
  MapPin,
  Volume2,
  type LucideIcon,
} from 'lucide-react';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { HOME_TZ, describeGap, tzOffsetMinutes } from './localTime';

/* ── Cover: the Kanz star drawn as an isometric prism ─────────────────── */

type Pt = [number, number];

function khatam(r: number): Pt[] {
  const inner = r * (Math.SQRT1_2 / Math.cos(Math.PI / 8));
  return Array.from({ length: 16 }, (_, i) => {
    const rad = i % 2 === 0 ? r : inner;
    const a = (Math.PI / 8) * i + Math.PI / 8;
    return [rad * Math.cos(a), rad * Math.sin(a)];
  });
}

/** Flat plan point → isometric screen point (30° projection). */
const iso = ([x, y]: Pt, cx: number, cy: number, z = 0): Pt => [
  cx + (x - y) * 0.866,
  cy + (x + y) * 0.5 - z,
];
const pts = (p: Pt[]): string => p.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');

/** Side faces back-to-front, then the lid — a cheap painter's algorithm. */
function prism(r: number, cx: number, cy: number, base: number, height: number): { sides: string[]; lid: string } {
  const plan = khatam(r);
  const faces = plan.map((a, i) => {
    const b = plan[(i + 1) % plan.length]!;
    const quad = [iso(a, cx, cy, base + height), iso(b, cx, cy, base + height), iso(b, cx, cy, base), iso(a, cx, cy, base)];
    const depth = (a[0] + a[1] + b[0] + b[1]) / 2;
    return { quad, depth };
  });
  faces.sort((p, q) => p.depth - q.depth);
  return {
    sides: faces.map((f) => pts(f.quad)),
    lid: pts(plan.map((p) => iso(p, cx, cy, base + height))),
  };
}

const OUTER = prism(92, 470, 128, 0, 22);
const INNER = prism(44, 470, 128, 22, 14);
const GUIDES = [-260, -130, 0, 130, 260, 390, 520, 650, 780];

export function KanzCover({ children }: { children?: ReactNode }): JSX.Element {
  return (
    <div className="cp-cover">
      <svg className="cp-cover-art" viewBox="0 0 760 210" preserveAspectRatio="xMidYMid slice" aria-hidden>
        <defs>
          <pattern id="cp-hatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="7" className="cp-cover-hatch" />
          </pattern>
        </defs>
        {GUIDES.map((x) => (
          <line key={`a${x}`} x1={x} y1={-10} x2={x + 380} y2={220} className="cp-cover-guide" />
        ))}
        {GUIDES.map((x) => (
          <line key={`b${x}`} x1={x + 380} y1={-10} x2={x} y2={220} className="cp-cover-guide" />
        ))}
        {[OUTER, INNER].map((p, k) => (
          <g key={k}>
            {p.sides.map((d, i) => (
              <polygon key={i} points={d} className="cp-cover-side" />
            ))}
            <polygon points={p.lid} className="cp-cover-lid" />
            <polygon points={p.lid} fill="url(#cp-hatch)" />
          </g>
        ))}
      </svg>
      <span className="cp-cover-fig">
        <span>Fig. 1.</span> Kanz — the treasure kept inside
      </span>
      {children}
    </div>
  );
}

/* ── Small pieces ─────────────────────────────────────────────────────── */

/** Says the name out loud with the browser's own voice. */
export function PronounceName({ name }: { name: string }): JSX.Element | null {
  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window;
  const [speaking, setSpeaking] = useState(false);
  if (!supported) return null;
  return (
    <button
      type="button"
      className="cp-say"
      data-speaking={speaking || undefined}
      aria-label={`Hear how to say ${name}`}
      title="Hear it"
      onClick={() => {
        const say = new SpeechSynthesisUtterance(name);
        say.rate = 0.85;
        say.onend = () => setSpeaking(false);
        say.onerror = () => setSpeaking(false);
        window.speechSynthesis.cancel();
        setSpeaking(true);
        window.speechSynthesis.speak(say);
      }}
    >
      <Volume2 size={17} strokeWidth={1.8} aria-hidden />
    </button>
  );
}

/** A band of diagonal hatching between sections, running off both edges. */
export function Hatch(): JSX.Element {
  return <div className="cp-hatch" aria-hidden />;
}

/* ── Overview grid ────────────────────────────────────────────────────── */

function Row({ icon: Icon, children }: { icon: LucideIcon; children: ReactNode }): JSX.Element {
  return (
    <li className="cp-ov-row">
      <span className="cp-ov-icon" aria-hidden>
        <Icon size={16} strokeWidth={1.7} />
      </span>
      <span className="cp-ov-text">{children}</span>
    </li>
  );
}

function LocalTime(): JSX.Element {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 20_000);
    return () => window.clearInterval(id);
  }, []);
  const time = useMemo(
    () => now.toLocaleTimeString('en-US', { timeZone: HOME_TZ, hour: 'numeric', minute: '2-digit' }),
    [now],
  );
  const gap = describeGap(tzOffsetMinutes(HOME_TZ, now), -now.getTimezoneOffset());
  return (
    <>
      <time className="cp-ov-time">{time}</time>
      <span className="cp-ov-comment"> // {gap}</span>
      <span className="sr-only"> in Morocco</span>
    </>
  );
}

function CopyEmail({ email }: { email: string }): JSX.Element {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const id = window.setTimeout(() => setCopied(false), 1600);
    return () => window.clearTimeout(id);
  }, [copied]);
  return (
    <>
      <a href={`mailto:${email}`} className="cp-ov-link">
        {email}
      </a>
      <button
        type="button"
        className="cp-copy"
        data-copied={copied || undefined}
        aria-label={copied ? 'Email copied' : 'Copy email address'}
        onClick={() => {
          void navigator.clipboard?.writeText(email).then(() => setCopied(true), () => undefined);
        }}
      >
        {copied ? <Check size={14} strokeWidth={2.4} aria-hidden /> : <Copy size={14} strokeWidth={1.8} aria-hidden />}
      </button>
      <span className="sr-only" aria-live="polite">
        {copied ? 'Copied to clipboard' : ''}
      </span>
    </>
  );
}

export function Overview({ email, flag }: { email: string; flag: ReactNode }): JSX.Element {
  return (
    <section className="cp-section" aria-labelledby="cp-overview">
      <h3 id="cp-overview" className="sr-only">
        Overview
      </h3>
      <ul className="cp-ov">
        <Row icon={Briefcase}>SOC analyst &amp; fullstack developer</Row>
        <Row icon={Clock}>
          <LocalTime />
        </Row>
        <Row icon={MapPin}>
          Morocco {flag}
        </Row>
        <Row icon={Languages}>Darija · Arabic · French · English</Row>
        <Row icon={Mail}>
          <CopyEmail email={email} />
        </Row>
        <Row icon={Globe}>
          <a href="https://kanz-workspace.vercel.app" className="cp-ov-link">
            kanz-workspace.vercel.app
          </a>
        </Row>
      </ul>
    </section>
  );
}

/* ── Stack ────────────────────────────────────────────────────────────── */

const STACK: { group: string; items: string[] }[] = [
  { group: 'Security', items: ['ELK Stack', 'OpenSearch', 'Kibana', 'Threat intel (CTI)', 'OSINT'] },
  { group: 'Languages', items: ['Python', 'TypeScript', 'JavaScript', 'SQL'] },
  { group: 'Frontend', items: ['React', 'Vite', 'Tailwind CSS', 'Three.js'] },
  { group: 'Backend & data', items: ['Flask', 'Supabase', 'PostgreSQL', 'IndexedDB'] },
  { group: 'Infra & tools', items: ['Rocky Linux', 'Git', 'GitHub', 'Vercel', 'Claude'] },
];

export function Stack(): JSX.Element {
  return (
    <section className="cp-section" aria-labelledby="cp-stack">
      <h3 id="cp-stack" className="cp-section-title">
        Stack
      </h3>
      <dl className="cp-stack">
        {STACK.map((s) => (
          <div key={s.group} className="cp-stack-row">
            <dt>{s.group}</dt>
            <dd>
              {s.items.map((item) => (
                <span key={item} className="cp-chip">
                  {item}
                </span>
              ))}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
