import { Inbox } from 'lucide-react';
import { isAdminUser } from '@/lib/access';
import { cn } from '@/lib/utils';
import { useAuth } from '@/state/authStore';
import { useLanguage } from '@/state/languageStore';
import { useNotifications } from '@/state/notificationsStore';
import { useUI } from '@/state/uiStore';
import { NotificationBell } from './NotificationBell';

/** Admin only: the message inbox, beside the bell, with its new-message count. */
function InboxButton({ className }: { className?: string }): JSX.Element | null {
  const { user } = useAuth();
  const { inboxNew } = useNotifications();
  const { module, setModule } = useUI();
  const { t } = useLanguage();
  if (!isAdminUser(user)) return null;
  const label = inboxNew ? `${t('nav.inbox')} (${inboxNew} new)` : t('nav.inbox');
  return (
    <button
      type="button"
      className={cn('menu-btn', className)}
      aria-label={label}
      data-active={module === 'inbox'}
      onClick={() => setModule('inbox')}
    >
      <Inbox size={17} strokeWidth={1.7} aria-hidden />
      {inboxNew ? (
        <span className="notif-badge is-floating mono" aria-hidden>
          {inboxNew > 99 ? '99+' : inboxNew}
        </span>
      ) : null}
    </button>
  );
}

/**
 * Morphing hamburger: three uneven bars (full · short · medium) that even out
 * on hover and fold into an X when `open`. Used as the phone-width opener in
 * every module header, and as the close control inside the menu itself so
 * the icon visibly transforms in place.
 */
export function MenuButton({
  open = false,
  onClick,
  className,
  label,
}: {
  open?: boolean;
  onClick?: () => void;
  className?: string;
  label?: string;
}): JSX.Element {
  const { setMobileNavOpen, mobileNavOpen } = useUI();
  const button = (
    <button
      type="button"
      className={cn('menu-btn', className)}
      data-open={open}
      aria-label={label ?? (open ? 'Close navigation' : 'Open navigation')}
      aria-expanded={onClick ? open : mobileNavOpen}
      aria-haspopup="dialog"
      onClick={onClick ?? (() => setMobileNavOpen(true))}
    >
      <span className="menu-btn-bars" aria-hidden>
        <i />
        <i />
        <i />
      </span>
    </button>
  );
  // As the phone-width opener in a module header, the notification bell
  // rides along right next to it — so it's on every screen of the app.
  if (onClick) return button;
  return (
    <>
      {button}
      <NotificationBell className={className} />
      <InboxButton className={className} />
    </>
  );
}
