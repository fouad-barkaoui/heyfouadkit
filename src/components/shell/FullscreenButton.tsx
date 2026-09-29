import * as Popover from '@radix-ui/react-popover';
import { Maximize, Minimize, Share, SquarePlus, X } from 'lucide-react';
import { useState } from 'react';
import { useFullscreen } from '@/lib/fullscreen';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/state/languageStore';

/**
 * Puts the whole app into full screen (and back). Lives at the top of every
 * screen: next to the menu + bell in phone headers, and under Notifications
 * in the desktop sidebar. On iPhone — where websites can't go full screen —
 * it explains the Add to Home Screen route instead of silently failing.
 */
export function FullscreenButton({
  variant = 'button',
  expanded = false,
  className,
}: {
  variant?: 'button' | 'rail';
  expanded?: boolean;
  className?: string;
}): JSX.Element | null {
  const { t } = useLanguage();
  const { active, support, toggle } = useFullscreen();
  const [helpOpen, setHelpOpen] = useState(false);
  const [blocked, setBlocked] = useState(false);

  if (support === 'standalone') return null;

  const label = active ? t('fs.exit') : t('fs.enter');
  const Icon = active ? Minimize : Maximize;

  const onClick = async (): Promise<void> => {
    if (support === 'install') {
      setHelpOpen(true);
      return;
    }
    const ok = await toggle();
    if (!ok) {
      setBlocked(true);
      window.setTimeout(() => setBlocked(false), 2600);
    }
  };

  const trigger =
    variant === 'rail' ? (
      <button
        type="button"
        aria-label={label}
        aria-pressed={active}
        title={expanded ? undefined : label}
        className={cn('nav-row fs-trigger', !expanded && 'is-compact', className)}
        data-active={active}
        onClick={() => void onClick()}
      >
        <Icon size={16} strokeWidth={1.6} aria-hidden className="shrink-0" />
        {expanded ? <span className="flex-1 truncate text-start">{label}</span> : null}
        {expanded && active ? <kbd className="rail-kbd">Esc</kbd> : null}
      </button>
    ) : (
      <button
        type="button"
        aria-label={label}
        aria-pressed={active}
        className={cn('menu-btn fs-trigger', className)}
        data-active={active}
        onClick={() => void onClick()}
      >
        <Icon size={16} strokeWidth={1.8} aria-hidden />
      </button>
    );

  return (
    <Popover.Root
      open={helpOpen || blocked}
      onOpenChange={(o) => {
        if (o) return;
        setHelpOpen(false);
        setBlocked(false);
      }}
    >
      <Popover.Anchor asChild>{trigger}</Popover.Anchor>
      <Popover.Portal>
        <Popover.Content
          className="fs-help"
          side={variant === 'rail' ? 'right' : 'bottom'}
          align="start"
          sideOffset={10}
          collisionPadding={10}
        >
          {blocked ? (
            <p className="fs-help-body m-0">{t('fs.failed')}</p>
          ) : (
            <>
              <div className="fs-help-head">
                <span className="fs-help-icon" aria-hidden>
                  <Maximize size={15} strokeWidth={1.9} />
                </span>
                <h2 className="fs-help-title">{t('fs.installTitle')}</h2>
                <Popover.Close className="fs-help-x" aria-label="Close">
                  <X size={14} strokeWidth={2} />
                </Popover.Close>
              </div>
              <p className="fs-help-body">{t('fs.installBody')}</p>
              <ol className="fs-help-steps">
                <li>
                  <Share size={14} strokeWidth={1.9} aria-hidden /> Share
                </li>
                <li>
                  <SquarePlus size={14} strokeWidth={1.9} aria-hidden /> Add to Home Screen
                </li>
              </ol>
            </>
          )}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
