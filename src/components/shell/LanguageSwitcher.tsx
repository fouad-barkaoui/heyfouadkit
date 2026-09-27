import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { Globe } from 'lucide-react';
import { useLanguage, type Language } from '@/state/languageStore';

export function LanguageSwitcher(): JSX.Element {
  const { language, setLanguage } = useLanguage();

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          className="btn-icon"
          aria-label="Change language"
          title="Language"
        >
          <Globe size={16} strokeWidth={1.7} />
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className="z-40 min-w-[180px] rounded-[8px] bg-void/95 backdrop-blur-md shadow-[0_4px_12px_rgba(0,0,0,0.3)] border border-graphite py-1"
          align="end"
          sideOffset={8}
        >
          {(['en', 'ar'] as Language[]).map((lang) => (
            <DropdownMenu.Item
              key={lang}
              onClick={() => setLanguage(lang)}
              className={`px-3 py-1.5 text-[12px] cursor-pointer transition-colors duration-150 ${
                language === lang
                  ? 'bg-acid/10 text-acid'
                  : 'text-paper hover:bg-[rgb(var(--tint-rgb)/0.05)]'
              }`}
            >
              {lang === 'en' ? '🇬🇧 English' : '🇸🇦 العربية'}
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
