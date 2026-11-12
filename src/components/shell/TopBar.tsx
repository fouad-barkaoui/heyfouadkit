import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { ArrowUpRight, ChevronDown, Search, X } from 'lucide-react';
import { useState } from 'react';
import { BrandMark, BRAND_NAME } from '@/components/ui/BrandMark';
import { Avatar } from '@/components/ui/Avatar';
import { useI18n } from '@/components/ui/useI18n';
import { isAdminUser, isProUser } from '@/lib/access';
import type { ModuleId } from '@/lib/types';
import { cn } from '@/lib/utils';
import { prefetchModule } from '@/modules/prefetch';
import { groupOf, MODULE_MAP, NAV_GROUPS, type NavGroup } from '@/modules/registry';
import { getDisplayName, useAuth } from '@/state/authStore';
import { useNotifications } from '@/state/notificationsStore';
import { useUI } from '@/state/uiStore';
import { useWorkspace } from '@/state/workspaceStore';
import { AccountMenu } from './AccountMenu';
import { FlagPill, NAV_KEY, SYNC_LOOK, useRowFlag } from './navShared';
import { NotificationBell } from './NotificationBell';

export const PORTFOLIO_URL = 'https://fouad-barkaoui.vercel.app/';

/** Pages reached from the menu button rather than a section. */
const MENU_PAGES: ModuleId[] = ['news', 'contact', 'settings'];

function ModuleItem({ id, onSelect }: { id: ModuleId; onSelect: (id: ModuleId) => void }): JSX.Element {
  const { module } = useUI();
  const { t } = useI18n();
  const flagFor = useRowFlag();
  const meta = MODULE_MAP[id];
  const Icon = meta.icon;
  const flag = flagFor(id);
  return (
    <DropdownMenu.Item
      className="tb-item"
      data-current={module === id || undefined}
      onSelect={() => onSelect(id)}
      onPointerEnter={() => prefetchModule(id)}
    >
      <Icon size={16} strokeWidth={1.6} aria-hidden />
      <span className="min-w-0 flex-1 truncate">{t(NAV_KEY[id] ?? meta.label)}</span>
      {flag ? <FlagPill flag={flag} /> : null}
    </DropdownMenu.Item>
  );
}

/** One section pill ("Plan", "Library"…) with its tools in a dropdown. */
function SectionPill({ group, onSelect }: { group: NavGroup; onSelect: (id: ModuleId) => void }): JSX.Element {
  const { module } = useUI();
  const { t } = useI18n();
  const current = groupOf(module)?.id === group.id;
  return (
    <DropdownMenu.Root modal={false}>
      <DropdownMenu.Trigger className="tb-navlink" data-current={current || undefined}>
        {t(group.labelKey)}
        <ChevronDown size={14} strokeWidth={1.8} aria-hidden className="tb-chevron" />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content className="tb-menu" align="start" sideOffset={12} collisionPadding={12}>
          {group.children.map((id) => (
            <ModuleItem key={id} id={id} onSelect={onSelect} />
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

/**
 * The app's only navigation: logo, section pills, search, account and a menu.
 * Below 1024px the section pills fold into the menu so the bar never wraps.
 * From 1024px the bar is a three-column grid, so the search can never sit on
 * top of the pills however narrow the window gets.
 */
export function TopBar(): JSX.Element {
  const { module, setModule, setPaletteOpen, setAccountOpen } = useUI();
  const { user, configured, avatarUrl } = useAuth();
  const { live, syncState } = useWorkspace();
  const { inboxNew } = useNotifications();
  const { t } = useI18n();
  const [menuOpen, setMenuOpen] = useState(false);
  const isAdmin = isAdminUser(user);
  const sync = SYNC_LOOK[live ? syncState : 'offline'];
  const SyncIcon = sync.icon;
  const name = user ? getDisplayName(user) : '';

  return (
    <header className="topbar" aria-label={t('sh.nav.modules')}>
      <div className="topbar-group">
        <button
          type="button"
          className="tb-pill tb-circle tb-logo"
          aria-label={`${BRAND_NAME}, ${t('nav.home')}`}
          onClick={() => setModule('home')}
        >
          <BrandMark size={30} round />
        </button>
        <nav className="tb-pill tb-nav" aria-label={t('sh.nav.modules')}>
          <button
            type="button"
            className="tb-navlink"
            data-current={module === 'home' || undefined}
            aria-current={module === 'home' ? 'page' : undefined}
            onClick={() => setModule('home')}
          >
            {t('nav.home')}
          </button>
          {NAV_GROUPS.map((group) => (
            <SectionPill key={group.id} group={group} onSelect={setModule} />
          ))}
        </nav>
      </div>

      <div className="tb-search">
        <button type="button" className="tb-searchpill" onClick={() => setPaletteOpen(true)}>
          <Search size={17} strokeWidth={1.6} aria-hidden />
          <span className="min-w-0 flex-1 truncate text-start">{t('shell.search')}</span>
          <kbd className="tb-kbd">Ctrl K</kbd>
        </button>
      </div>

      <div className="topbar-group">
        {user ? <NotificationBell /> : null}
        {user ? (
          <AccountMenu>
            <button type="button" className="tb-pill tb-circle" aria-label={`${t('shell.account')}: ${name}`}>
              <span className="relative">
                <Avatar src={avatarUrl} name={name} size={32} pro={isProUser(user)} />
                <span className="tb-sync" aria-hidden>
                  <SyncIcon
                    size={9}
                    strokeWidth={2.4}
                    className={cn(syncState === 'syncing' && live && 'animate-spin')}
                    style={{ color: sync.color }}
                  />
                </span>
              </span>
            </button>
          </AccountMenu>
        ) : configured ? (
          <button type="button" className="tb-pill tb-cta" onClick={() => setAccountOpen(true)}>
            {t('shell.signIn')}
          </button>
        ) : null}

        <DropdownMenu.Root modal={false} open={menuOpen} onOpenChange={setMenuOpen}>
          <DropdownMenu.Trigger className="tb-pill tb-circle tb-more" aria-label={t('sh.nav.open')}>
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden>
              <path d="M4 8h14M4 14h9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            {isAdmin && inboxNew ? <span className="notif-badge is-dot is-floating" aria-hidden /> : null}
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content className="tb-menu tb-menu-more" align="end" sideOffset={12} collisionPadding={12}>
              {/* Phones: the menu is a centred card, so it carries its own close button. */}
              <div className="tb-menu-head">
                <span>{BRAND_NAME}</span>
                <button
                  type="button"
                  className="btn-icon"
                  aria-label={t('sh.panel.close')}
                  onClick={() => setMenuOpen(false)}
                >
                  <X size={16} strokeWidth={1.8} aria-hidden />
                </button>
              </div>
              {/* Phones and tablets: the sections live here instead of the bar. */}
              <div className="tb-menu-sections">
                <ModuleItem id="home" onSelect={setModule} />
                {NAV_GROUPS.map((group) => (
                  <DropdownMenu.Group key={group.id}>
                    <DropdownMenu.Label className="tb-menu-label">{t(group.labelKey)}</DropdownMenu.Label>
                    {group.children.map((id) => (
                      <ModuleItem key={id} id={id} onSelect={setModule} />
                    ))}
                  </DropdownMenu.Group>
                ))}
                <DropdownMenu.Separator className="tb-menu-sep" />
              </div>
              <div className="tb-menu-pages">
                {isAdmin ? <ModuleItem id="inbox" onSelect={setModule} /> : null}
                {MENU_PAGES.map((id) => (
                  <ModuleItem key={id} id={id} onSelect={setModule} />
                ))}
              </div>
              <DropdownMenu.Separator className="tb-menu-sep" />
              <DropdownMenu.Item asChild className="tb-item">
                <a href={PORTFOLIO_URL} target="_blank" rel="noopener noreferrer">
                  <ArrowUpRight size={16} strokeWidth={1.6} aria-hidden />
                  <span className="min-w-0 flex-1 truncate">{t('sh.menu.founder')}</span>
                </a>
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>
    </header>
  );
}
