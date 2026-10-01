import { useAuth } from '@/state/authStore';

/**
 * "Live · signed in" with a blinking dot, shown in the sidebar while an
 * account is signed in. Collapsed rails get the dot alone.
 */
export function LiveStatus({ expanded = true }: { expanded?: boolean }): JSX.Element | null {
  const { user } = useAuth();
  if (!user) return null;
  return (
    <div className="live-status" data-compact={!expanded || undefined} role="status" title="Live · signed in">
      <span className="live-status-dot" aria-hidden />
      {expanded ? <span>Live · signed in</span> : <span className="sr-only">Live · signed in</span>}
    </div>
  );
}
