import * as Dialog from '@radix-ui/react-dialog';
import { CloudOff, Search, Settings } from 'lucide-react';
import { useCallback, useEffect, useState, type CSSProperties } from 'react';
import { BRAND_NAME, BRAND_TAGLINE, BrandMark } from '@/components/ui/BrandMark';
import type { ModuleId } from '@/lib/types';
import { cn } from '@/lib/utils';
import { DOCS_GROUP, ESSENTIALS, INSIGHT, MODULE_MAP } from '@/modules/registry';
import { getDisplayName, useAuth } from '@/state/authStore';
import { useLanguage } from '@/state/languageStore';
import { useUI } from '@/state/uiStore';
import { useWorkspace } from '@/state/workspaceStore';
import { MenuButton } from './MenuButton';
import { FLAG_TOOLTIP, FlagPill, NAV_KEY, SYNC_LOOK_KEY, TeamSwitcher, useRowFlag } from './navShared';
import { ThemeToggle } from './ThemeToggle';

/** Where the last tap/click landed — the menu grows out of that point. */
const lastTap = { x: 28, y: 28 };
let tapListening = false;
function listenForTaps(): void {
  if (tapListening || typeof window === 'undefined') return;
  tapListening = true;
  window.addEventListener(
    'pointerdown',
    (e) => {
      lastTap.x = e.clientX;
      lastTap.y = e.clientY;
    },
    { capture: true, passive: true },
  );
}

/**
 * Phone navigation: a full-screen sheet that ripples open from the
 * hamburger in a circular reveal, with the module grid cascading in tile by
 * tile. The WebGL field keeps glowing through the frosted backdrop.
 */
export function MobileMenu(): JSX.Element {
  const { module, setModule, mobileNavOpen, setMobileNavOpen, setPaletteOpen, setAccountOpen, setSettingsOpen } =
    useUI();
  const { live, syncState } = useWorkspace();
  const { user, configured } = useAuth();
  const { t } = useLanguage();
  const flagFor = useRowFlag();

  useEffect(listenForTaps, []);

  // The close control morphs from bars → X a frame after the sheet mounts.
  const [morph, setMorph] = useState(false);
  useEffect(() => {
    if (!mobileNavOpen) {
      setMorph(false);
      return;
    }
    const id = requestAnimationFrame(() => setMorph(true));
    return () => cancelAnimationFrame(id);
  }, [mobileNavOpen]);

  // Captured during render on the open transition (React's "adjust state
  // while rendering" pattern) so the first animation frame already knows
  // where to grow from — and kept while closing so it shrinks back there.
  const [wasOpen, setWasOpen] = useState(mobileNavOpen);
  const [origin, setOrigin] = useState<CSSProperties>({});
  if (mobileNavOpen !== wasOpen) {
    setWasOpen(mobileNavOpen);
    if (mobileNavOpen && typeof window !== 'undefined') {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const r = Math.hypot(Math.max(lastTap.x, w - lastTap.x), Math.max(lastTap.y, h - lastTap.y)) + 24;
      setOrigin({ ['--mx' as string]: `${lastTap.x}px`, ['--my' as string]: `${lastTap.y}px`, ['--mr' as string]: `${r}px` });
    }
  }

  const close = useCallback(() => setMobileNavOpen(false), [setMobileNavOpen]);
  const labelFor = (id: ModuleId): string => t(NAV_KEY[id] ?? MODULE_MAP[id].label);

  const sync = SYNC_LOOK_KEY[live ? syncState : 'offline'];
  const SyncIcon = configured ? sync.icon : CloudOff;
  const accountName = user ? getDisplayName(user) : configured ? t('shell.signIn') : t('shell.localOnly');

  let tileIndex = 0;
  const tiles = (ids: ModuleId[]): JSX.Element[] =>
    ids.map((id) => {
      const meta = MODULE_MAP[id];
      const Icon = meta.icon;
      const active = module === id;
      const flag = flagFor(id);
      const label = labelFor(id);
      const i = tileIndex++;
      return (
        <button
          key={id}
          type="button"
          onClick={() => setModule(id)}
          data-active={active}
          aria-current={active ? 'page' : undefined}
          aria-label={flag ? `${label} — ${FLAG_TOOLTIP[flag]}` : label}
          className="menu-tile"
          style={{ ['--i' as string]: i }}
        >
          <span className="menu-tile-icon">
            <Icon size={17} strokeWidth={1.6} aria-hidden />
          </span>
          <span className="menu-tile-label">{label}</span>
          {flag ? <FlagPill flag={flag} className="absolute end-2.5 top-2.5" /> : null}
        </button>
      );
    });

  return (
    <Dialog.Root open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
      <Dialog.Portal>
        <Dialog.Content
          aria-label="Navigation"
          aria-describedby={undefined}
          onOpenAutoFocus={(e) => e.preventDefault()}
          className="mobile-menu fixed inset-0 z-50 flex flex-col md:hidden"
          style={origin}
        >
          <Dialog.Title className="sr-only">Navigation</Dialog.Title>
          <div className="mobile-menu-glow" aria-hidden />

          <header className="relative flex items-center gap-3 px-4 pb-3 pt-[max(14px,env(safe-area-inset-top))]">
            <MenuButton open={morph} onClick={close} label="Close navigation" />
            <BrandMark size={34} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[15px] font-medium leading-tight tracking-[-0.014em] text-paper">
                {BRAND_NAME}
              </span>
              <span className="mono block truncate text-[9.5px] uppercase tracking-[0.12em] text-ash">{BRAND_TAGLINE}</span>
            </span>
          </header>

          <div className="relative px-4 pb-3">
            <button
              type="button"
              onClick={() => {
                close();
                setPaletteOpen(true);
              }}
              className="menu-search"
            >
              <Search size={16} strokeWidth={1.7} aria-hidden />
              <span className="flex-1 text-start">{t('shell.search')}</span>
            </button>
          </div>

          {user ? (
            <div className="relative px-4">
              <TeamSwitcher expanded />
            </div>
          ) : null}

          <nav aria-label="Modules" className="scroll-y relative min-h-0 flex-1 px-4 pb-4">
            <p className="menu-section-head">{t('nav.essentials')}</p>
            <div className="menu-grid">{tiles(ESSENTIALS)}</div>
            <p className="menu-section-head">{t('nav.docs')}</p>
            <div className="menu-grid">{tiles(DOCS_GROUP.children)}</div>
            <p className="menu-section-head">{t('nav.insight')}</p>
            <div className="menu-grid">{tiles(INSIGHT)}</div>
          </nav>

          <footer className="menu-foot relative px-4 pt-3 pb-[max(14px,env(safe-area-inset-bottom))]">
            <ThemeToggle expanded />
            <div className="grid grid-cols-[auto_1fr] gap-2">
              <button
                type="button"
                onClick={() => {
                  close();
                  setSettingsOpen(true);
                }}
                aria-label={t('shell.settings')}
                className="menu-foot-btn aspect-square justify-center"
              >
                <Settings size={17} strokeWidth={1.6} aria-hidden />
              </button>
              <button
                type="button"
                onClick={() => {
                  close();
                  setAccountOpen(true);
                }}
                aria-label={t('shell.account')}
                className="menu-foot-btn"
              >
                <SyncIcon
                  size={16}
                  strokeWidth={1.7}
                  aria-hidden
                  className={cn('shrink-0', configured && live && syncState === 'syncing' && 'animate-spin')}
                  style={configured ? { color: sync.color } : undefined}
                />
                <span className="min-w-0 flex-1 text-start">
                  <span className="block truncate text-[13px] text-mist">{accountName}</span>
                  <span className="mono block truncate text-[10px] uppercase tracking-[0.07em] text-ash">
                    {user ? t(sync.key) : t('shell.thisDevice')}
                  </span>
                </span>
              </button>
            </div>
          </footer>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
