import * as Dialog from '@radix-ui/react-dialog';
import { ChevronDown, type LucideIcon } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/state/languageStore';

/**
 * A plain "accept terms" dialog: title, a short explanation, the legal line
 * in a box with details that expand in place, then accept or decline.
 */
export function ConsentSheet({
  open,
  title,
  body,
  boxIcon: BoxIcon,
  box,
  details,
  acceptLabel,
  cancelLabel,
  onAccept,
  onCancel,
}: {
  open: boolean;
  title: string;
  body: ReactNode;
  boxIcon: LucideIcon;
  /** The legal line. Receives a toggle so "terms of use" can open `details`. */
  box: (link: (label: ReactNode) => ReactNode) => ReactNode;
  details?: ReactNode;
  acceptLabel: string;
  cancelLabel?: string;
  onAccept: () => void | Promise<void>;
  onCancel: () => void;
}): JSX.Element {
  const { t } = useLanguage();
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (open) setExpanded(false);
  }, [open]);

  const toggle = (label: ReactNode): ReactNode => (
    // A span (not a <button>) so the link wraps mid-sentence like real text.
    <span
      role="button"
      tabIndex={0}
      onClick={() => setExpanded((v) => !v)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          setExpanded((v) => !v);
        }
      }}
      aria-expanded={expanded}
      className="consent-link"
    >
      {label}
    </span>
  );

  return (
    <Dialog.Root open={open} onOpenChange={(next) => (next ? undefined : onCancel())}>
      <Dialog.Portal>
        <Dialog.Overlay className="consent-overlay" />
        <Dialog.Content
          className="consent-card"
          onInteractOutside={(e) => e.preventDefault()}
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <Dialog.Title className="consent-title">{title}</Dialog.Title>
          <Dialog.Description asChild>
            <div className="consent-body">{body}</div>
          </Dialog.Description>

          <div className="consent-box">
            <BoxIcon size={16} strokeWidth={1.7} aria-hidden />
            <div className="consent-box-text">{box(toggle)}</div>
            {details ? (
              <>
                <div className={cn('consent-details', expanded && 'is-open')}>
                  <div>{details}</div>
                </div>
                <button type="button" onClick={() => setExpanded((v) => !v)} className="consent-more" aria-expanded={expanded}>
                  {expanded ? t('ob.hideDetails') : t('ob.readDetails')}
                  <ChevronDown size={13} strokeWidth={2} className={cn('transition-transform duration-200', expanded && 'rotate-180')} />
                </button>
              </>
            ) : null}
          </div>

          <div className="consent-actions">
            <button type="button" className="btn btn-ghost" onClick={onCancel}>
              {cancelLabel ?? t('ob.decline')}
            </button>
            <button type="button" className="btn btn-primary" onClick={() => void onAccept()}>
              {acceptLabel}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
