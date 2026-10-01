import {
  ArrowUpRight,
  BadgeCheck,
  Facebook,
  FileText,
  Github,
  Instagram,
  Linkedin,
  MessageSquareText,
  Moon,
  Sun,
  type LucideIcon,
} from 'lucide-react';
import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { MenuButton } from '@/components/shell/MenuButton';
import { cn } from '@/lib/utils';
import { originOf, useTheme } from '@/state/themeStore';
import { useUI } from '@/state/uiStore';
import { greetingFor } from './localTime';
import {
  BuiltWith,
  ExperienceSoon,
  Hatch,
  KanzCover,
  Motto,
  Note,
  Overview,
  Projects,
  RecognitionSoon,
  Rule,
  Stack,
} from './ProfileExtras';

/* ── Who I am ─────────────────────────────────────────────────────────── */

const EMAIL = 'fouadbr2001@gmail.com';

/** The line under the name cycles through these. */
const ROLES = [
  'Beginner SOC Analyst',
  'Fullstack Web Developer',
  'Programmer',
  'Vibe Coder',
  'Prompt Engineer',
  'Problem Solver',
  'Analytical Thinker',
  'Cybersecurity Enthusiast',
  'Fast, Curious Learner',
];

interface Social {
  id: string;
  name: string;
  /** Second line on the tile. */
  handle: string;
  /** No url = not live yet (renders as a locked tile). */
  url?: string;
  icon: LucideIcon;
  /** Small status badge, for things that aren't finished. */
  status?: string;
  /** Longer explanation, shown as a tooltip and read to screen readers. */
  note?: string;
}

const SOCIALS: Social[] = [
  {
    id: 'resume',
    name: 'Resume',
    handle: 'PDF · on its way',
    icon: FileText,
    status: 'Soon',
    note: 'My resume is coming soon.',
  },
  {
    id: 'github',
    name: 'GitHub',
    handle: 'fouad-barkaoui',
    url: 'https://github.com/fouad-barkaoui',
    icon: Github,
    status: 'Building',
    note: 'Under construction — a brand-new account, repositories are on their way.',
  },
  {
    id: 'linkedin',
    name: 'LinkedIn',
    handle: 'fouad-barkaoui',
    url: 'https://www.linkedin.com/in/fouad-barkaoui/',
    icon: Linkedin,
    status: 'In progress',
    note: 'In development — the profile is still being put together.',
  },
  {
    id: 'instagram',
    name: 'Instagram',
    handle: '@heyfouad',
    url: 'https://www.instagram.com/heyfouad/',
    icon: Instagram,
  },
  {
    id: 'facebook',
    name: 'Facebook',
    handle: 'Fouad Barkaoui',
    url: 'https://www.facebook.com/share/16E8VLshmwD/',
    icon: Facebook,
  },
];

/* ── Profile card pieces ──────────────────────────────────────────────── */

/** Small inline Moroccan flag — emoji flags don't render on Windows. */
function MoroccoFlag(): JSX.Element {
  return (
    <svg className="cp-flag" viewBox="0 0 24 16" width="18" height="12" aria-hidden>
      <rect width="24" height="16" rx="2" fill="#c1272d" />
      <path
        d="M12 3.6l1.6 4.9-4.1-3h5l-4.1 3z"
        fill="none"
        stroke="#006233"
        strokeWidth="0.9"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const prefersReducedMotion = (): boolean =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * The skills line: one skill at a time in a pill that eases to the width of
 * each word. A hairline along the bottom fills up to the next change and is
 * also the clock, so pausing it (hover or focus) pauses the whole ticker.
 */
function SkillTicker(): JSX.Element {
  const [i, setI] = useState(0);
  const [prev, setPrev] = useState<number | null>(null);
  const [paused, setPaused] = useState(false);
  const [width, setWidth] = useState<number | undefined>(undefined);
  const measure = useRef<HTMLSpanElement>(null);
  const still = useMemo(prefersReducedMotion, []);

  useLayoutEffect(() => {
    if (measure.current) setWidth(Math.ceil(measure.current.getBoundingClientRect().width));
  }, [i]);

  const next = (): void => {
    setPrev(i);
    setI((n) => (n + 1) % ROLES.length);
  };

  return (
    <div
      className="cp-skill"
      data-paused={paused || undefined}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Screen readers get the whole list once, not a chatty live region. */}
      <span className="sr-only">{ROLES.join(', ')}</span>
      <span className="cp-skill-pill" aria-hidden>
        <span className="cp-skill-dot" />
        <span className="cp-skill-window" style={{ width }}>
          {prev !== null ? (
            <span key={`out-${prev}-${i}`} className="cp-skill-word is-out">
              {ROLES[prev]}
            </span>
          ) : null}
          <span key={`in-${i}`} className="cp-skill-word is-in">
            {ROLES[i]}
          </span>
        </span>
        {still ? null : <span key={`bar-${i}`} className="cp-skill-bar" onAnimationEnd={next} />}
        <span ref={measure} className="cp-skill-measure">
          {ROLES[i]}
        </span>
      </span>
      <span className="cp-skill-count" aria-hidden>
        {String(i + 1).padStart(2, '0')}
        <span>/{String(ROLES.length).padStart(2, '0')}</span>
      </span>
    </div>
  );
}

function SocialPill({ s }: { s: Social }): JSX.Element {
  const Icon = s.icon;
  const live = Boolean(s.url);
  const tipId = s.note ? `cp-tip-${s.id}` : undefined;
  const body = (
    <>
      <span className="cp-pill-icon" aria-hidden>
        <Icon size={17} strokeWidth={1.7} />
      </span>
      <span className="cp-pill-text">
        <span className="cp-pill-name">
          {s.name}
          {s.status ? <span className="cp-status">{s.status}</span> : null}
        </span>
        <span className="cp-pill-handle">{s.handle}</span>
      </span>
      {live && !s.status ? <ArrowUpRight className="cp-pill-go" size={15} strokeWidth={1.8} aria-hidden /> : null}
      {s.note ? (
        <span id={tipId} role="tooltip" className="cp-tip">
          {s.note}
        </span>
      ) : null}
    </>
  );
  const common = {
    className: cn('cp-pill', !live && 'is-locked'),
    'aria-describedby': tipId,
  };
  return live ? (
    <a {...common} href={s.url} target="_blank" rel="noopener noreferrer">
      {body}
    </a>
  ) : (
    <button {...common} type="button" aria-disabled="true" onClick={(e) => e.currentTarget.focus()}>
      {body}
    </button>
  );
}

function ProfileCard(): JSX.Element {
  const { preference, toggle } = useTheme();
  const ThemeIcon = preference === 'light' ? Sun : Moon;
  const greeting = useMemo(() => greetingFor(new Date().getHours()), []);
  const { setModule } = useUI();

  return (
    <>
      <KanzCover>
        <button
          type="button"
          className="cp-theme"
          onClick={(e) => toggle(originOf(e.currentTarget))}
          aria-label={`Switch the whole app to ${preference === 'light' ? 'dark' : 'light'} theme`}
          title={`Switch the whole app to ${preference === 'light' ? 'dark' : 'light'}`}
        >
          <ThemeIcon size={16} strokeWidth={1.7} aria-hidden />
        </button>
      </KanzCover>

      <header className="cp-head">
        <div className="cp-avatar">
          <img
            src="/fouad-portrait-512.jpg"
            alt="Portrait of Fouad Barkaoui"
            width={120}
            height={120}
            decoding="async"
          />
        </div>
        <div className="cp-head-text">
          <h2 className="cp-name">
            <span>Fouad Barkaoui</span>
            <BadgeCheck className="cp-verified" size={26} strokeWidth={1.6} aria-label="Verified" role="img" />
          </h2>
          <SkillTicker />
        </div>
      </header>

      <Motto />

      <Hatch />
      <Overview email={EMAIL} flag={<MoroccoFlag />} />
      <Hatch />

      <section className="cp-section" aria-labelledby="cp-about">
        <Note>say hi</Note>
        <h3 id="cp-about" className="cp-greeting">
          {greeting}
        </h3>
        <ul className="cp-bio">
          <li>
            I'm <strong>Fouad Barkaoui</strong> — a <strong>beginner SOC analyst</strong> and{' '}
            <strong>fullstack web developer</strong> from Morocco.
          </li>
          <li>
            A <strong>programmer</strong>, <strong>vibe coder</strong> and <strong>prompt engineer</strong> who turns
            ideas into working products — fast, clean and <strong>secure by default</strong>.
          </li>
          <li>
            My edge is <strong>problem solving</strong>: I break big, messy problems into small steps, stay curious, and
            keep learning how systems get built — and how they get attacked.
          </li>
        </ul>

        <div className="cp-cta-row">
          <button type="button" className="cp-cta" onClick={() => setModule('contact')}>
            <MessageSquareText size={16} strokeWidth={1.8} aria-hidden />
            Write to me
          </button>
        </div>
      </section>

      <Rule />
      <ExperienceSoon />
      <Rule />
      <Projects />
      <Rule />
      <Stack />
      <Hatch />
      <BuiltWith />
      <Hatch />

      <section className="cp-section" aria-labelledby="cp-socials">
        <Note>find me here</Note>
        <h3 id="cp-socials" className="cp-section-title">
          Socials
        </h3>
        <div className="cp-pills">
          {SOCIALS.map((s) => (
            <SocialPill key={s.id} s={s} />
          ))}
        </div>
      </section>

      <Hatch />
      <RecognitionSoon />
    </>
  );
}

/* ── Page ─────────────────────────────────────────────────────────────── */

export function PortfolioModule(): JSX.Element {
  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-col bg-void/78 backdrop-blur-2xl">
      <header className="flex items-center gap-3 border-b border-graphite px-4 py-3.5 md:px-7 md:py-4">
        <MenuButton className="md:hidden" />
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-[19px] font-medium leading-tight tracking-[-0.016em] text-paper md:text-[21px]">
            About the Founder
          </h1>
          <p className="mt-1 truncate text-[12.5px] text-ash">The person behind Kanz — background, experience and stack.</p>
        </div>
      </header>

      <div className="scroll-y min-h-0 flex-1">
        <div className="cp-wrap">
          <Rule />
          <div className="cp-frame">
            <ProfileCard />
            <Rule />
          </div>
        </div>
      </div>
    </div>
  );
}
