import {
  Archive,
  BadgeCheck,
  Bug,
  Check,
  Facebook,
  FileText,
  Github,
  Handshake,
  Inbox,
  Instagram,
  Lightbulb,
  Linkedin,
  Loader2,
  Mail,
  MapPin,
  MessageSquareHeart,
  MessagesSquare,
  Moon,
  RefreshCw,
  Send,
  Sun,
  Trash2,
  type LucideIcon,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { MenuButton } from '@/components/shell/MenuButton';
import { Button } from '@/components/ui/Button';
import { cloudConfigured } from '@/data/supabaseClient';
import {
  CONTACT_LIMITS,
  deleteContactMessage,
  listContactMessages,
  sendContactMessage,
  setContactStatus,
  validateContact,
  type ContactDraft,
  type ContactMessage,
  type ContactTopic,
} from '@/data/contact';
import { isAdminUser } from '@/lib/access';
import { cn, relativeTime } from '@/lib/utils';
import { getDisplayName, useAuth } from '@/state/authStore';
import { useTheme } from '@/state/themeStore';

/* ── Who I am ─────────────────────────────────────────────────────────── */

const EMAIL = 'lmorfouad3@gmail.com';

/** The line under the name cycles through these. */
const ROLES = [
  'Beginner SOC Analyst',
  'Fullstack Web Developer',
  'Programmer',
  'Vibe Coder',
  'Problem Solver',
  'Analytical Thinker',
  'Cybersecurity Enthusiast',
  'Fast, Curious Learner',
];
const ROLE_MS = 2600;

interface Social {
  id: string;
  name: string;
  /** No url = not live yet (renders as a disabled pill). */
  url?: string;
  icon: LucideIcon;
  /** Diagonal corner ribbon, for things that aren't finished. */
  ribbon?: string;
  /** Longer explanation for tooltips and screen readers. */
  note?: string;
}

const SOCIALS: Social[] = [
  { id: 'resume', name: 'Resume', icon: FileText, ribbon: 'Coming soon', note: 'My resume is coming soon.' },
  {
    id: 'github',
    name: 'GitHub',
    url: 'https://github.com/fouad-barkaoui',
    icon: Github,
    ribbon: 'Building',
    note: 'Under construction — a brand-new account, repositories are on their way.',
  },
  {
    id: 'linkedin',
    name: 'LinkedIn',
    url: 'https://www.linkedin.com/in/fouad-barkaoui/',
    icon: Linkedin,
    ribbon: 'In progress',
    note: 'In development — the profile is still being put together.',
  },
  { id: 'instagram', name: 'Instagram', url: 'https://www.instagram.com/heyfouad/', icon: Instagram },
  { id: 'facebook', name: 'Facebook', url: 'https://www.facebook.com/share/16E8VLshmwD/', icon: Facebook },
];

const TOPICS: { id: ContactTopic; label: string; icon: LucideIcon; hint: string }[] = [
  { id: 'feedback', label: 'Feedback', icon: MessageSquareHeart, hint: 'What you like, what feels off' },
  { id: 'bug', label: 'Bug report', icon: Bug, hint: 'What you did, what you expected, what happened' },
  { id: 'idea', label: 'Feature idea', icon: Lightbulb, hint: 'The problem it would solve for you' },
  { id: 'collab', label: 'Collaboration', icon: Handshake, hint: 'Who you are and what you have in mind' },
  { id: 'other', label: 'Other', icon: MessagesSquare, hint: 'Anything else' },
];

const TOPIC_LABEL: Record<ContactTopic, string> = Object.fromEntries(TOPICS.map((t) => [t.id, t.label])) as Record<
  ContactTopic,
  string
>;

const DRAFT_KEY = 'heyfouad.contact.draft.v1';

function loadDraft(): Partial<ContactDraft> {
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY);
    return raw ? (JSON.parse(raw) as Partial<ContactDraft>) : {};
  } catch {
    return {};
  }
}

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

function RotatingRole(): JSX.Element {
  const [i, setI] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setI((n) => (n + 1) % ROLES.length), ROLE_MS);
    return () => window.clearInterval(id);
  }, []);
  return (
    <p className="cp-role">
      {/* Screen readers get the whole list once, not a chatty live region. */}
      <span className="sr-only">{ROLES.join(', ')}</span>
      <span key={i} className="cp-role-word" aria-hidden>
        {ROLES[i]}
      </span>
    </p>
  );
}

function SocialPill({ s }: { s: Social }): JSX.Element {
  const Icon = s.icon;
  const body = (
    <>
      <Icon size={16} strokeWidth={1.8} aria-hidden />
      <span>{s.name}</span>
      {s.ribbon ? (
        <span className="cp-ribbon" aria-hidden>
          <span>{s.ribbon}</span>
        </span>
      ) : null}
      {s.note ? <span className="sr-only"> — {s.note}</span> : null}
    </>
  );
  const cls = cn('cp-pill', s.ribbon && 'has-ribbon');
  return s.url ? (
    <a className={cls} href={s.url} target="_blank" rel="noopener noreferrer" title={s.note}>
      {body}
    </a>
  ) : (
    <button type="button" className={cls} aria-disabled="true" title={s.note} onClick={(e) => e.preventDefault()}>
      {body}
    </button>
  );
}

function Rule(): JSX.Element {
  return (
    <div className="cp-rule" aria-hidden>
      <i className="cp-plus" data-side="start" />
      <i className="cp-plus" data-side="end" />
    </div>
  );
}

function ProfileCard(): JSX.Element {
  const { preference, toggle } = useTheme();
  const ThemeIcon = preference === 'light' ? Sun : Moon;

  const goToForm = (): void => {
    const el = document.getElementById('contact-form-card');
    if (!el) return;
    const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.scrollIntoView({ behavior: calm ? 'auto' : 'smooth', block: 'start' });
    window.setTimeout(() => document.getElementById('contact-subject')?.focus({ preventScroll: true }), calm ? 0 : 450);
  };

  return (
    <>
      <header className="cp-head">
        <div className="cp-avatar">
          <img
            src="/fouad-portrait-512.jpg"
            alt="Portrait of Fouad Barkaoui"
            width={100}
            height={100}
            decoding="async"
          />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="cp-name">
            <span>Fouad Barkaoui</span>
            <BadgeCheck className="cp-verified" size={22} strokeWidth={1.6} aria-label="Verified" role="img" />
          </h2>
          <RotatingRole />
          <p className="cp-location">
            <MapPin size={13} strokeWidth={1.9} aria-hidden />
            <span>Morocco-based</span>
            <MoroccoFlag />
          </p>
        </div>
        <button
          type="button"
          className="cp-theme"
          onClick={toggle}
          aria-label={`Switch to ${preference === 'light' ? 'dark' : 'light'} theme`}
        >
          <ThemeIcon size={16} strokeWidth={1.7} aria-hidden />
        </button>
      </header>

      <Rule />

      <div className="cp-body">
        <p className="cp-bio">
          Hey, I'm <strong>Fouad Barkaoui</strong>, a <strong>beginner SOC analyst</strong> and{' '}
          <strong>fullstack web developer</strong> from Morocco. I'm a <strong>programmer</strong> and a{' '}
          <strong>vibe coder</strong> who loves turning ideas into working products — fast, clean and{' '}
          <strong>secure by default</strong>. My edge is <strong>problem solving</strong>: I break big, messy problems
          into small steps, stay curious, and keep learning how systems get built — and how they get attacked.
        </p>

        <div className="cp-cta-row">
          <button type="button" className="cp-cta" onClick={goToForm}>
            <MessageSquareHeart size={16} strokeWidth={1.8} aria-hidden />
            Send a Message
          </button>
          <a className="cp-cta" href={`mailto:${EMAIL}`}>
            <Mail size={16} strokeWidth={1.8} aria-hidden />
            Send an Email
          </a>
        </div>

        <p className="cp-socials-title">
          Here are my <strong>socials</strong>
        </p>
        <div className="cp-pills">
          {SOCIALS.map((s) => (
            <SocialPill key={s.id} s={s} />
          ))}
        </div>
      </div>
    </>
  );
}

/* ── Form ─────────────────────────────────────────────────────────────── */

function ContactForm(): JSX.Element {
  const { user } = useAuth();
  const initial = useMemo(() => loadDraft(), []);
  const [draft, setDraft] = useState<ContactDraft>(() => ({
    name: initial.name ?? (user ? getDisplayName(user) : ''),
    email: initial.email ?? user?.email ?? '',
    topic: initial.topic ?? 'feedback',
    subject: initial.subject ?? '',
    message: initial.message ?? '',
  }));
  const [touched, setTouched] = useState<Partial<Record<keyof ContactDraft, boolean>>>({});
  const [trap, setTrap] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [error, setError] = useState<string | null>(null);

  // Keep a draft on this device so a closed tab or a dropped connection
  // never costs someone the message they were writing.
  useEffect(() => {
    if (state === 'sent') return;
    const id = window.setTimeout(() => {
      try {
        window.localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
      } catch {
        /* private mode */
      }
    }, 300);
    return () => window.clearTimeout(id);
  }, [draft, state]);

  const errors = validateContact(draft);
  const set = <K extends keyof ContactDraft>(key: K, value: ContactDraft[K]): void => {
    setDraft((d) => ({ ...d, [key]: value }));
    setError(null);
  };
  const show = (key: keyof ContactDraft): string | undefined => (touched[key] ? errors[key] : undefined);
  const topic = TOPICS.find((t) => t.id === draft.topic) ?? TOPICS[0]!;

  const submit = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    setTouched({ name: true, email: true, subject: true, message: true });
    if (Object.keys(errors).length) return;
    if (trap) {
      // A bot filled the hidden field — pretend it worked, send nothing.
      setState('sent');
      return;
    }
    setState('sending');
    setError(null);
    try {
      await sendContactMessage(draft);
      setState('sent');
      try {
        window.localStorage.removeItem(DRAFT_KEY);
      } catch {
        /* ignore */
      }
    } catch (err) {
      setState('idle');
      setError(err instanceof Error ? err.message : 'The message could not be sent.');
    }
  };

  if (state === 'sent') {
    return (
      <div className="contact-sent" role="status">
        <span className="contact-sent-mark" aria-hidden>
          <Check size={26} strokeWidth={2.4} />
        </span>
        <h3 className="text-[17px] font-medium text-paper">Message sent — thank you!</h3>
        <p className="mt-1.5 max-w-[340px] text-[13px] leading-[1.6] text-fog">
          It went straight to my inbox. I'll reply to <span className="text-mist">{draft.email}</span> as soon as I can.
        </p>
        <Button
          className="mt-5"
          onClick={() => {
            setDraft((d) => ({ ...d, subject: '', message: '' }));
            setTouched({});
            setState('idle');
          }}
        >
          Send another message
        </Button>
      </div>
    );
  }

  return (
    <form className="contact-form" onSubmit={(e) => void submit(e)} noValidate>
      <fieldset className="contact-topics">
        <legend className="contact-label">What is it about?</legend>
        <div className="contact-topic-row">
          {TOPICS.map((t) => {
            const Icon = t.icon;
            return (
              <label key={t.id} className="contact-topic" data-active={draft.topic === t.id}>
                <input
                  type="radio"
                  name="topic"
                  value={t.id}
                  checked={draft.topic === t.id}
                  onChange={() => set('topic', t.id)}
                  className="sr-only"
                />
                <Icon size={14} strokeWidth={1.8} aria-hidden />
                {t.label}
              </label>
            );
          })}
        </div>
      </fieldset>

      <div className="contact-grid">
        <div>
          <label className="contact-label" htmlFor="contact-name">
            Your name
          </label>
          <input
            id="contact-name"
            className="field"
            autoComplete="name"
            value={draft.name}
            maxLength={CONTACT_LIMITS.name}
            onChange={(e) => set('name', e.target.value)}
            onBlur={() => setTouched((t) => ({ ...t, name: true }))}
            aria-invalid={Boolean(show('name'))}
            aria-describedby={show('name') ? 'contact-name-err' : undefined}
            placeholder="Jane Doe"
          />
          {show('name') ? (
            <p id="contact-name-err" className="contact-err">
              {show('name')}
            </p>
          ) : null}
        </div>
        <div>
          <label className="contact-label" htmlFor="contact-email">
            Email for my reply
          </label>
          <input
            id="contact-email"
            className="field"
            type="email"
            inputMode="email"
            autoComplete="email"
            value={draft.email}
            maxLength={CONTACT_LIMITS.email}
            onChange={(e) => set('email', e.target.value)}
            onBlur={() => setTouched((t) => ({ ...t, email: true }))}
            aria-invalid={Boolean(show('email'))}
            aria-describedby={show('email') ? 'contact-email-err' : undefined}
            placeholder="you@example.com"
          />
          {show('email') ? (
            <p id="contact-email-err" className="contact-err">
              {show('email')}
            </p>
          ) : null}
        </div>
      </div>

      <div>
        <label className="contact-label" htmlFor="contact-subject">
          Subject
        </label>
        <input
          id="contact-subject"
          className="field"
          value={draft.subject}
          maxLength={CONTACT_LIMITS.subject}
          onChange={(e) => set('subject', e.target.value)}
          onBlur={() => setTouched((t) => ({ ...t, subject: true }))}
          aria-invalid={Boolean(show('subject'))}
          aria-describedby={show('subject') ? 'contact-subject-err' : undefined}
          placeholder={`${topic.label}: …`}
        />
        {show('subject') ? (
          <p id="contact-subject-err" className="contact-err">
            {show('subject')}
          </p>
        ) : null}
      </div>

      <div>
        <div className="flex items-baseline justify-between gap-2">
          <label className="contact-label" htmlFor="contact-message">
            Message
          </label>
          <span
            className={cn(
              'mono text-[10.5px]',
              draft.message.length > CONTACT_LIMITS.message * 0.9 ? 'text-coral' : 'text-ash',
            )}
          >
            {draft.message.length.toLocaleString()} / {CONTACT_LIMITS.message.toLocaleString()}
          </span>
        </div>
        <textarea
          id="contact-message"
          className="field contact-textarea"
          rows={7}
          value={draft.message}
          maxLength={CONTACT_LIMITS.message}
          onChange={(e) => set('message', e.target.value)}
          onBlur={() => setTouched((t) => ({ ...t, message: true }))}
          aria-invalid={Boolean(show('message'))}
          aria-describedby={show('message') ? 'contact-message-err' : 'contact-message-hint'}
          placeholder={topic.hint}
        />
        {show('message') ? (
          <p id="contact-message-err" className="contact-err">
            {show('message')}
          </p>
        ) : (
          <p id="contact-message-hint" className="contact-hint">
            Your draft is saved on this device while you write.
          </p>
        )}
      </div>

      {/* Honeypot: invisible to people, irresistible to form-filling bots. */}
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden
        className="contact-trap"
        value={trap}
        onChange={(e) => setTrap(e.target.value)}
      />

      {error ? (
        <p className="contact-alert" role="alert">
          {error}{' '}
          <a href="https://www.instagram.com/heyfouad/" target="_blank" rel="noopener noreferrer">
            Or message me on Instagram ↗
          </a>
        </p>
      ) : null}

      <div className="contact-submit-row">
        <p className="contact-hint m-0">
          {cloudConfigured ? 'Goes straight to my private inbox — never shared.' : 'This copy of the app is offline-only.'}
        </p>
        <Button variant="primary" type="submit" disabled={state === 'sending' || !cloudConfigured}>
          {state === 'sending' ? (
            <Loader2 size={14} strokeWidth={2.2} className="animate-spin" aria-hidden />
          ) : (
            <Send size={14} strokeWidth={2} aria-hidden />
          )}
          {state === 'sending' ? 'Sending…' : 'Send message'}
        </Button>
      </div>
    </form>
  );
}

/* ── Admin inbox ──────────────────────────────────────────────────────── */

function AdminInbox(): JSX.Element {
  const [items, setItems] = useState<ContactMessage[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'open' | 'archived'>('open');
  const [openId, setOpenId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setError(null);
    try {
      setItems(await listContactMessages());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load messages');
      setItems((prev) => prev ?? []);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const patch = (id: string, change: Partial<ContactMessage> | null): void =>
    setItems((list) =>
      (list ?? []).flatMap((m) => (m.id !== id ? [m] : change === null ? [] : [{ ...m, ...change }])),
    );

  const act = async (fn: () => Promise<void>, rollback: () => void): Promise<void> => {
    try {
      await fn();
    } catch (e) {
      rollback();
      setError(e instanceof Error ? e.message : 'That change did not save');
    }
  };

  const shown = (items ?? []).filter((m) => (filter === 'archived' ? m.status === 'archived' : m.status !== 'archived'));
  const unread = (items ?? []).filter((m) => m.status === 'new').length;

  return (
    <section className="surface-card contact-inbox" aria-labelledby="inbox-title">
      <header className="contact-inbox-head">
        <span className="contact-inbox-icon" aria-hidden>
          <Inbox size={16} strokeWidth={1.8} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 id="inbox-title" className="text-[14px] font-medium text-paper">
            Inbox {unread ? <span className="contact-count mono">{unread} new</span> : null}
          </h2>
          <p className="text-[11.5px] text-ash">Only you can see this — it's visible to the admin account.</p>
        </div>
        <div className="contact-seg" role="tablist" aria-label="Inbox filter">
          {(['open', 'archived'] as const).map((f) => (
            <button
              key={f}
              type="button"
              role="tab"
              aria-selected={filter === f}
              data-active={filter === f}
              onClick={() => setFilter(f)}
            >
              {f === 'open' ? 'Open' : 'Archived'}
            </button>
          ))}
        </div>
        <button type="button" className="btn-icon" aria-label="Refresh inbox" onClick={() => void refresh()}>
          <RefreshCw size={14} strokeWidth={1.8} />
        </button>
      </header>

      {error ? <p className="contact-alert mx-4 mb-3">{error}</p> : null}

      {items === null ? (
        <div className="flex items-center gap-2 px-4 pb-5 text-[12.5px] text-ash">
          <Loader2 size={14} className="animate-spin" /> Loading messages…
        </div>
      ) : shown.length === 0 ? (
        <p className="px-4 pb-5 text-[12.5px] text-ash">
          {filter === 'archived' ? 'Nothing archived.' : 'No messages yet — they will land here.'}
        </p>
      ) : (
        <ul className="contact-inbox-list">
          {shown.map((m) => {
            const open = openId === m.id;
            return (
              <li key={m.id} className="contact-msg" data-status={m.status} data-open={open}>
                <button
                  type="button"
                  className="contact-msg-head"
                  aria-expanded={open}
                  onClick={() => {
                    setOpenId(open ? null : m.id);
                    if (m.status === 'new') {
                      patch(m.id, { status: 'read' });
                      void act(
                        () => setContactStatus(m.id, 'read'),
                        () => patch(m.id, { status: 'new' }),
                      );
                    }
                  }}
                >
                  <span className="contact-msg-dot" aria-hidden />
                  <span className="min-w-0 flex-1 text-start">
                    <span className="contact-msg-subject">{m.subject}</span>
                    <span className="contact-msg-from">
                      {m.name} · {m.email}
                    </span>
                  </span>
                  <span className="contact-msg-topic">{TOPIC_LABEL[m.topic]}</span>
                  <span className="mono text-[10.5px] text-ash">{relativeTime(m.createdAt)}</span>
                </button>
                {open ? (
                  <div className="contact-msg-body">
                    <p className="whitespace-pre-wrap text-[13px] leading-[1.65] text-mist">{m.message}</p>
                    <div className="contact-msg-actions">
                      <a
                        className="btn btn-primary"
                        href={`mailto:${encodeURIComponent(m.email)}?subject=${encodeURIComponent(`Re: ${m.subject}`)}`}
                      >
                        <Mail size={14} strokeWidth={2} aria-hidden /> Reply by email
                      </a>
                      <Button
                        onClick={() => {
                          const next = m.status === 'archived' ? 'read' : 'archived';
                          const prev = m.status;
                          patch(m.id, { status: next });
                          void act(
                            () => setContactStatus(m.id, next),
                            () => patch(m.id, { status: prev }),
                          );
                        }}
                      >
                        <Archive size={14} strokeWidth={1.8} aria-hidden />
                        {m.status === 'archived' ? 'Move to open' : 'Archive'}
                      </Button>
                      <Button
                        onClick={() => {
                          const snapshot = m;
                          patch(m.id, null);
                          void act(
                            () => deleteContactMessage(m.id),
                            () => setItems((list) => [snapshot, ...(list ?? [])]),
                          );
                        }}
                        className="contact-delete"
                      >
                        <Trash2 size={14} strokeWidth={1.8} aria-hidden /> Delete
                      </Button>
                    </div>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

/* ── Page ─────────────────────────────────────────────────────────────── */

export function ContactModule(): JSX.Element {
  const { user } = useAuth();
  const admin = isAdminUser(user);

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-col bg-void/78 backdrop-blur-2xl">
      <header className="flex items-center gap-3 border-b border-graphite px-4 py-3.5 md:px-7 md:py-4">
        <MenuButton className="md:hidden" />
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-[19px] font-medium leading-tight tracking-[-0.016em] text-paper md:text-[21px]">
            Contact
          </h1>
          <p className="mt-1 truncate text-[12.5px] text-ash">Find me online, or send a message straight to my inbox.</p>
        </div>
      </header>

      <div className="scroll-y min-h-0 flex-1">
        <div className="cp-wrap">
          <Rule />
          <div className="cp-frame">
            <ProfileCard />

            <Rule />

            <div className="cp-lower">
              {admin ? <AdminInbox /> : null}

              <section id="contact-form-card" aria-labelledby="form-title" className="surface-card contact-form-card">
                <div className="contact-form-head">
                  <span className="contact-form-icon" aria-hidden>
                    <Send size={16} strokeWidth={1.9} />
                  </span>
                  <div>
                    <h2 id="form-title" className="text-[15px] font-medium text-paper">
                      Send a message
                    </h2>
                    <p className="text-[12px] text-ash">I read every message personally.</p>
                  </div>
                </div>
                <ContactForm />
              </section>
            </div>

            <Rule />
          </div>
        </div>
      </div>
    </div>
  );
}
