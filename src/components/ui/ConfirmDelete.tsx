import { Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { IconButton } from './Button';

/**
 * Two-step delete: the first press arms the button, the second commits.
 * No modal, no dialog interrupt — and it disarms itself after 3 seconds.
 */
export function ConfirmDelete({
  onConfirm,
  label = 'Delete',
  size = 14,
}: {
  onConfirm: () => void;
  label?: string;
  size?: number;
}): JSX.Element {
  const [armed, setArmed] = useState(false);
  const timer = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (timer.current) window.clearTimeout(timer.current);
    },
    [],
  );

  return (
    <IconButton
      label={armed ? `${label} — press again to confirm` : label}
      danger
      data-armed={armed}
      className={armed ? 'bg-coral/15 text-coral' : undefined}
      onClick={(event) => {
        event.stopPropagation();
        if (armed) {
          if (timer.current) window.clearTimeout(timer.current);
          setArmed(false);
          onConfirm();
          return;
        }
        setArmed(true);
        timer.current = window.setTimeout(() => setArmed(false), 3000);
      }}
    >
      <Trash2 size={size} strokeWidth={1.75} />
    </IconButton>
  );
}
