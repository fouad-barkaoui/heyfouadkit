import { Check, Loader2, Send } from 'lucide-react';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { MenuButton } from '@/components/shell/MenuButton';
import { Button } from '@/components/ui/Button';
import { cloudConfigured } from '@/data/supabaseClient';
import {
  CONTACT_LIMITS,
  sendContactMessage,
  validateContact,
  type ContactDraft,
} from '@/data/contact';
import { cn } from '@/lib/utils';
import { getDisplayName, useAuth } from '@/state/authStore';
import { Note, Rule } from '@/modules/portfolio/ProfileExtras';
import { TOPICS } from './topics';

const DRAFT_KEY = 'kanz.contact.draft.v1';

function loadDraft(): Partial<ContactDraft> {
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY);
    return raw ? (JSON.parse(raw) as Partial<ContactDraft>) : {};
  } catch {
    return {};
  }
}

/* ── Sent: the message gets stamped ───────────────────────────────────── */

function StampedLetter({
  draft,
  topic,
  onAnother,
}: {
  draft: ContactDraft;
  topic: string;
  onAnother: () => void;
}): JSX.Element {
  const sentAt = useMemo(
    () => new Date().toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }),
    [],
  );

  return (
    <div className="stamp-scene" role="status">
      <p className="sr-only">
        Message sent and stamped private and confidential. I will reply to {draft.email}.
      </p>

      <article className="stamp-letter" aria-hidden>
        <header className="stamp-letter-head">
          <span className="stamp-letter-kicker">Kanz · Private message</span>
          <span className="stamp-letter-date">{sentAt}</span>
        </header>
        <dl className="stamp-letter-meta">
          <div>
            <dt>To</dt>
            <dd>Fouad Barkaoui</dd>
          </div>
          <div>
            <dt>From</dt>
            <dd>
              {draft.name} &lt;{draft.email}&gt;
            </dd>
          </div>
          <div>
            <dt>Re</dt>
            <dd>
              {draft.subject} <span className="stamp-letter-topic">{topic}</span>
            </dd>
          </div>
        </dl>
        <p className="stamp-letter-body">{draft.message}</p>
        <footer className="stamp-letter-sign">— sent from the Contact page</footer>
        <img
          className="stamp-mark"
          src="/stamp-confidential.svg"
          alt=""
          width={1160}
          height={700}
          draggable={false}
        />
      </article>

      <div className="stamp-done">
        <span className="stamp-done-mark" aria-hidden>
          <Check size={20} strokeWidth={2.6} />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="stamp-done-title">Sealed &amp; delivered — thank you!</h3>
          <p className="stamp-done-text">
            It went straight to my private inbox. I'll reply to <span>{draft.email}</span> as soon as I can.
          </p>
        </div>
        <Button onClick={onAnother}>Send another message</Button>
      </div>
    </div>
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
      <StampedLetter
        draft={draft}
        topic={topic.label}
        onAnother={() => {
          setDraft((d) => ({ ...d, subject: '', message: '' }));
          setTouched({});
          setState('idle');
        }}
      />
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

/* ── Page ─────────────────────────────────────────────────────────────── */

export function ContactModule(): JSX.Element {
  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-col bg-void/78 backdrop-blur-2xl">
      <header className="flex items-center gap-3 border-b border-graphite px-4 py-3.5 md:px-7 md:py-4">
        <MenuButton className="md:hidden" />
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-[19px] font-medium leading-tight tracking-[-0.016em] text-paper md:text-[21px]">
            Contact
          </h1>
          <p className="mt-1 truncate text-[12.5px] text-ash">Send a message straight to my inbox — I read every one.</p>
        </div>
      </header>

      <div className="scroll-y min-h-0 flex-1">
        <div className="cp-wrap">
          <Rule />
          <div className="cp-frame">
            <div className="cp-lower">
              <Note>say hello</Note>
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
