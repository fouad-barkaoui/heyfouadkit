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
import { Fragment, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { MenuButton } from '@/components/shell/MenuButton';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/state/languageStore';
import { originOf, useTheme } from '@/state/themeStore';
import { useUI } from '@/state/uiStore';
import { greetingFor } from './localTime';

/**
 * The name is set in PP Neue Machina Ultrabold when a licensed file sits in
 * ./fonts (see fonts/README.md); otherwise CSS falls back to Unbounded.
 */
const NAME_FONT = Object.entries(
  import.meta.glob<string>('./fonts/neue-machina-ultrabold.{woff2,woff,otf,ttf}', {
    eager: true,
    query: '?url',
    import: 'default',
  }),
)[0]?.[1];
if (NAME_FONT && typeof FontFace !== 'undefined') {
  const face = new FontFace('PP Neue Machina', `url(${NAME_FONT})`, { weight: '800', display: 'swap' });
  void face.load().then((f) => document.fonts.add(f), () => undefined);
}
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

/** The line under the name cycles through these (translation keys). */
const ROLES = [
  'pf.role.soc',
  'pf.role.fullstack',
  'pf.role.programmer',
  'pf.role.vibe',
  'pf.role.prompt',
  'pf.role.solver',
  'pf.role.analytical',
  'pf.role.cyber',
  'pf.role.learner',
];

/** Renders a translated phrase, making its <b>…</b> parts <strong>. */
function rich(text: string): ReactNode {
  return text.split(/<b>(.*?)<\/b>/).map((part, k) =>
    k % 2 ? <strong key={k}>{part}</strong> : <Fragment key={k}>{part}</Fragment>,
  );
}

/** name, handle, status and note are translation keys. */
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
    name: 'pf.social.resume.name',
    handle: 'pf.social.resume.handle',
    icon: FileText,
    status: 'pf.status.soon',
    note: 'pf.social.resume.note',
  },
  {
    id: 'github',
    name: 'pf.social.github.name',
    handle: 'pf.social.github.handle',
    url: 'https://github.com/fouad-barkaoui',
    icon: Github,
    status: 'pf.status.building',
    note: 'pf.social.github.note',
  },
  {
    id: 'linkedin',
    name: 'pf.social.linkedin.name',
    handle: 'pf.social.linkedin.handle',
    url: 'https://www.linkedin.com/in/fouad-barkaoui/',
    icon: Linkedin,
    status: 'pf.status.inProgress',
    note: 'pf.social.linkedin.note',
  },
  {
    id: 'instagram',
    name: 'pf.social.instagram.name',
    handle: 'pf.social.instagram.handle',
    url: 'https://www.instagram.com/heyfouad/',
    icon: Instagram,
  },
  {
    id: 'facebook',
    name: 'pf.social.facebook.name',
    handle: 'pf.social.facebook.handle',
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
  const { t } = useLanguage();
  const roles = useMemo(() => ROLES.map((k) => t(k)), [t]);
  const [i, setI] = useState(0);
  const [prev, setPrev] = useState<number | null>(null);
  const [paused, setPaused] = useState(false);
  const [width, setWidth] = useState<number | undefined>(undefined);
  const measure = useRef<HTMLSpanElement>(null);
  const still = useMemo(prefersReducedMotion, []);

  useLayoutEffect(() => {
    if (measure.current) setWidth(Math.ceil(measure.current.getBoundingClientRect().width));
  }, [i, roles]);

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
      <span className="sr-only">{roles.join(t('pf.listSep'))}</span>
      <span className="cp-skill-pill" aria-hidden>
        <span className="cp-skill-dot" />
        <span className="cp-skill-window" style={{ width }}>
          {prev !== null ? (
            <span key={`out-${prev}-${i}`} className="cp-skill-word is-out">
              {roles[prev]}
            </span>
          ) : null}
          <span key={`in-${i}`} className="cp-skill-word is-in">
            {roles[i]}
          </span>
        </span>
        {still ? null : <span key={`bar-${i}`} className="cp-skill-bar" onAnimationEnd={next} />}
        <span ref={measure} className="cp-skill-measure">
          {roles[i]}
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
  const { t } = useLanguage();
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
          {t(s.name)}
          {s.status ? <span className="cp-status">{t(s.status)}</span> : null}
        </span>
        <span className="cp-pill-handle">{t(s.handle)}</span>
      </span>
      {live && !s.status ? (
        <span className="inline-flex shrink-0 rtl:-scale-x-100" aria-hidden>
          <ArrowUpRight className="cp-pill-go" size={15} strokeWidth={1.8} />
        </span>
      ) : null}
      {s.note ? (
        <span id={tipId} role="tooltip" className="cp-tip">
          {t(s.note)}
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
  const { resolved, toggle } = useTheme();
  const ThemeIcon = resolved === 'light' ? Sun : Moon;
  const { t, language } = useLanguage();
  // Re-read on a language switch (greetingFor translates).
  const greeting = useMemo(() => greetingFor(new Date().getHours()), [language]);
  const { setModule } = useUI();
  const dark = resolved === 'light';

  return (
    <>
      <KanzCover>
        <button
          type="button"
          className="cp-theme"
          onClick={(e) => toggle(originOf(e.currentTarget))}
          aria-label={t(dark ? 'pf.theme.toDark.aria' : 'pf.theme.toLight.aria')}
          title={t(dark ? 'pf.theme.toDark.title' : 'pf.theme.toLight.title')}
        >
          <ThemeIcon size={16} strokeWidth={1.7} aria-hidden />
        </button>
      </KanzCover>

      <header className="cp-head">
        <div className="cp-avatar">
          <img
            src="/fouad-portrait-512.jpg"
            alt={t('pf.portraitAlt')}
            width={120}
            height={120}
            decoding="async"
          />
        </div>
        <div className="cp-head-text">
          <h2 className="cp-name">
            <span>Fouad Barkaoui</span>
            <BadgeCheck className="cp-verified" size={26} strokeWidth={1.6} aria-label={t('pf.verified')} role="img" />
          </h2>
          <SkillTicker />
        </div>
      </header>

      <Hatch />
      <Overview email={EMAIL} flag={<MoroccoFlag />} />
      <Hatch />

      <section className="cp-section" aria-labelledby="cp-about">
        <Note>{t('pf.note.sayHi')}</Note>
        <h3 id="cp-about" className="cp-greeting">
          {greeting}
        </h3>
        <ul className="cp-bio">
          <li>{rich(t('pf.bio.1'))}</li>
          <li>{rich(t('pf.bio.2'))}</li>
          <li>{rich(t('pf.bio.3'))}</li>
        </ul>

        <div className="cp-cta-row">
          <button type="button" className="cp-cta" onClick={() => setModule('contact')}>
            <MessageSquareText size={16} strokeWidth={1.8} aria-hidden />
            {t('pf.writeToMe')}
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
        <Note>{t('pf.note.findMe')}</Note>
        <h3 id="cp-socials" className="cp-section-title">
          {t('pf.section.socials')}
        </h3>
        <div className="cp-pills">
          {SOCIALS.map((s) => (
            <SocialPill key={s.id} s={s} />
          ))}
        </div>
      </section>

      <Hatch />
      <RecognitionSoon />
      <Hatch />
      <Motto />
    </>
  );
}

/* ── Page ─────────────────────────────────────────────────────────────── */

export function PortfolioModule(): JSX.Element {
  const { t } = useLanguage();
  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-col bg-void/78 backdrop-blur-2xl">
      <header className="flex items-center gap-3 border-b border-graphite px-4 py-3.5 md:px-7 md:py-4">
        <MenuButton className="md:hidden" />
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-[19px] font-medium leading-tight tracking-[-0.016em] text-paper md:text-[21px]">
            {t('pf.title')}
          </h1>
          <p className="mt-1 truncate text-[12.5px] text-ash">{t('pf.subtitle')}</p>
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
