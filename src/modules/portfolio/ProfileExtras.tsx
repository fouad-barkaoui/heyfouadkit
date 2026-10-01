import {
  Briefcase,
  Check,
  ChevronsDownUp,
  ChevronsUpDown,
  Code2,
  Clock,
  Copy,
  Globe,
  ShieldCheck,
  Sparkles,
  Languages,
  Mail,
  MapPin,
  type LucideIcon,
} from 'lucide-react';
import { useEffect, useId, useMemo, useState, type ReactNode } from 'react';
import { KanzStar } from '@/components/ui/KanzWordmark';
import { HOME_TZ, describeGap, formatDuration, formatMonth, tzOffsetMinutes } from './localTime';

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
      <Note>the basics</Note>
      <h3 id="cp-overview" className="sr-only">
        Overview
      </h3>
      <ul className="cp-ov">
        <Row icon={Briefcase}>SOC analyst &amp; fullstack developer</Row>
        <Row icon={Sparkles}>Vibe coder &amp; prompt engineer</Row>
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
  { group: 'Security', items: ['ELK Stack', 'OpenSearch', 'Kibana', 'Threat intel (CTI)', 'OSINT', 'Firecrawl'] },
  { group: 'Languages', items: ['Python', 'TypeScript', 'JavaScript', 'SQL'] },
  { group: 'Frontend', items: ['React', 'Vite', 'Tailwind CSS', 'Three.js'] },
  { group: 'Backend & data', items: ['REST APIs', 'Supabase', 'PostgreSQL', 'IndexedDB'] },
  { group: 'Infra & tools', items: ['Kali Linux', 'Docker', 'Git', 'GitHub', 'Vercel', 'Claude'] },
];

export function Stack(): JSX.Element {
  return (
    <section className="cp-section" aria-labelledby="cp-stack">
      <Note>my daily tools</Note>
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

/* ── Handwritten margin note with a curved arrow ──────────────────────── */

/** A scribbled aside in the left margin, pointing into its section. Wide screens only. */
export function Note({ children }: { children: ReactNode }): JSX.Element {
  return (
    <span className="cp-note" aria-hidden>
      <span className="cp-note-text">{children}</span>
      <svg className="cp-note-arrow" viewBox="0 0 44 40" width="44" height="40">
        <path d="M6 3c-2 12 2 24 14 29c5 2 11 2 17 0" />
        <path d="M30 27l7 5l-7 5" />
      </svg>
    </span>
  );
}

/* ── Projects ───────────────────────────────────────────────────────── */

interface Role {
  title: string;
  icon: LucideIcon;
  kind: string;
  /** YYYY-MM */
  start: string;
  points: string[];
  tags: string[];
}

interface Venture {
  name: string;
  where: string;
  status: string;
  url?: string;
  roles: Role[];
}

const PROJECTS: Venture[] = [
  {
    name: 'ASSAS',
    where: 'Morocco (Remote)',
    status: 'In development',
    roles: [
      {
        title: 'Founder & Security Developer',
        icon: ShieldCheck,
        kind: 'Own SaaS',
        start: '2026-09',
        points: [
          'A SaaS that scans a full codebase for threats, bugs and violations of security rules.',
          'Checks authentication, encryption, session handling, input validation, rate limiting and error handling.',
          'Covers logging, backups, monitoring and dependency scanning, then reports every finding in one place.',
          'Monitors live targets with Firecrawl, crawling sites to catch new exposures as they appear.',
          'Built as a multi-tenant cloud service, one workspace per team.',
        ],
        tags: ['Python', 'Static analysis', 'Dependency scanning', 'Firecrawl', 'REST APIs', 'Docker', 'SaaS'],
      },
    ],
  },
  {
    name: 'Kanz',
    where: 'Morocco (Remote)',
    status: 'Live',
    url: 'https://kanz-workspace.vercel.app',
    roles: [
      {
        title: 'Founder & Fullstack Developer',
        icon: Code2,
        kind: 'Own product',
        start: '2026-09',
        points: [
          'A private workspace that keeps notes, tasks, articles, courses, docs and analytics on one spatial canvas.',
          'Works offline first and syncs through Supabase, with row-level security on every table.',
          'Google sign-in, team invites and roles, and a private contact inbox.',
          'Designed the brand end to end: the KANZ wordmark, the star icon and this page.',
        ],
        tags: ['React', 'TypeScript', 'Vite', 'Tailwind CSS', 'Supabase', 'PostgreSQL', 'Vercel', 'Claude Code'],
      },
    ],
  },
];

function RoleItem({ role }: { role: Role }): JSX.Element {
  const [open, setOpen] = useState(true);
  const id = useId();
  const Icon = role.icon;
  const now = useMemo(() => new Date(), []);
  return (
    <div className="cp-role-item" data-open={open || undefined}>
      <button
        type="button"
        className="cp-role-head"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="cp-role-icon" aria-hidden>
          <Icon size={15} strokeWidth={1.8} />
        </span>
        <span className="cp-role-main">
          <span className="cp-role-title">{role.title}</span>
          <span className="cp-role-meta">
            <span>{role.kind}</span>
            <span>
              {formatMonth(role.start)} — <span aria-label="present">∞</span>
            </span>
            <span>{formatDuration(role.start, now)}</span>
          </span>
        </span>
        {open ? (
          <ChevronsDownUp className="cp-role-toggle" size={15} strokeWidth={1.8} aria-hidden />
        ) : (
          <ChevronsUpDown className="cp-role-toggle" size={15} strokeWidth={1.8} aria-hidden />
        )}
      </button>
      <div id={id} className="cp-role-body" hidden={!open}>
        <ul className="cp-role-points">
          {role.points.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
        <div className="cp-role-tags">
          {role.tags.map((t) => (
            <span key={t} className="cp-tag">
              {t}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export function Projects(): JSX.Element {
  return (
    <section className="cp-section" aria-labelledby="cp-projects">
      <Note>what I'm building</Note>
      <h3 id="cp-projects" className="cp-section-title">
        Projects <sup className="cp-count">({PROJECTS.length})</sup>
      </h3>
      <div className="cp-exp">
        {PROJECTS.map((v) => (
          <article key={v.name} className="cp-venture">
            <header className="cp-venture-head">
              {v.url ? (
                <a href={v.url} className="cp-venture-name" target="_blank" rel="noopener noreferrer">
                  {v.name}
                </a>
              ) : (
                <span className="cp-venture-name">{v.name}</span>
              )}
              <span className="cp-venture-where">
                {v.where}
                <span className="cp-venture-status" data-status={v.status === 'Live' ? 'live' : 'dev'}>
                  {v.status}
                </span>
              </span>
            </header>
            {v.roles.map((r) => (
              <RoleItem key={r.title} role={r} />
            ))}
          </article>
        ))}
      </div>
    </section>
  );
}

/* ── Built with ───────────────────────────────────────────────────────── */

/**
 * Official logo files dropped into ./logos (see logos/README.md) are picked
 * up at build time; a company without a file shows its name instead.
 */
const LOGO_FILES = import.meta.glob<string>('./logos/*.{svg,png,webp}', {
  eager: true,
  query: '?url',
  import: 'default',
});
const logoFor = (slug: string): string | undefined =>
  Object.entries(LOGO_FILES).find(([path]) => path.replace(/^.*\//, '').replace(/\.[a-z]+$/, '') === slug)?.[1];

const BUILT_WITH = [
  { name: 'Supabase', slug: 'supabase', url: 'https://supabase.com' },
  { name: 'Claude', slug: 'claude', url: 'https://claude.ai' },
  { name: 'Claude Code', slug: 'claude-code', url: 'https://claude.com/claude-code' },
  { name: 'Vercel', slug: 'vercel', url: 'https://vercel.com' },
  { name: 'GitHub', slug: 'github', url: 'https://github.com' },
  { name: 'MITRE ATT&CK', slug: 'mitre-attack', url: 'https://attack.mitre.org' },
];

export function BuiltWith(): JSX.Element {
  return (
    <section className="cp-built" aria-labelledby="cp-built">
      <Note>big thanks</Note>
      <h3 id="cp-built" className="cp-built-title">
        Built with
      </h3>
      <ul className="cp-built-grid">
        {BUILT_WITH.map((b) => {
          const logo = logoFor(b.slug);
          return (
            <li key={b.slug}>
              <a href={b.url} target="_blank" rel="noopener noreferrer" className="cp-built-name">
                {logo ? <img src={logo} alt={b.name} className="cp-built-logo" loading="lazy" /> : b.name}
              </a>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** Dashed rule across the frame, with a plus mark where it meets each edge. */
export function Rule(): JSX.Element {
  return (
    <div className="cp-rule" aria-hidden>
      <i className="cp-plus" data-side="start" />
      <i className="cp-plus" data-side="end" />
    </div>
  );
}

/* ── Coming soon: Experience, Recognition ─────────────────────────────── */

/** A hatched placeholder panel with a Soon badge, for sections still being filled. */
function SoonPanel({ children }: { children: ReactNode }): JSX.Element {
  return (
    <div className="cp-soon">
      <span className="cp-status">Soon</span>
      <p>{children}</p>
    </div>
  );
}

export function ExperienceSoon(): JSX.Element {
  return (
    <section className="cp-section" aria-labelledby="cp-experience">
      <Note>where I've worked</Note>
      <h3 id="cp-experience" className="cp-section-title">
        Experience
      </h3>
      <SoonPanel>Roles, internships and positions will be listed here.</SoonPanel>
    </section>
  );
}

export function RecognitionSoon(): JSX.Element {
  return (
    <section className="cp-section" aria-labelledby="cp-recognition">
      <Note>milestones</Note>
      <h3 id="cp-recognition" className="cp-section-title">
        Recognition
      </h3>
      <SoonPanel>Certificates, awards and programs will be listed here.</SoonPanel>
    </section>
  );
}

/* ── Motto ────────────────────────────────────────────────────────────── */

export function Motto(): JSX.Element {
  return (
    <div className="cp-motto-wrap">
      <figure className="cp-motto">
        <span className="cp-motto-mark" aria-hidden>
          &ldquo;
        </span>
        <KanzStar size={26} className="cp-motto-sticker" />
        <blockquote>
          <p>&ldquo;Inspired by the fear of being average.&rdquo;</p>
        </blockquote>
        <figcaption>— Unknown</figcaption>
      </figure>
    </div>
  );
}
