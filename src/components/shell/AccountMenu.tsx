import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import {
  Camera,
  Crown,
  LifeBuoy,
  LogIn,
  LogOut,
  Monitor,
  Moon,
  Palette,
  Settings,
  Sun,
  UserRound,
  Users,
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
import { cn, formatBytes } from '@/lib/utils';
import { getDisplayName, useAuth } from '@/state/authStore';
import { originOf, useTheme, type ThemePreference } from '@/state/themeStore';
import { useUI } from '@/state/uiStore';
import { useWorkspace } from '@/state/workspaceStore';

const TIER_LOOK: Record<AccountTier, { label: string; icon: LucideIcon } | null> = {
  admin: { label: 'Admin · Founder', icon: Crown },
  pro: { label: 'Pro member', icon: Zap },
  beta: null,
};

const THEMES: { id: ThemePreference; label: string; icon: LucideIcon }[] = [
  { id: 'light', label: 'Light', icon: Sun },
  { id: 'dark', label: 'Dark', icon: Moon },
  { id: 'system', label: 'Match device', icon: Monitor },
];

/** Light / dark / match-device, as one pill of three icons. */
function ThemeSwitch(): JSX.Element {
  const { preference, setPreference } = useTheme();
  return (
    <div className="am-theme" role="radiogroup" aria-label="Theme">
      {THEMES.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          type="button"
          role="radio"
          aria-checked={preference === id}
          aria-label={label}
          title={label}
          data-active={preference === id || undefined}
          onClick={(e) => setPreference(id, originOf(e.currentTarget))}
        >
          <Icon size={14} strokeWidth={1.8} aria-hidden />
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
  const { setAccountOpen, setSettingsOpen, setModule, setMobileNavOpen } = useUI();
  const [pictureOpen, setPictureOpen] = useState(false);

  const tier = accountTier(user);
  const look = user ? TIER_LOOK[tier] : null;
  const name = user ? getDisplayName(user) : 'Guest';
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
                  {look.label}
                </div>
              ) : null}
              <div className="am-status" data-live={user ? true : undefined}>
                <span className="am-status-dot" aria-hidden />
                {user ? 'Live · signed in' : configured ? 'Not signed in' : 'Local only'}
              </div>
              <div className="am-who">
                <div className="min-w-0 flex-1">
                  <p className="am-name">{name}</p>
                  <p className="am-email">{user?.email ?? 'Saved on this device only'}</p>
                </div>
                <button
                  type="button"
                  className="am-avatar"
                  aria-label="Change profile picture"
                  onClick={go(() => setPictureOpen(true))}
                >
                  <Avatar src={avatarUrl} name={name} size={44} pro={isProUser(user)} />
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
                    <span className="num">{used ? formatBytes(used) : '0 MB'}</span> used of{' '}
                    <span className="num">{formatBytes(MAX_TOTAL_CLOUD_BYTES)}</span>
                  </p>
                  <p className="am-usage-note">
                    {tier === 'admin' ? 'Unlimited admin access' : tier === 'pro' ? 'Pro plan' : 'Beta · free while in beta'}
                  </p>
                </div>
              </div>
            ) : null}

            <DropdownMenu.Separator className="am-sep" />

            {user ? (
              <Item icon={UserRound} onSelect={go(() => setAccountOpen(true))}>
                Profile &amp; account
              </Item>
            ) : null}
            <Item icon={Camera} onSelect={go(() => setPictureOpen(true))}>
              Profile picture
            </Item>
            <Item icon={Settings} onSelect={go(() => setSettingsOpen(true))}>
              Settings
            </Item>
            {user ? (
              <Item icon={Users} onSelect={go(() => setModule('team'))}>
                Team
              </Item>
            ) : null}
            <Item icon={LifeBuoy} onSelect={go(() => setModule('contact'))}>
              Support
            </Item>

            <DropdownMenu.Separator className="am-sep" />

            <div className="am-row">
              <Palette size={16} strokeWidth={1.7} aria-hidden />
              <span className="flex-1">Theme</span>
              <ThemeSwitch />
            </div>

            <DropdownMenu.Separator className="am-sep" />

            {user ? (
              <Item icon={LogOut} tone="danger" onSelect={go(() => void signOut())}>
                Sign out
              </Item>
            ) : configured ? (
              <Item icon={LogIn} tone="accent" onSelect={go(() => setAccountOpen(true))}>
                Sign in or create account
              </Item>
            ) : null}
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>

      <Modal
        open={pictureOpen}
        onOpenChange={setPictureOpen}
        title="Profile picture"
        description={
          user
            ? 'Shown on your profile, next to your name, and to your team on every device.'
            : 'Saved on this device. When you create an account or sign in, it moves to your account automatically.'
        }
        footer={<Button onClick={() => setPictureOpen(false)}>Done</Button>}
      >
        <AvatarEditor name={name} pro={isProUser(user)} />
      </Modal>
    </>
  );
}
