import { cn } from '@/lib/utils';
import { useUI } from '@/state/uiStore';

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
  return (
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
}
