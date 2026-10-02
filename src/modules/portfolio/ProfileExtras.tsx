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
import { useLanguage } from '@/state/languageStore';
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
  const { t } = useLanguage();
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
        <span>{t('pf.cover.fig')}</span> {t('pf.cover.caption')}
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
  const { t, locale } = useLanguage();
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 20_000);
    return () => window.clearInterval(id);
  }, []);
  const time = useMemo(
    () => now.toLocaleTimeString(locale, { timeZone: HOME_TZ, hour: 'numeric', minute: '2-digit' }),
    [now, locale],
  );
  const gap = describeGap(tzOffsetMinutes(HOME_TZ, now), -now.getTimezoneOffset());
  return (
    <>
      <time className="cp-ov-time">{time}</time>
      <span className="cp-ov-comment"> // {gap}</span>
      <span className="sr-only">{t('pf.ov.inMorocco')}</span>
    </>
  );
}

function CopyEmail({ email }: { email: string }): JSX.Element {
  const { t } = useLanguage();
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
        aria-label={t(copied ? 'pf.ov.emailCopied' : 'pf.ov.copyEmail')}
        onClick={() => {
          void navigator.clipboard?.writeText(email).then(() => setCopied(true), () => undefined);
        }}
      >
        {copied ? <Check size={14} strokeWidth={2.4} aria-hidden /> : <Copy size={14} strokeWidth={1.8} aria-hidden />}
      </button>
      <span className="sr-only" aria-live="polite">
        {copied ? t('pf.ov.copiedToClipboard') : ''}
      </span>
    </>
  );
}

export function Overview({ email, flag }: { email: string; flag: ReactNode }): JSX.Element {
  const { t } = useLanguage();
  return (
    <section className="cp-section" aria-labelledby="cp-overview">
      <Note>{t('pf.note.basics')}</Note>
      <h3 id="cp-overview" className="sr-only">
        {t('pf.section.overview')}
      </h3>
      <ul className="cp-ov">
        <Row icon={Briefcase}>{t('pf.ov.role')}</Row>
        <Row icon={Sparkles}>{t('pf.ov.craft')}</Row>
        <Row icon={Clock}>
          <LocalTime />
        </Row>
        <Row icon={MapPin}>
          {t('pf.ov.country')} {flag}
        </Row>
        <Row icon={Languages}>{t('pf.ov.languages')}</Row>
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

/** Tool names stay as written; entries starting with `pf.` are translation keys. */
const label = (t: (key: string) => string, text: string): string => (text.startsWith('pf.') ? t(text) : text);

const STACK: { group: string; items: string[] }[] = [
  { group: 'pf.stack.security', items: ['ELK Stack', 'OpenSearch', 'Kibana', 'pf.stack.cti', 'OSINT', 'Firecrawl'] },
  { group: 'pf.stack.languages', items: ['Python', 'TypeScript', 'JavaScript', 'SQL'] },
  { group: 'pf.stack.frontend', items: ['React', 'Vite', 'Tailwind CSS', 'Three.js'] },
  { group: 'pf.stack.backend', items: ['REST APIs', 'Supabase', 'PostgreSQL', 'IndexedDB'] },
  { group: 'pf.stack.infra', items: ['Kali Linux', 'Docker', 'Git', 'GitHub', 'Vercel', 'Claude'] },
];

export function Stack(): JSX.Element {
  const { t } = useLanguage();
  return (
    <section className="cp-section" aria-labelledby="cp-stack">
      <Note>{t('pf.note.tools')}</Note>
      <h3 id="cp-stack" className="cp-section-title">
        {t('pf.section.stack')}
      </h3>
      <dl className="cp-stack">
        {STACK.map((s) => (
          <div key={s.group} className="cp-stack-row">
            <dt>{t(s.group)}</dt>
            <dd>
              {s.items.map((item) => (
                <span key={item} className="cp-chip">
                  {label(t, item)}
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

/** title, kind, points, where and status are translation keys; tags use `label`. */
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
    where: 'pf.proj.remote',
    status: 'pf.proj.status.dev',
    roles: [
      {
        title: 'pf.proj.assas.title',
        icon: ShieldCheck,
        kind: 'pf.proj.kind.saas',
        start: '2026-09',
        points: ['pf.proj.assas.p1', 'pf.proj.assas.p2', 'pf.proj.assas.p3', 'pf.proj.assas.p4', 'pf.proj.assas.p5'],
        tags: ['Python', 'pf.proj.tag.static', 'pf.proj.tag.deps', 'Firecrawl', 'REST APIs', 'Docker', 'SaaS'],
      },
    ],
  },
  {
    name: 'Kanz',
    where: 'pf.proj.remote',
    status: 'pf.proj.status.live',
    url: 'https://kanz-workspace.vercel.app',
    roles: [
      {
        title: 'pf.proj.kanz.title',
        icon: Code2,
        kind: 'pf.proj.kind.product',
        start: '2026-09',
        points: ['pf.proj.kanz.p1', 'pf.proj.kanz.p2', 'pf.proj.kanz.p3', 'pf.proj.kanz.p4'],
        tags: ['React', 'TypeScript', 'Vite', 'Tailwind CSS', 'Supabase', 'PostgreSQL', 'Vercel', 'Claude Code'],
      },
    ],
  },
];

function RoleItem({ role }: { role: Role }): JSX.Element {
  const { t } = useLanguage();
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
          <span className="cp-role-title">{t(role.title)}</span>
          <span className="cp-role-meta">
            <span>{t(role.kind)}</span>
            <span>
              {formatMonth(role.start)} — <span aria-label={t('pf.present')}>∞</span>
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
            <li key={p}>{t(p)}</li>
          ))}
        </ul>
        <div className="cp-role-tags">
          {role.tags.map((tag) => (
            <span key={tag} className="cp-tag">
              {label(t, tag)}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export function Projects(): JSX.Element {
  const { t } = useLanguage();
  return (
    <section className="cp-section" aria-labelledby="cp-projects">
      <Note>{t('pf.note.building')}</Note>
      <h3 id="cp-projects" className="cp-section-title">
        {t('pf.section.projects')} <sup className="cp-count">({PROJECTS.length})</sup>
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
                {t(v.where)}
                <span className="cp-venture-status" data-status={v.status === 'pf.proj.status.live' ? 'live' : 'dev'}>
                  {t(v.status)}
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
  const { t } = useLanguage();
  return (
    <section className="cp-built" aria-labelledby="cp-built">
      <Note>{t('pf.note.thanks')}</Note>
      <h3 id="cp-built" className="cp-built-title">
        {t('pf.section.builtWith')}
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
  const { t } = useLanguage();
  return (
    <div className="cp-soon">
      <span className="cp-status">{t('pf.status.soon')}</span>
      <p>{children}</p>
    </div>
  );
}

export function ExperienceSoon(): JSX.Element {
  const { t } = useLanguage();
  return (
    <section className="cp-section" aria-labelledby="cp-experience">
      <Note>{t('pf.note.worked')}</Note>
      <h3 id="cp-experience" className="cp-section-title">
        {t('pf.section.experience')}
      </h3>
      <SoonPanel>{t('pf.soon.experience')}</SoonPanel>
    </section>
  );
}

export function RecognitionSoon(): JSX.Element {
  const { t } = useLanguage();
  return (
    <section className="cp-section" aria-labelledby="cp-recognition">
      <Note>{t('pf.note.milestones')}</Note>
      <h3 id="cp-recognition" className="cp-section-title">
        {t('pf.section.recognition')}
      </h3>
      <SoonPanel>{t('pf.soon.recognition')}</SoonPanel>
    </section>
  );
}

/* ── Motto ────────────────────────────────────────────────────────────── */

/** Four-point sparkle, drawn so it can take the accent colour. */
function Sparkle({ className }: { className?: string }): JSX.Element {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden>
      <path d="M12 0c.9 6.4 5.6 11.1 12 12-6.4.9-11.1 5.6-12 12-.9-6.4-5.6-11.1-12-12C6.4 11.1 11.1 6.4 12 0Z" />
    </svg>
  );
}

/** The motto as a headline: a small lead line, then the key words selected. */
export function Motto(): JSX.Element {
  const { t } = useLanguage();
  return (
    <div className="cp-motto-wrap">
      <figure className="cp-motto" aria-label={`${t('pf.motto.lead')} ${t('pf.motto.big')}`}>
        <p className="cp-motto-lead" aria-hidden>
          <span className="cp-motto-bubble">
            <i />
            <i />
            <i />
          </span>
          <span className="cp-motto-lead-text">{t('pf.motto.lead')}</span>
        </p>
        <p className="cp-motto-big" aria-hidden>
          <span className="cp-motto-sel">
            {t('pf.motto.big')}
            <i className="cp-motto-handle is-start" />
            <i className="cp-motto-handle is-end" />
          </span>
          <span className="cp-motto-sparks">
            <Sparkle className="is-a" />
            <Sparkle className="is-b" />
            <Sparkle className="is-c" />
          </span>
        </p>
      </figure>
    </div>
  );
}
