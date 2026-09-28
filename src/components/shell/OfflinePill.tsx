import { Check, CloudOff, CloudUpload } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useWorkspace } from '@/state/workspaceStore';

/**
 * A quiet status pill. It appears only when something is worth knowing:
 * you're offline (changes are kept on this device), queued changes are
 * taking a moment to go out, or — right after one of those — everything has
 * caught up. A normal online save never shows it.
 */
export function OfflinePill(): JSX.Element | null {
  const { live, online, pendingChanges } = useWorkspace();
  const [slow, setSlow] = useState(false);
  const [justSynced, setJustSynced] = useState(false);
  const surfaced = useRef(false);

  // Only call it "syncing" if the queue doesn't drain within a second.
  useEffect(() => {
    if (!online || pendingChanges === 0) {
      setSlow(false);
      return;
    }
    const t = window.setTimeout(() => setSlow(true), 1000);
    return () => window.clearTimeout(t);
  }, [online, pendingChanges]);

  const state: 'off' | 'busy' | 'ok' | null = !online
    ? 'off'
    : live && pendingChanges > 0 && slow
      ? 'busy'
      : justSynced
        ? 'ok'
        : null;

  useEffect(() => {
    if (state === 'off' || state === 'busy') surfaced.current = true;
    if (online && pendingChanges === 0 && surfaced.current) {
      surfaced.current = false;
      setJustSynced(true);
      const t = window.setTimeout(() => setJustSynced(false), 2600);
      return () => window.clearTimeout(t);
    }
    return undefined;
  }, [state, online, pendingChanges]);

  const n = pendingChanges;
  const plural = n === 1 ? '' : 's';
  return (
    <div className="offline-pill-wrap" aria-live="polite">
      {state ? (
        <div className="offline-pill" data-tone={state}>
          {state === 'off' ? (
            <>
              <CloudOff size={14} strokeWidth={2} aria-hidden />
              <span>Offline{live && n > 0 ? ` · ${n} change${plural} saved here` : ' · changes stay on this device'}</span>
            </>
          ) : state === 'busy' ? (
            <>
              <CloudUpload size={14} strokeWidth={2} aria-hidden className="offline-pill-pulse" />
              <span>
                Syncing {n} change{plural}…
              </span>
            </>
          ) : (
            <>
              <Check size={14} strokeWidth={2.4} aria-hidden />
              <span>Back online · all changes synced</span>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
