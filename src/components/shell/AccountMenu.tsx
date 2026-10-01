import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import {
  Camera,
  Crown,
  Languages,
  LogIn,
  LogOut,
  Monitor,
  Moon,
  Palette,
  Sun,
  UserRound,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { AvatarEditor } from '@/components/profile/AvatarEditor';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { MAX_TOTAL_CLOUD_BYTES, totalCloudBytes } from '@/data/attachments';
import { accountTier, isProUser, type AccountTier } from '@/lib/access';
import { fmtBytes, rich, useI18n } from '@/components/ui/useI18n';
import { cn } from '@/lib/utils';
import { getDisplayName, useAuth } from '@/state/authStore';
import { useLanguage, type Language } from '@/state/languageStore';
import { originOf, useTheme, type ThemePreference } from '@/state/themeStore';
import { useUI } from '@/state/uiStore';
import { useWorkspace } from '@/state/workspaceStore';

/** `label` is a translation key. */
const TIER_LOOK: Record<AccountTier, { label: string; icon: LucideIcon } | null> = {
  admin: { label: 'sh.tier.admin', icon: Crown },
  pro: { label: 'sh.tier.pro', icon: Zap },
  beta: null,
};

/** `label` is a translation key. */
const THEMES: { id: ThemePreference; label: string; icon: LucideIcon }[] = [
  { id: 'light', label: 'theme.light', icon: Sun },
  { id: 'dark', label: 'theme.dark', icon: Moon },
  { id: 'system', label: 'sh.theme.system', icon: Monitor },
];

/** Light / dark / match-device, as one pill of three icons. */
function ThemeSwitch(): JSX.Element {
  const { preference, setPreference } = useTheme();
  const { t } = useI18n();
  return (
    <div className="am-theme" role="radiogroup" aria-label={t('settings.theme')}>
      {THEMES.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          type="button"
          role="radio"
          aria-checked={preference === id}
          aria-label={t(label)}
          title={t(label)}
          data-active={preference === id || undefined}
          onClick={(e) => setPreference(id, originOf(e.currentTarget))}
        >
          <Icon size={14} strokeWidth={1.8} aria-hidden />
        </button>
      ))}
    </div>
  );
}

const LANGUAGES: { id: Language; label: string; short: string }[] = [
  { id: 'en', label: 'English', short: 'EN' },
  { id: 'ar', label: 'العربية', short: 'ع' },
];

/** English / Arabic, same pill as the theme switch. */
function LanguageSwitch(): JSX.Element {
  const { language, setLanguage, t } = useLanguage();
  return (
    <div className="am-theme am-lang" role="radiogroup" aria-label={t('settings.language')}>
      {LANGUAGES.map(({ id, label, short }) => (
        <button
          key={id}
          type="button"
          role="radio"
          aria-checked={language === id}
          aria-label={label}
          title={label}
          lang={id}
          data-active={language === id || undefined}
          onClick={() => setLanguage(id)}
        >
          {short}
        </button>
      ))}
    </div>
  );
}

/** Small ring that fills with how much cloud storage is used. */
function UsageRing({ pct }: { pct: number }): JSX.Element {
  const r = 12;
  const c = 2 * Math.PI * r;
  return (
    <svg className="am-ring" viewBox="0 0 30 30" width="30" height="30" aria-hidden>
      <circle cx="15" cy="15" r={r} className="am-ring-track" />
      <circle
        cx="15"
        cy="15"
        r={r}
        className={cn('am-ring-fill', pct >= 90 && 'is-full')}
        strokeDasharray={`${Math.max(c * 0.02, (pct / 100) * c)} ${c}`}
        transform="rotate(-90 15 15)"
      />
    </svg>
  );
}

function Item({
  icon: Icon,
  children,
  onSelect,
  tone,
}: {
  icon: LucideIcon;
  children: ReactNode;
  onSelect: () => void;
  tone?: 'danger' | 'accent';
}): JSX.Element {
  return (
    <DropdownMenu.Item className="am-item" data-tone={tone} onSelect={onSelect}>
      <Icon size={16} strokeWidth={1.7} aria-hidden />
      <span>{children}</span>
    </DropdownMenu.Item>
  );
}

/**
 * Everything about "me" behind the profile picture: who is signed in and how
 * (live status, plan banner), storage, picture, settings, theme and sign out.
 * Wraps whichever button acts as the trigger (rail or phone menu).
 */
export function AccountMenu({
  children,
  side = 'right',
  align = 'end',
}: {
  children: ReactNode;
  side?: 'right' | 'top' | 'bottom';
  align?: 'start' | 'end' | 'center';
}): JSX.Element {
  const { user, configured, avatarUrl, signOut } = useAuth();
  const { workspace } = useWorkspace();
  const { setAccountOpen, setMobileNavOpen } = useUI();
  const [pictureOpen, setPictureOpen] = useState(false);
  const { t } = useI18n();

  const tier = accountTier(user);
  const look = user ? TIER_LOOK[tier] : null;
  const name = user ? getDisplayName(user) : t('sh.guest');
  const used = totalCloudBytes(workspace.attachments);
  const pct = Math.min(100, Math.round((used / MAX_TOTAL_CLOUD_BYTES) * 100));
  const go = (fn: () => void) => () => {
    setMobileNavOpen(false);
    fn();
  };

  return (
    <>
      <DropdownMenu.Root modal={false}>
        <DropdownMenu.Trigger asChild>{children}</DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content
            className="am-panel"
            data-tier={user ? tier : 'guest'}
            side={side}
            align={align}
            sideOffset={10}
            collisionPadding={12}
          >
            <div className="am-head">
              {look ? (
                <div className="am-banner">
                  <look.icon size={12} strokeWidth={2.2} aria-hidden />
                  {t(look.label)}
                </div>
              ) : null}
              {user ? null : (
                <div className="am-status">
                  <span className="am-status-dot" aria-hidden />
                  {configured ? t('sh.am.notSignedIn') : t('shell.localOnly')}
                </div>
              )}
              <div className="am-who">
                <div className="min-w-0 flex-1">
                  <p className="am-name">{name}</p>
                  <p className="am-email">{user?.email ?? t('sh.am.deviceOnly')}</p>
                </div>
                <button
                  type="button"
                  className="am-avatar"
                  aria-label={t('sh.am.changePicture')}
                  onClick={go(() => setPictureOpen(true))}
                >
                  <Avatar src={avatarUrl} name={name} size={44} />
                  <span className="am-avatar-cam" aria-hidden>
                    <Camera size={11} strokeWidth={2.2} />
                  </span>
                </button>
              </div>
            </div>

            {user ? (
              <div className="am-usage">
                <UsageRing pct={pct} />
                <div className="min-w-0">
                  <p className="am-usage-line">
                    {rich(t('sh.am.usage'), {
                      used: <span className="num">{used ? fmtBytes(used, t) : t('sh.unit.bytes', { n: 0, unit: t('sh.unit.MB') })}</span>,
                      total: <span className="num">{fmtBytes(MAX_TOTAL_CLOUD_BYTES, t)}</span>,
                    })}
                  </p>
                  <p className="am-usage-note">
                    {tier === 'admin' ? t('sh.am.adminAccount') : tier === 'pro' ? t('sh.am.proPlan') : t('sh.am.beta')}
                  </p>
                </div>
              </div>
            ) : null}

            <DropdownMenu.Separator className="am-sep" />

            {user ? (
              <Item icon={UserRound} onSelect={go(() => setAccountOpen(true))}>
                {t('sh.am.profileAccount')}
              </Item>
            ) : null}
            <div className="am-row">
              <Languages size={16} strokeWidth={1.7} aria-hidden />
              <span className="flex-1">{t('settings.language')}</span>
              <LanguageSwitch />
            </div>
            <div className="am-row">
              <Palette size={16} strokeWidth={1.7} aria-hidden />
              <span className="flex-1">{t('settings.theme')}</span>
              <ThemeSwitch />
            </div>

            <DropdownMenu.Separator className="am-sep" />

            {user ? (
              <Item icon={LogOut} tone="danger" onSelect={go(() => void signOut())}>
                {t('sh.signOut')}
              </Item>
            ) : configured ? (
              <Item icon={LogIn} tone="accent" onSelect={go(() => setAccountOpen(true))}>
                {t('sh.am.signInOrCreate')}
              </Item>
            ) : null}
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>

      <Modal
        open={pictureOpen}
        onOpenChange={setPictureOpen}
        title={t('sh.am.pictureTitle')}
        description={user ? t('sh.am.pictureHintUser') : t('sh.am.pictureHintGuest')}
        footer={<Button onClick={() => setPictureOpen(false)}>{t('sh.done')}</Button>}
      >
        <AvatarEditor name={name} pro={isProUser(user)} />
      </Modal>
    </>
  );
}
