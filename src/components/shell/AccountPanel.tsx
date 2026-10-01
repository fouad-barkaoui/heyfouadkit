import { AlertTriangle, Cloud, KeyRound, Loader2, LogOut, RotateCcw, UserRound, Users } from 'lucide-react';
import { ProSpotlight } from '@/components/profile/ProSpotlight';
import { isProUser } from '@/lib/access';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Label, TextInput } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { MAX_TOTAL_CLOUD_BYTES, totalCloudBytes } from '@/data/attachments';
import { fmtBytes, rich, useI18n } from '@/components/ui/useI18n';
import { cn } from '@/lib/utils';
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
  const { t } = useI18n();

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
      setPwFeedback({ tone: 'ok', text: result.message ?? t('sh.account.pwUpdated') });
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
      result.ok ? { tone: 'ok', text: result.message ?? t('sh.account.usernameUpdated') } : { tone: 'bad', text: result.error },
    );
  };

  const usedCloudBytes = totalCloudBytes(workspace.attachments);
  const cloudPct = Math.min(100, Math.round((usedCloudBytes / MAX_TOTAL_CLOUD_BYTES) * 100));

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={t('shell.account')}
      description={t('sh.account.description')}
      footer={<Button onClick={() => onOpenChange(false)}>{t('sh.close')}</Button>}
    >
      {!configured ? (
        <p className="text-[13px] leading-[1.6] text-ash">
          {rich(t('sh.account.noCloud'), {
            url: <span className="mono">VITE_SUPABASE_URL</span>,
            key: <span className="mono">VITE_SUPABASE_ANON_KEY</span>,
          })}
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
                  ? (syncMessage ?? t('sh.account.syncFailed'))
                  : syncState === 'syncing'
                    ? t('shell.syncing')
                    : t('sh.account.liveIn', { team: activeTeam?.name ?? t('sh.account.yourTeam'), count: recordCount })}
              </p>
            </div>
            {syncState === 'error' ? (
              <Button className="ms-auto shrink-0" onClick={retrySync} icon={<RotateCcw size={12.5} strokeWidth={2} />}>
                {t('sh.retry')}
              </Button>
            ) : null}
          </div>

          <div className="rounded-[8px] bg-[rgb(var(--tint-rgb)/0.02)] p-3 shadow-[inset_0_0_0_1px_var(--color-graphite)]">
            <div className="mb-2 flex items-center justify-between text-[11.5px] text-ash">
              <span>{t('sh.account.cloudStorage')}</span>
              <span className="num">
                {fmtBytes(usedCloudBytes, t)} / {fmtBytes(MAX_TOTAL_CLOUD_BYTES, t)}
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
            {t('sh.account.manageTeam')}
          </Button>

          <div className="border-t border-graphite pt-4">
            <Label htmlFor="account-username">{t('sh.account.username')}</Label>
            <div className="flex flex-wrap items-start gap-2">
              <TextInput
                id="account-username"
                autoComplete="off"
                value={usernameField}
                onChange={(e) => setUsernameField(e.target.value)}
                placeholder={t('sh.account.usernamePlaceholder')}
                className="min-w-[180px] flex-1"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && usernameField) void submitUsername();
                }}
              />
              <Button disabled={busy || usernameField.trim().length < 2} onClick={() => void submitUsername()}>
                {busy ? <Loader2 size={13} className="animate-spin" /> : <UserRound size={13} strokeWidth={1.9} />}
                {t('sh.save')}
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
            <Label htmlFor="new-password">{t('sh.account.changePassword')}</Label>
            <div className="flex flex-wrap items-start gap-2">
              <TextInput
                id="new-password"
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder={t('sh.account.pwPlaceholder')}
                className="min-w-[180px] flex-1"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newPassword) void submitPassword();
                }}
              />
              <Button disabled={busy || newPassword.length < 8} onClick={() => void submitPassword()}>
                {busy ? <Loader2 size={13} className="animate-spin" /> : <KeyRound size={13} strokeWidth={1.9} />}
                {t('sh.update')}
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
              {t('sh.signOut')}
            </Button>
            <Button
              onClick={() => {
                if (window.confirm(t('sh.account.resetConfirm'))) {
                  resetWorkspace();
                }
              }}
              icon={<RotateCcw size={13} strokeWidth={1.9} />}
            >
              {t('sh.account.resetDevice')}
            </Button>
          </div>
        </div>
      ) : null}
    </Modal>
  );
}
