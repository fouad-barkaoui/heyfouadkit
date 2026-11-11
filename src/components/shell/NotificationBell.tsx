import * as Popover from '@radix-ui/react-popover';
import { Bell, BellRing, CheckCheck, Flame, ListChecks, Mail, Target, X } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import type { Reminder, ReminderKind } from '@/lib/reminders';
import { cn } from '@/lib/utils';
import { useI18n } from '@/components/ui/useI18n';
import { useNotifications } from '@/state/notificationsStore';
import { useUI } from '@/state/uiStore';

const KIND_ICON: Record<ReminderKind, typeof Bell> = {
  'task-overdue': ListChecks,
  'task-today': ListChecks,
  'habit-missed': Flame,
  'habit-today': Flame,
  'goal-overdue': Target,
  'step-overdue': Target,
  'message-new': Mail,
};

function Row({
  r,
  fresh,
  onOpen,
  onDismiss,
  dismissLabel,
}: {
  r: Reminder;
  fresh: boolean;
  onOpen: () => void;
  onDismiss: () => void;
  dismissLabel: string;
}): JSX.Element {
  const Icon = KIND_ICON[r.kind];
  return (
    <li className="notif-item" data-missed={r.missed} data-fresh={fresh}>
      <button type="button" className="notif-item-main" onClick={onOpen}>
        <span className="notif-item-icon" aria-hidden>
          <Icon size={15} strokeWidth={1.8} />
        </span>
        <span className="min-w-0 flex-1 text-start">
          <span className="notif-item-title">{r.title}</span>
          <span className="notif-item-detail">{r.detail}</span>
        </span>
        <span className="notif-item-time mono">{r.when}</span>
      </button>
      <button type="button" className="notif-item-x" aria-label={`${dismissLabel}: ${r.title}`} onClick={onDismiss}>
        <X size={13} strokeWidth={2} />
      </button>
    </li>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }): JSX.Element {
  return (
    <section>
      <h3 className="notif-section-head">{title}</h3>
      <ul className="notif-list">{children}</ul>
    </section>
  );
}

/**
 * Bell + dropdown panel. Opening it marks everything as read (the badge
 * clears) but keeps the list — items leave when they're dismissed or when
 * the underlying thing is done (task completed, habit ticked…).
 *
 * Lives in the top bar on every screen size.
 */
export function NotificationBell({ className }: { className?: string }): JSX.Element {
  const { t } = useI18n();
  const { setModule } = useUI();
  const { items, unread, isRead, markAllRead, dismiss, dismissAll } = useNotifications();
  const [open, setOpen] = useState(false);
  // Which items were unread when the panel opened — they keep their dot for
  // this viewing even though the badge has already cleared.
  const [freshKeys, setFreshKeys] = useState<Set<string>>(new Set());

  const onOpenChange = (next: boolean): void => {
    if (next) {
      setFreshKeys(new Set(items.filter((r) => !isRead(r.key)).map((r) => r.key)));
      markAllRead();
    }
    setOpen(next);
  };

  const messages = items.filter((r) => r.kind === 'message-new');
  const missed = items.filter((r) => r.missed && r.kind !== 'message-new');
  const today = items.filter((r) => !r.missed && r.kind !== 'message-new');
  const badge = unread > 99 ? '99+' : String(unread);
  const label = unread ? `${t('notif.open')} (${unread})` : t('notif.open');
  const BellIcon = unread ? BellRing : Bell;

  const go = (r: Reminder): void => {
    setOpen(false);
    setModule(r.module);
  };

  const trigger = (
    <button type="button" aria-label={label} className={cn('tb-pill tb-circle notif-trigger', className)} data-open={open}>
      <BellIcon size={18} strokeWidth={1.6} aria-hidden className={cn(unread && 'notif-ring')} />
      {unread ? (
        <span className="notif-badge is-floating mono" aria-hidden>
          {badge}
        </span>
      ) : null}
    </button>
  );

  return (
    <Popover.Root open={open} onOpenChange={onOpenChange}>
      <Popover.Trigger asChild>{trigger}</Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          className="notif-panel"
          side="bottom"
          align="end"
          sideOffset={10}
          collisionPadding={10}
          aria-label={t('notif.title')}
        >
          <header className="notif-head">
            <h2 className="notif-title">{t('notif.title')}</h2>
            {items.length ? (
              <button type="button" className="notif-link" onClick={dismissAll}>
                <CheckCheck size={13} strokeWidth={2} aria-hidden />
                {t('notif.clear')}
              </button>
            ) : null}
          </header>

          <div className="notif-body">
            {items.length === 0 ? (
              <div className="notif-empty">
                <span className="notif-empty-icon" aria-hidden>
                  <Bell size={18} strokeWidth={1.6} />
                </span>
                <p className="notif-empty-title">{t('notif.empty')}</p>
                <p className="notif-empty-hint">{t('notif.emptyHint')}</p>
              </div>
            ) : (
              <>
                {messages.length ? (
                  <Section title={`${t('notif.messages')} · ${messages.length}`}>
                    {messages.map((r) => (
                      <Row
                        key={r.key}
                        r={r}
                        fresh={freshKeys.has(r.key)}
                        onOpen={() => go(r)}
                        onDismiss={() => dismiss(r.key)}
                        dismissLabel={t('notif.dismiss')}
                      />
                    ))}
                  </Section>
                ) : null}
                {missed.length ? (
                  <Section title={`${t('notif.missed')} · ${missed.length}`}>
                    {missed.map((r) => (
                      <Row
                        key={r.key}
                        r={r}
                        fresh={freshKeys.has(r.key)}
                        onOpen={() => go(r)}
                        onDismiss={() => dismiss(r.key)}
                        dismissLabel={t('notif.dismiss')}
                      />
                    ))}
                  </Section>
                ) : null}
                {today.length ? (
                  <Section title={`${t('notif.today')} · ${today.length}`}>
                    {today.map((r) => (
                      <Row
                        key={r.key}
                        r={r}
                        fresh={freshKeys.has(r.key)}
                        onOpen={() => go(r)}
                        onDismiss={() => dismiss(r.key)}
                        dismissLabel={t('notif.dismiss')}
                      />
                    ))}
                  </Section>
                ) : null}
              </>
            )}
          </div>

          <footer className="notif-foot">
            <button
              type="button"
              className="notif-link"
              onClick={() => {
                setOpen(false);
                setModule('settings');
              }}
            >
              {t('notif.settings')}
            </button>
          </footer>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
