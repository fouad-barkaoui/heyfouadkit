import { Instagram, LogOut, Moon, Orbit, Sparkles, Sun, Waves, Wind } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Field';
import { cn, formatBytes } from '@/lib/utils';
import { useAuth } from '@/state/authStore';
import { useTheme } from '@/state/themeStore';
import { useLanguage, type Language } from '@/state/languageStore';
import { MAX_TOTAL_CLOUD_BYTES, totalCloudBytes } from '@/data/attachments';
import { useWorkspace } from '@/state/workspaceStore';
import { useUI, type BgStyle } from '@/state/uiStore';

const BG_OPTIONS: { id: BgStyle; label: string; hint: string; icon: typeof Waves }[] = [
  { id: 'waves', label: 'Waves', hint: 'A rolling dot sea — your cursor makes ripples', icon: Waves },
  { id: 'starfield', label: 'Starfield', hint: 'Stars stream past — hold to warp', icon: Sparkles },
  { id: 'flow', label: 'Flow', hint: 'Drifting dust — your cursor stirs a vortex', icon: Wind },
  { id: 'orbit', label: 'Orbit', hint: 'Each page forms its own shape', icon: Orbit },
];

const INSTAGRAM_URL = 'https://www.instagram.com/heyfouad/';

interface SettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SettingsModal({ open, onOpenChange }: SettingsModalProps): JSX.Element {
  const { user, signOut } = useAuth();
  const { preference, setPreference } = useTheme();
  const { language, setLanguage, t } = useLanguage();
  const { workspace } = useWorkspace();
  const { bgStyle, setBgStyle } = useUI();
  const storageUsed = totalCloudBytes(workspace.attachments);
  const storageLimitBytes = MAX_TOTAL_CLOUD_BYTES;
  const [signingOut, setSigningOut] = useState(false);

  const storagePercent = useMemo(() => {
    if (storageLimitBytes === 0) return 0;
    return Math.min(100, Math.round((storageUsed / storageLimitBytes) * 100));
  }, [storageUsed, storageLimitBytes]);

  const handleSignOut = useCallback(async () => {
    setSigningOut(true);
    try {
      await signOut();
      onOpenChange(false);
    } finally {
      setSigningOut(false);
    }
  }, [signOut, onOpenChange]);

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={t('settings.title')}
      footer={
        user ? (
          <Button
            variant="quiet"
            disabled={signingOut}
            onClick={() => void handleSignOut()}
            className="text-coral hover:bg-coral/10"
          >
            <LogOut size={14} strokeWidth={2} />
            Sign out
          </Button>
        ) : (
          <Button onClick={() => onOpenChange(false)}>Close</Button>
        )
      }
    >
      <div className="space-y-6">
        {/* Theme Section */}
        <div>
          <p className="mb-2.5 text-[11px] font-medium uppercase tracking-[0.08em] text-ash">
            {t('settings.theme')}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPreference('light')}
              className={cn(
                'flex flex-1 items-center justify-center gap-2 rounded-[6px] px-3 py-2 text-[12px] font-medium transition-colors duration-150',
                preference === 'light'
                  ? 'bg-acid text-void'
                  : 'bg-[rgb(var(--tint-rgb)/0.05)] text-paper hover:bg-[rgb(var(--tint-rgb)/0.08)]',
              )}
            >
              <Sun size={13} strokeWidth={2} />
              {t('theme.light')}
            </button>
            <button
              type="button"
              onClick={() => setPreference('dark')}
              className={cn(
                'flex flex-1 items-center justify-center gap-2 rounded-[6px] px-3 py-2 text-[12px] font-medium transition-colors duration-150',
                preference === 'dark'
                  ? 'bg-acid text-void'
                  : 'bg-[rgb(var(--tint-rgb)/0.05)] text-paper hover:bg-[rgb(var(--tint-rgb)/0.08)]',
              )}
            >
              <Moon size={13} strokeWidth={2} />
              {t('theme.dark')}
            </button>
          </div>
        </div>

        {/* Background Section */}
        <div>
          <p className="mb-2.5 text-[11px] font-medium uppercase tracking-[0.08em] text-ash">Background</p>
          <div role="radiogroup" aria-label="Background style" className="grid grid-cols-2 gap-2">
            {BG_OPTIONS.map(({ id, label, hint, icon: Icon }) => (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={bgStyle === id}
                onClick={() => setBgStyle(id)}
                className={cn(
                  'bg-style-card flex flex-col items-start gap-2 rounded-[12px] p-3 text-start transition-[background-color,box-shadow] duration-150',
                  bgStyle === id
                    ? 'bg-[color-mix(in_oklab,var(--color-acid)_10%,transparent)] shadow-[inset_0_0_0_1.5px_var(--color-acid)]'
                    : 'bg-[rgb(var(--tint-rgb)/0.03)] shadow-[inset_0_0_0_1px_var(--color-graphite)] hover:bg-[rgb(var(--tint-rgb)/0.06)]',
                )}
              >
                <span
                  className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-[9px]',
                    bgStyle === id ? 'bg-acid text-[#08090a]' : 'bg-[rgb(var(--tint-rgb)/0.06)] text-fog',
                  )}
                >
                  <Icon size={15} strokeWidth={1.8} aria-hidden />
                </span>
                <span>
                  <span className="block text-[13px] font-medium text-paper">{label}</span>
                  <span className="mt-0.5 block text-[11.5px] leading-[1.4] text-ash">{hint}</span>
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Language Section */}
        <div>
          <p className="mb-2.5 text-[11px] font-medium uppercase tracking-[0.08em] text-ash">
            {t('settings.language')}
          </p>
          <Select value={language} onChange={(e) => setLanguage(e.target.value as Language)} className="w-full">
            <option value="en">English</option>
            <option value="ar">العربية (Arabic)</option>
          </Select>
        </div>

        {/* Profile Section */}
        {user ? (
          <div>
            <p className="mb-2.5 text-[11px] font-medium uppercase tracking-[0.08em] text-ash">
              {t('settings.profile')}
            </p>
            <div className="rounded-[8px] bg-[rgb(var(--tint-rgb)/0.02)] p-3 shadow-[inset_0_0_0_1px_var(--color-graphite)]">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#e4f222] to-[#9db300] text-[13px] font-semibold text-[#08090a]">
                  {user.email?.[0]?.toUpperCase() ?? '?'}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] text-paper">{user.user_metadata?.name || user.email || 'User'}</p>
                  <p className="mt-0.5 truncate text-[11px] text-ash">{user.email}</p>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {/* Storage Section */}
        <div>
          <p className="mb-2.5 text-[11px] font-medium uppercase tracking-[0.08em] text-ash">
            {t('settings.storage')}
          </p>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[11.5px]">
              <span className="text-paper">{formatBytes(storageUsed)}</span>
              <span className="text-ash">{formatBytes(storageLimitBytes)}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-[rgb(var(--tint-rgb)/0.1)]">
              <div
                className={cn(
                  'h-full transition-all duration-300',
                  storagePercent > 80 ? 'bg-coral' : storagePercent > 50 ? 'bg-amber-500' : 'bg-acid',
                )}
                style={{ width: `${storagePercent}%` }}
              />
            </div>
            <p className="text-[10.5px] text-ash">{storagePercent}% used</p>
          </div>
        </div>

        {/* Contact Section — a single link out to Instagram */}
        <div className="border-t border-graphite pt-4">
          <p className="mb-2.5 text-[11px] font-medium uppercase tracking-[0.08em] text-ash">
            {t('settings.contact')}
          </p>
          <a
            href={INSTAGRAM_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              'flex items-center gap-3 rounded-[8px] bg-[rgb(var(--tint-rgb)/0.02)] p-3 shadow-[inset_0_0_0_1px_var(--color-graphite)] transition-colors duration-150 hover:bg-[rgb(var(--tint-rgb)/0.05)] hover:shadow-[inset_0_0_0_1px_var(--color-smoke)]',
            )}
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[9px] bg-gradient-to-br from-[#f58529] via-[#dd2a7b] to-[#8134af] text-white">
              <Instagram size={17} strokeWidth={1.8} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] text-paper">{t('contact.instagram')}</span>
              <span className="block truncate text-[11.5px] text-ash">@heyfouad</span>
            </span>
          </a>
        </div>
      </div>
    </Modal>
  );
}
