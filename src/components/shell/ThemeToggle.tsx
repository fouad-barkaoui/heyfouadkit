import * as Tooltip from '@radix-ui/react-tooltip';
import { Moon, Sun } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme, type ThemePreference } from '@/state/themeStore';

const OPTIONS: { id: ThemePreference; label: string; icon: typeof Sun }[] = [
  { id: 'light', label: 'Light', icon: Sun },
  { id: 'dark', label: 'Dark', icon: Moon },
];

const CYCLE: Record<ThemePreference, ThemePreference> = { light: 'dark', dark: 'light' };

/**
 * Light / dark / system, available everywhere the rail is — desktop and the
 * mobile drawer alike, since both render this same component.
 */
export function ThemeToggle({ expanded }: { expanded: boolean }): JSX.Element {
  const { preference, setPreference } = useTheme();

  if (!expanded) {
    const Icon = OPTIONS.find((o) => o.id === preference)?.icon ?? Sun;
    return (
      <Tooltip.Root delayDuration={250}>
        <Tooltip.Trigger asChild>
          <button
            type="button"
            onClick={() => setPreference(CYCLE[preference])}
            aria-label={`Theme: ${preference}. Click to change.`}
            className="nav-row is-compact"
          >
            <Icon size={15} strokeWidth={1.6} aria-hidden />
          </button>
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content
            side="right"
            sideOffset={10}
            className="z-50 rounded-[6px] bg-obsidian px-2 py-1 text-[12px] text-mist shadow-[inset_0_0_0_1px_var(--color-graphite),0_2px_4px_rgba(0,0,0,0.4)]"
          >
            Theme: {preference}
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    );
  }

  return (
    <div
      role="group"
      aria-label="Theme"
      className="mb-2 flex gap-1 rounded-[7px] bg-[rgb(var(--tint-rgb)/0.03)] p-[3px] shadow-[inset_0_0_0_1px_var(--color-graphite)]"
    >
      {OPTIONS.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          type="button"
          onClick={() => setPreference(id)}
          aria-pressed={preference === id}
          aria-label={`${label} theme`}
          title={label}
          className={cn(
            'flex flex-1 items-center justify-center gap-1.5 rounded-[5px] py-[6px] text-[11.5px] transition-colors duration-150',
            preference === id
              ? 'bg-obsidian text-paper shadow-[inset_0_0_0_1px_rgb(var(--tint-rgb)/0.06)]'
              : 'text-ash hover:text-mist',
          )}
        >
          <Icon size={13} strokeWidth={1.7} aria-hidden />
        </button>
      ))}
    </div>
  );
}
