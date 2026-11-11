import { AlertTriangle, Check, Cloud, Loader2, RotateCcw } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { AvatarEditor } from '@/components/profile/AvatarEditor';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Select, TextInput } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { fmtBytes, useI18n } from '@/components/ui/useI18n';
import { MAX_TOTAL_CLOUD_BYTES, totalCloudBytes } from '@/data/attachments';
import { isProUser } from '@/lib/access';
import { cn } from '@/lib/utils';
import { getDisplayName, useAuth, type AuthResult } from '@/state/authStore';
import { useLanguage, type Language } from '@/state/languageStore';
import { useNotifications } from '@/state/notificationsStore';
import { useTeam } from '@/state/teamStore';
import { useTheme, type ThemePreference } from '@/state/themeStore';
import { useUI } from '@/state/uiStore';
import { useWorkspace } from '@/state/workspaceStore';

type Tab = 'general' | 'workspace' | 'security' | 'notifications';
const TABS: Tab[] = ['general', 'workspace', 'security', 'notifications'];

type Feedback = { tone: 'ok' | 'bad'; text: string } | null;

function Card({ title, danger, children }: { title: string; danger?: boolean; children: ReactNode }): JSX.Element {
  return (
    <section className="set-card" data-danger={danger || undefined}>
      <h2>{title}</h2>
      {children}
    </section>
  );
}

/** One setting: label and hint on the left (or above), its control on the right. */
function Row({
  label,
  hint,
  stacked,
  children,
}: {
  label: string;
  hint?: ReactNode;
  stacked?: boolean;
  children?: ReactNode;
}): JSX.Element {
  return (
    <div className="set-row" data-stacked={stacked || undefined}>
      <div className="min-w-0">
        <p className="set-label">{label}</p>
        {hint ? <p className="set-hint">{hint}</p> : null}
      </div>
      {children ? <div className="set-control">{children}</div> : null}
    </div>
  );
}

function Note({ feedback }: { feedback: Feedback }): JSX.Element | null {
  if (!feedback) return null;
  return (
    <p role={feedback.tone === 'bad' ? 'alert' : 'status'} className={cn('set-note', feedback.tone === 'bad' ? 'text-coral' : 'text-pulse')}>
      {feedback.text}
    </p>
  );
}

function toFeedback(result: AuthResult, fallback: string): Feedback {
  return result.ok ? { tone: 'ok', text: result.message ?? fallback } : { tone: 'bad', text: result.error };
}

function SignInPrompt(): JSX.Element {
  const { configured } = useAuth();
  const { setAccountOpen } = useUI();
  const { t } = useI18n();
  return (
    <Card title={t('set.guest.title')}>
      <Row label={t('set.guest.label')} hint={configured ? t('set.guest.hint') : t('set.guest.noCloud')}>
        {configured ? (
          <Button variant="primary" onClick={() => setAccountOpen(true)}>
            {t('shell.signIn')}
          </Button>
        ) : null}
      </Row>
    </Card>
  );
}

function AccountCard(): JSX.Element | null {
  const { user, avatarUrl, setAvatar, updateUsername } = useAuth();
  const { t } = useI18n();
  const [pictureOpen, setPictureOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);
  if (!user) return null;
  const name = getDisplayName(user);

  const saveName = async (): Promise<void> => {
    setBusy(true);
    const result = await updateUsername(draft);
    setBusy(false);
    setFeedback(toFeedback(result, t('sh.account.usernameUpdated')));
    if (result.ok) setEditing(false);
  };

  const removePicture = async (): Promise<void> => {
    setBusy(true);
    const result = await setAvatar(null);
    setBusy(false);
    setFeedback(result.ok ? null : { tone: 'bad', text: result.error });
  };

  return (
    <Card title={t('set.account.title')}>
      <div className="set-row" data-stacked>
        <div className="flex items-center gap-3">
          <Avatar src={avatarUrl} name={name} size={52} pro={isProUser(user)} />
          <p className="set-label">{t('set.account.photo')}</p>
        </div>
        <div className="set-control">
          {avatarUrl ? (
            <Button variant="quiet" disabled={busy} onClick={() => void removePicture()}>
              {t('set.remove')}
            </Button>
          ) : null}
          <Button onClick={() => setPictureOpen(true)}>{t('set.change')}</Button>
        </div>
      </div>

      <Row label={t('set.account.name')} hint={editing ? undefined : name} stacked>
        {editing ? (
          <>
            <TextInput
              autoFocus
              aria-label={t('set.account.name')}
              autoComplete="name"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && draft.trim().length >= 2) void saveName();
                if (e.key === 'Escape') setEditing(false);
              }}
              className="min-w-0 flex-1"
            />
            <Button variant="quiet" onClick={() => setEditing(false)}>
              {t('sh.cancel')}
            </Button>
            <Button variant="primary" disabled={busy || draft.trim().length < 2} onClick={() => void saveName()}>
              {busy ? <Loader2 size={13} className="animate-spin" aria-hidden /> : null}
              {t('sh.save')}
            </Button>
          </>
        ) : (
          <Button
            onClick={() => {
              setDraft(name);
              setFeedback(null);
              setEditing(true);
            }}
          >
            {t('set.edit')}
          </Button>
        )}
      </Row>

      <Row label={t('set.account.email')} hint={<span dir="ltr">{user.email}</span>} />
      <Note feedback={feedback} />

      <Modal
        open={pictureOpen}
        onOpenChange={setPictureOpen}
        title={t('sh.am.pictureTitle')}
        description={t('sh.am.pictureHintUser')}
        footer={<Button onClick={() => setPictureOpen(false)}>{t('sh.done')}</Button>}
      >
        <AvatarEditor name={name} pro={isProUser(user)} />
      </Modal>
    </Card>
  );
}

function InterfaceCard(): JSX.Element {
  const { preference, setPreference } = useTheme();
  const { language, setLanguage } = useLanguage();
  const { t } = useI18n();
  return (
    <Card title={t('set.interface.title')}>
      <Row label={t('set.interface.theme')} hint={t('set.interface.themeHint')}>
        <Select
          aria-label={t('set.interface.theme')}
          value={preference}
          onChange={(e) => setPreference(e.target.value as ThemePreference)}
        >
          <option value="system">{t('set.interface.system')}</option>
          <option value="light">{t('theme.light')}</option>
          <option value="dark">{t('theme.dark')}</option>
        </Select>
      </Row>
      <Row label={t('settings.language')} hint={t('set.interface.languageHint')}>
        <Select aria-label={t('settings.language')} value={language} onChange={(e) => setLanguage(e.target.value as Language)}>
          <option value="en">English</option>
          <option value="ar">العربية</option>
        </Select>
      </Row>
    </Card>
  );
}

function StorageCard(): JSX.Element {
  const { workspace, syncState, syncMessage, recordCount, retrySync } = useWorkspace();
  const { activeTeam } = useTeam();
  const { t } = useI18n();
  const used = totalCloudBytes(workspace.attachments);
  const pct = Math.min(100, Math.round((used / MAX_TOTAL_CLOUD_BYTES) * 100));
  const status =
    syncState === 'error'
      ? (syncMessage ?? t('sh.account.syncFailed'))
      : syncState === 'syncing'
        ? t('shell.syncing')
        : t('sh.account.liveIn', { team: activeTeam?.name ?? t('sh.account.yourTeam'), count: recordCount });
  return (
    <Card title={t('set.storage.title')}>
      <Row
        label={t('set.storage.sync')}
        hint={
          <span className="inline-flex items-center gap-1.5">
            {syncState === 'syncing' ? (
              <Loader2 size={12} className="animate-spin" aria-hidden />
            ) : syncState === 'error' ? (
              <AlertTriangle size={12} className="text-coral" aria-hidden />
            ) : (
              <Cloud size={12} aria-hidden />
            )}
            {status}
          </span>
        }
      >
        {syncState === 'error' ? (
          <Button onClick={retrySync} icon={<RotateCcw size={13} strokeWidth={2} />}>
            {t('sh.retry')}
          </Button>
        ) : null}
      </Row>
      <div className="set-row" data-stacked>
        <div className="flex items-center justify-between gap-3">
          <p className="set-label">{t('sh.account.cloudStorage')}</p>
          <p className="set-hint num">
            {used ? fmtBytes(used, t) : t('sh.unit.bytes', { n: 0, unit: t('sh.unit.MB') })} / {fmtBytes(MAX_TOTAL_CLOUD_BYTES, t)}
          </p>
        </div>
        <div className="set-meter" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={t('sh.account.cloudStorage')}>
          <span className={cn(pct >= 90 && 'is-full')} style={{ width: `${Math.max(pct, 1)}%` }} />
        </div>
      </div>
    </Card>
  );
}

function DangerCard(): JSX.Element {
  const { resetWorkspace } = useWorkspace();
  const { t } = useI18n();
  return (
    <Card title={t('set.danger.title')} danger>
      <Row label={t('sh.account.resetDevice')} hint={t('set.danger.resetHint')}>
        <Button
          className="set-danger-btn"
          onClick={() => {
            if (window.confirm(t('sh.account.resetConfirm'))) resetWorkspace();
          }}
        >
          {t('set.danger.reset')}
        </Button>
      </Row>
    </Card>
  );
}

function WorkspaceTab(): JSX.Element {
  const { teams, activeTeam, switchTeam } = useTeam();
  const { setModule } = useUI();
  const { t } = useI18n();
  return (
    <div className="set-grid">
      <Card title={t('set.workspace.title')}>
        {teams.length === 0 ? <Row label={t('set.workspace.none')} /> : null}
        {teams.map((team) => {
          const active = team.id === activeTeam?.id;
          return (
            <Row key={team.id} label={team.name} hint={t(`sh.role.${team.role}`)}>
              {active ? (
                <span className="set-current">
                  <Check size={13} strokeWidth={2.2} aria-hidden />
                  {t('set.workspace.current')}
                </span>
              ) : (
                <Button onClick={() => switchTeam(team.id)}>{t('set.workspace.switch')}</Button>
              )}
            </Row>
          );
        })}
        <Row label={t('set.workspace.manage')} hint={t('set.workspace.manageHint')}>
          <Button onClick={() => setModule('team')}>{t('set.open')}</Button>
        </Row>
      </Card>
      <StorageCard />
    </div>
  );
}

function SecurityTab(): JSX.Element | null {
  const { user, changePassword, signOut } = useAuth();
  const { t } = useI18n();
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);
  if (!user) return null;
  const provider = user.app_metadata?.provider === 'google' ? 'Google' : t('set.security.emailPassword');

  const submit = async (): Promise<void> => {
    setBusy(true);
    setFeedback(null);
    const result = await changePassword(password);
    setBusy(false);
    if (result.ok) setPassword('');
    setFeedback(toFeedback(result, t('sh.account.pwUpdated')));
  };

  return (
    <div className="set-grid">
      <Card title={t('set.security.password')}>
        <Row label={t('sh.account.changePassword')} hint={t('set.security.passwordHint')} stacked>
          <TextInput
            type="password"
            aria-label={t('sh.account.changePassword')}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t('sh.account.pwPlaceholder')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && password.length >= 8) void submit();
            }}
            className="min-w-0 flex-1"
          />
          <Button variant="primary" disabled={busy || password.length < 8} onClick={() => void submit()}>
            {busy ? <Loader2 size={13} className="animate-spin" aria-hidden /> : null}
            {t('sh.update')}
          </Button>
        </Row>
        <Note feedback={feedback} />
      </Card>
      <Card title={t('set.security.access')}>
        <Row label={t('set.security.method')} hint={provider} />
        <Row label={t('sh.signOut')} hint={t('set.security.signOutHint')}>
          <Button onClick={() => void signOut()}>{t('sh.signOut')}</Button>
        </Row>
      </Card>
    </div>
  );
}

function NotificationsTab(): JSX.Element {
  const { alertsOn, alertSupport, setAlertsOn } = useNotifications();
  const { t } = useI18n();
  const blocked = alertSupport === 'denied' || alertSupport === 'unsupported';
  return (
    <div className="set-grid">
      <Card title={t('set.notifications.title')}>
        <Row
          label={t('notif.alerts')}
          hint={
            alertSupport === 'denied'
              ? t('notif.alertsDenied')
              : alertSupport === 'unsupported'
                ? t('notif.alertsUnsupported')
                : t('notif.alertsHint')
          }
        >
          <input
            type="checkbox"
            role="switch"
            aria-label={t('notif.alerts')}
            className="notif-switch"
            checked={alertsOn}
            disabled={blocked}
            onChange={(e) => void setAlertsOn(e.target.checked)}
          />
        </Row>
      </Card>
    </div>
  );
}

/** Account, appearance, teams, security and alerts on one page with tabs. */
export function SettingsModule(): JSX.Element {
  const { user } = useAuth();
  const { t } = useI18n();
  const [tab, setTab] = useState<Tab>('general');

  return (
    <div className="settings scroll-y">
      <div className="settings-inner">
        <h1>{t('nav.settings')}</h1>
        <div className="set-tabs" role="tablist" aria-label={t('nav.settings')}>
          {TABS.map((id) => (
            <button
              key={id}
              type="button"
              role="tab"
              id={`set-tab-${id}`}
              aria-selected={tab === id}
              aria-controls="set-panel"
              tabIndex={tab === id ? 0 : -1}
              onClick={() => setTab(id)}
              onKeyDown={(e) => {
                if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
                const dir = (e.key === 'ArrowRight') === (document.documentElement.dir !== 'rtl') ? 1 : -1;
                const next = TABS[(TABS.indexOf(id) + dir + TABS.length) % TABS.length]!;
                setTab(next);
                document.getElementById(`set-tab-${next}`)?.focus();
              }}
            >
              {t(`set.tab.${id}`)}
            </button>
          ))}
        </div>

        <div id="set-panel" role="tabpanel" aria-labelledby={`set-tab-${tab}`}>
          {tab === 'general' ? (
            <div className="set-grid">
              <div className="set-col">
                {user ? <AccountCard /> : <SignInPrompt />}
                <InterfaceCard />
              </div>
              <div className="set-col">
                {user ? <StorageCard /> : null}
                <DangerCard />
              </div>
            </div>
          ) : !user ? (
            <div className="set-grid">
              <SignInPrompt />
            </div>
          ) : tab === 'workspace' ? (
            <WorkspaceTab />
          ) : tab === 'security' ? (
            <SecurityTab />
          ) : (
            <NotificationsTab />
          )}
        </div>
      </div>
    </div>
  );
}
