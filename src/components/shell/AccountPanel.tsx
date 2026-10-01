import { AlertTriangle, Cloud, KeyRound, Loader2, LogOut, RotateCcw, UserRound, Users } from 'lucide-react';
import { ProSpotlight } from '@/components/profile/ProSpotlight';
import { isProUser } from '@/lib/access';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Label, TextInput } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { MAX_TOTAL_CLOUD_BYTES, totalCloudBytes } from '@/data/attachments';
import { cn, formatBytes } from '@/lib/utils';
import { getDisplayName, useAuth } from '@/state/authStore';
import { useTeam } from '@/state/teamStore';
import { useUI } from '@/state/uiStore';
import { useWorkspace } from '@/state/workspaceStore';

/**
 * Account settings for a signed-in visitor (or the "no cloud project
 * configured" notice). Signing in or creating an account happens in
 * `AuthOverlay` instead — this panel only ever mounts once that is done.
 * Team membership, roles and invites live in the Team module instead of here.
 */
export function AccountPanel({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}): JSX.Element {
  const { configured, user, signOut, changePassword, updateUsername } = useAuth();
  const { workspace, syncState, syncMessage, recordCount, resetWorkspace, retrySync } = useWorkspace();
  const { activeTeam } = useTeam();
  const { setModule } = useUI();

  const [busy, setBusy] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [pwFeedback, setPwFeedback] = useState<{ tone: 'ok' | 'bad'; text: string } | null>(null);
  const [usernameField, setUsernameField] = useState('');
  const [usernameFeedback, setUsernameFeedback] = useState<{ tone: 'ok' | 'bad'; text: string } | null>(null);

  useEffect(() => {
    if (!open) {
      setNewPassword('');
      setPwFeedback(null);
      setUsernameFeedback(null);
    } else if (user) {
      setUsernameField(getDisplayName(user));
    }
  }, [open, user]);

  const submitPassword = async (): Promise<void> => {
    setBusy(true);
    setPwFeedback(null);
    const result = await changePassword(newPassword);
    setBusy(false);
    if (result.ok) {
      setNewPassword('');
      setPwFeedback({ tone: 'ok', text: result.message ?? 'Password updated.' });
    } else {
      setPwFeedback({ tone: 'bad', text: result.error });
    }
  };

  const submitUsername = async (): Promise<void> => {
    setBusy(true);
    setUsernameFeedback(null);
    const result = await updateUsername(usernameField);
    setBusy(false);
    setUsernameFeedback(
      result.ok ? { tone: 'ok', text: result.message ?? 'Username updated.' } : { tone: 'bad', text: result.error },
    );
  };

  const usedCloudBytes = totalCloudBytes(workspace.attachments);
  const cloudPct = Math.min(100, Math.round((usedCloudBytes / MAX_TOTAL_CLOUD_BYTES) * 100));

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Account"
      description="Your workspace lives in the cloud and updates live for everyone on your team."
      footer={<Button onClick={() => onOpenChange(false)}>Close</Button>}
    >
      {!configured ? (
        <p className="text-[13px] leading-[1.6] text-ash">
          This build has no cloud project configured. Set <span className="mono">VITE_SUPABASE_URL</span> and{' '}
          <span className="mono">VITE_SUPABASE_ANON_KEY</span> and rebuild to enable accounts.
        </p>
      ) : user ? (
        <div className="space-y-4">
          {isProUser(user) ? <ProSpotlight compact className="mx-auto max-w-[440px]" /> : null}

          <div className="flex items-start gap-3 rounded-[8px] bg-[rgb(var(--tint-rgb)/0.02)] p-3 shadow-[inset_0_0_0_1px_var(--color-graphite)]">
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1.5 truncate text-[13px] text-paper">
                {getDisplayName(user)}
              </p>
              <p className="mt-0.5 flex items-center gap-1.5 text-[11.5px] text-ash">
                {syncState === 'syncing' ? (
                  <Loader2 size={11} className="animate-spin" aria-hidden />
                ) : syncState === 'error' ? (
                  <AlertTriangle size={11} className="text-coral" aria-hidden />
                ) : (
                  <Cloud size={11} aria-hidden />
                )}
                {syncState === 'error'
                  ? (syncMessage ?? 'Cloud sync failed')
                  : syncState === 'syncing'
                    ? 'Syncing…'
                    : `Live in ${activeTeam?.name ?? 'your team'} · ${recordCount} records`}
              </p>
            </div>
            {syncState === 'error' ? (
              <Button className="ms-auto shrink-0" onClick={retrySync} icon={<RotateCcw size={12.5} strokeWidth={2} />}>
                Retry
              </Button>
            ) : null}
          </div>

          <div className="rounded-[8px] bg-[rgb(var(--tint-rgb)/0.02)] p-3 shadow-[inset_0_0_0_1px_var(--color-graphite)]">
            <div className="mb-2 flex items-center justify-between text-[11.5px] text-ash">
              <span>Cloud storage</span>
              <span className="num">
                {formatBytes(usedCloudBytes)} / {formatBytes(MAX_TOTAL_CLOUD_BYTES)}
              </span>
            </div>
            <div className="h-[5px] overflow-hidden rounded-full bg-[rgb(var(--tint-rgb)/0.06)]">
              <div
                className={cn('h-full rounded-full', cloudPct >= 90 ? 'bg-coral' : 'bg-acid')}
                style={{ width: `${cloudPct}%` }}
              />
            </div>
          </div>

          <Button
            className="w-full"
            onClick={() => {
              onOpenChange(false);
              setModule('team');
            }}
            icon={<Users size={13.5} strokeWidth={1.9} />}
          >
            Manage team & invites
          </Button>

          <div className="border-t border-graphite pt-4">
            <Label htmlFor="account-username">Username</Label>
            <div className="flex flex-wrap items-start gap-2">
              <TextInput
                id="account-username"
                autoComplete="off"
                value={usernameField}
                onChange={(e) => setUsernameField(e.target.value)}
                placeholder="How should we address you?"
                className="min-w-[180px] flex-1"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && usernameField) void submitUsername();
                }}
              />
              <Button disabled={busy || usernameField.trim().length < 2} onClick={() => void submitUsername()}>
                {busy ? <Loader2 size={13} className="animate-spin" /> : <UserRound size={13} strokeWidth={1.9} />}
                Save
              </Button>
            </div>
            {usernameFeedback ? (
              <p
                className={cn(
                  'mt-2 text-[12px] leading-[1.5]',
                  usernameFeedback.tone === 'bad' ? 'text-coral' : 'text-pulse',
                )}
              >
                {usernameFeedback.text}
              </p>
            ) : null}
          </div>

          <div className="border-t border-graphite pt-4">
            <Label htmlFor="new-password">Change password</Label>
            <div className="flex flex-wrap items-start gap-2">
              <TextInput
                id="new-password"
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 8 characters"
                className="min-w-[180px] flex-1"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newPassword) void submitPassword();
                }}
              />
              <Button disabled={busy || newPassword.length < 8} onClick={() => void submitPassword()}>
                {busy ? <Loader2 size={13} className="animate-spin" /> : <KeyRound size={13} strokeWidth={1.9} />}
                Update
              </Button>
            </div>
            {pwFeedback ? (
              <p
                className={cn(
                  'mt-2 text-[12px] leading-[1.5]',
                  pwFeedback.tone === 'bad' ? 'text-coral' : 'text-pulse',
                )}
              >
                {pwFeedback.text}
              </p>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-2 border-t border-graphite pt-4">
            <Button onClick={() => void signOut()} icon={<LogOut size={13} strokeWidth={1.9} />}>
              Sign out
            </Button>
            <Button
              onClick={() => {
                if (window.confirm('Reset this device? Everything stored on it is cleared — your cloud copy is not touched.')) {
                  resetWorkspace();
                }
              }}
              icon={<RotateCcw size={13} strokeWidth={1.9} />}
            >
              Reset this device
            </Button>
          </div>
        </div>
      ) : null}
    </Modal>
  );
}
