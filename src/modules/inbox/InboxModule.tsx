import { Archive, Inbox, Loader2, Lock, Mail, RefreshCw, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { MenuButton } from '@/components/shell/MenuButton';
import { Button } from '@/components/ui/Button';
import {
  announceContactChange,
  deleteContactMessage,
  listContactMessages,
  setContactStatus,
  type ContactMessage,
  type ContactTopic,
} from '@/data/contact';
import { isAdminUser } from '@/lib/access';
import { cn, relativeTime } from '@/lib/utils';
import { useAuth } from '@/state/authStore';
import { TOPICS, TOPIC_LABEL } from '@/modules/contact/topics';

type TopicFilter = 'all' | ContactTopic;

/**
 * Admin-only page: every message people send from the Contact page lands
 * here, sortable by what it's about. Reading is enforced by row-level
 * security in the database — this page just hides itself for everyone else.
 */
export function InboxModule(): JSX.Element {
  const { user } = useAuth();
  const admin = isAdminUser(user);

  const [items, setItems] = useState<ContactMessage[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<'open' | 'archived'>('open');
  const [topic, setTopic] = useState<TopicFilter>('all');
  const [openId, setOpenId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    setError(null);
    setBusy(true);
    try {
      setItems(await listContactMessages());
      announceContactChange();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load messages');
      setItems((prev) => prev ?? []);
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    if (admin) void refresh();
  }, [admin, refresh]);

  const patch = (id: string, change: Partial<ContactMessage> | null): void =>
    setItems((list) =>
      (list ?? []).flatMap((m) => (m.id !== id ? [m] : change === null ? [] : [{ ...m, ...change }])),
    );

  const act = async (fn: () => Promise<void>, rollback: () => void): Promise<void> => {
    try {
      await fn();
      announceContactChange();
    } catch (e) {
      rollback();
      setError(e instanceof Error ? e.message : 'That change did not save');
    }
  };

  const byStatus = useMemo(
    () => (items ?? []).filter((m) => (status === 'archived' ? m.status === 'archived' : m.status !== 'archived')),
    [items, status],
  );
  const counts = useMemo(() => {
    const c: Record<string, number> = { all: byStatus.length };
    for (const m of byStatus) c[m.topic] = (c[m.topic] ?? 0) + 1;
    return c;
  }, [byStatus]);
  const shown = topic === 'all' ? byStatus : byStatus.filter((m) => m.topic === topic);
  const unread = (items ?? []).filter((m) => m.status === 'new').length;

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-col bg-void/78 backdrop-blur-2xl">
      <header className="flex items-center gap-3 border-b border-graphite px-4 py-3.5 md:px-7 md:py-4">
        <MenuButton className="md:hidden" />
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-[19px] font-medium leading-tight tracking-[-0.016em] text-paper md:text-[21px]">
            Inbox
            {unread ? <span className="contact-count mono">{unread} new</span> : null}
          </h1>
          <p className="mt-1 truncate text-[12.5px] text-ash">Messages people send from the Contact page.</p>
        </div>
        {admin ? (
          <button
            type="button"
            className="btn-icon"
            aria-label="Refresh inbox"
            onClick={() => void refresh()}
            disabled={busy}
          >
            <RefreshCw size={14} strokeWidth={1.8} className={cn(busy && 'animate-spin')} />
          </button>
        ) : null}
      </header>

      <div className="scroll-y min-h-0 flex-1 px-4 py-5 md:px-7 md:py-7">
        {!admin ? (
          <div className="inbox-locked">
            <span className="inbox-locked-icon" aria-hidden>
              <Lock size={18} strokeWidth={1.8} />
            </span>
            <h2>Admin only</h2>
            <p>This inbox belongs to the app owner. Sign in with the admin account to read messages.</p>
          </div>
        ) : (
          <div className="inbox-page">
            <div className="inbox-toolbar">
              <div className="contact-seg" role="tablist" aria-label="Inbox filter">
                {(['open', 'archived'] as const).map((f) => (
                  <button
                    key={f}
                    type="button"
                    role="tab"
                    aria-selected={status === f}
                    data-active={status === f}
                    onClick={() => setStatus(f)}
                  >
                    {f === 'open' ? 'Open' : 'Archived'}
                  </button>
                ))}
              </div>
              <div className="inbox-topics" role="group" aria-label="Filter by type">
                {(['all', ...TOPICS.map((t) => t.id)] as TopicFilter[]).map((id) => (
                  <button
                    key={id}
                    type="button"
                    className="contact-topic"
                    data-active={topic === id}
                    aria-pressed={topic === id}
                    onClick={() => setTopic(id)}
                  >
                    {id === 'all' ? 'All' : TOPIC_LABEL[id]}
                    <span className="inbox-count mono">{counts[id] ?? 0}</span>
                  </button>
                ))}
              </div>
            </div>

            {error ? <p className="contact-alert">{error}</p> : null}

            <section className="surface-card contact-inbox">
              {items === null ? (
                <div className="flex items-center gap-2 px-4 py-5 text-[12.5px] text-ash">
                  <Loader2 size={14} className="animate-spin" /> Loading messages…
                </div>
              ) : shown.length === 0 ? (
                <div className="inbox-empty">
                  <span className="inbox-locked-icon" aria-hidden>
                    <Inbox size={18} strokeWidth={1.8} />
                  </span>
                  <p>
                    {status === 'archived'
                      ? 'Nothing archived.'
                      : topic === 'all'
                        ? 'No messages yet — they will land here.'
                        : `No ${TOPIC_LABEL[topic].toLowerCase()} messages.`}
                  </p>
                </div>
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
                                className="contact-delete"
                                onClick={() => {
                                  const snapshot = m;
                                  patch(m.id, null);
                                  void act(
                                    () => deleteContactMessage(m.id),
                                    () => setItems((list) => [snapshot, ...(list ?? [])]),
                                  );
                                }}
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
          </div>
        )}
      </div>
    </div>
  );
}
