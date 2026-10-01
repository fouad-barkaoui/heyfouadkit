import { ArrowUpRight, Facebook, Github, Instagram, Linkedin } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Field';
import { useLanguage, type Language } from '@/state/languageStore';
import { useUI } from '@/state/uiStore';

interface SettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SettingsModal({ open, onOpenChange }: SettingsModalProps): JSX.Element {
  const { language, setLanguage, t } = useLanguage();
  const { setModule } = useUI();

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={t('settings.title')}
      footer={<Button onClick={() => onOpenChange(false)}>Close</Button>}
    >
      <div className="space-y-6">
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

        {/* Contact — the full page (form, socials, inbox) lives on its own screen. */}
        <div className="border-t border-graphite pt-4">
          <p className="mb-2.5 text-[11px] font-medium uppercase tracking-[0.08em] text-ash">
            {t('settings.contact')}
          </p>
          <button
            type="button"
            onClick={() => {
              onOpenChange(false);
              setModule('contact');
            }}
            className="flex w-full items-center gap-3 rounded-[8px] bg-[rgb(var(--tint-rgb)/0.02)] p-3 text-start shadow-[inset_0_0_0_1px_var(--color-graphite)] transition-colors duration-150 hover:bg-[rgb(var(--tint-rgb)/0.05)] hover:shadow-[inset_0_0_0_1px_var(--color-smoke)]"
          >
            <span className="flex -space-x-1.5" aria-hidden>
              {[
                { Icon: Instagram, bg: 'linear-gradient(135deg,#f58529,#dd2a7b,#8134af)' },
                { Icon: Github, bg: 'linear-gradient(135deg,#3a3f4b,#16181d)' },
                { Icon: Linkedin, bg: 'linear-gradient(135deg,#0a66c2,#004182)' },
                { Icon: Facebook, bg: 'linear-gradient(135deg,#1877f2,#0b4fb3)' },
              ].map(({ Icon, bg }, i) => (
                <span
                  key={i}
                  className="flex h-7 w-7 items-center justify-center rounded-full text-white shadow-[0_0_0_2px_var(--color-carbon)]"
                  style={{ background: bg }}
                >
                  <Icon size={13} strokeWidth={1.9} />
                </span>
              ))}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] text-paper">{t('contact.open')}</span>
              <span className="block truncate text-[11.5px] text-ash">{t('contact.openHint')}</span>
            </span>
            <ArrowUpRight size={15} strokeWidth={1.8} className="shrink-0 text-ash rtl:-scale-x-100" aria-hidden />
          </button>
        </div>
      </div>
    </Modal>
  );
}
