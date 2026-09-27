import { useCallback } from 'react';
import { useAuth } from './authStore';
import { useUI } from './uiStore';

/**
 * Browsing heyfouad is always free. Creating or uploading anything is not —
 * call the returned guard right before a create/upload action. Signed in,
 * or on a build with no cloud project at all (nothing to sign into), the
 * action proceeds. Signed out on a configured build, the sign-in panel opens
 * instead and the action is skipped.
 */
export function useRequireAuth(): () => boolean {
  const { user, configured } = useAuth();
  const { setAccountOpen } = useUI();

  return useCallback(() => {
    if (user || !configured) return true;
    setAccountOpen(true);
    return false;
  }, [user, configured, setAccountOpen]);
}
