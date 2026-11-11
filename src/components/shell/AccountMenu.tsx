import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { Crown, LogOut, Settings, Zap, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { Avatar } from '@/components/ui/Avatar';
import { fmtBytes, rich, useI18n } from '@/components/ui/useI18n';
import { MAX_TOTAL_CLOUD_BYTES, totalCloudBytes } from '@/data/attachments';
import { accountTier, type AccountTier } from '@/lib/access';
import { cn } from '@/lib/utils';
import { getDisplayName, useAuth } from '@/state/authStore';
import { useUI } from '@/state/uiStore';
import { useWorkspace } from '@/state/workspaceStore';

/** `label` is a translation key. */
const TIER_LOOK: Record<AccountTier, { label: string; icon: LucideIcon } | null> = {
  admin: { label: 'sh.tier.admin', icon: Crown },
  pro: { label: 'sh.tier.pro', icon: Zap },
  beta: null,
};

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

/**
 * The signed-in account behind the avatar in the top bar: who it is, the plan
 * banner, storage used, a link to Settings and sign out. Everything editable
 * lives on the Settings page.
 */
export function AccountMenu({ children }: { children: ReactNode }): JSX.Element | null {
  const { user, avatarUrl, signOut } = useAuth();
  const { workspace } = useWorkspace();
  const { setModule } = useUI();
  const { t } = useI18n();
  if (!user) return null;

  const tier = accountTier(user);
  const look = TIER_LOOK[tier];
  const name = getDisplayName(user);
  const used = totalCloudBytes(workspace.attachments);
  const pct = Math.min(100, Math.round((used / MAX_TOTAL_CLOUD_BYTES) * 100));

  return (
    <DropdownMenu.Root modal={false}>
      <DropdownMenu.Trigger asChild>{children}</DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content className="am-panel" data-tier={tier} align="end" sideOffset={12} collisionPadding={12}>
          <div className="am-head">
            {look ? (
              <div className="am-banner">
                <look.icon size={12} strokeWidth={2.2} aria-hidden />
                {t(look.label)}
              </div>
            ) : null}
            <div className="am-who">
              <div className="min-w-0 flex-1">
                <p className="am-name">{name}</p>
                <p className="am-email">{user.email}</p>
              </div>
              <Avatar src={avatarUrl} name={name} size={44} />
            </div>
          </div>

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

          <DropdownMenu.Separator className="am-sep" />
          <DropdownMenu.Item className="am-item" onSelect={() => setModule('settings')}>
            <Settings size={16} strokeWidth={1.7} aria-hidden />
            <span>{t('nav.settings')}</span>
          </DropdownMenu.Item>
          <DropdownMenu.Item className="am-item" data-tone="danger" onSelect={() => void signOut()}>
            <LogOut size={16} strokeWidth={1.7} aria-hidden />
            <span>{t('sh.signOut')}</span>
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
