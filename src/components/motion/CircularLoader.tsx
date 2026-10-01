import type { CSSProperties } from 'react';
import {
  BookMarked,
  CalendarDays,
  FileText,
  ListChecks,
  Newspaper,
  NotebookPen,
  Pill,
  type LucideIcon,
} from 'lucide-react';
import { MARK_SRC } from '@/components/ui/BrandMark';
import { useI18n } from '@/components/ui/useI18n';

/** Icons orbiting the mark — a cross-section of the app's own modules, not
 * generic decoration, so the loader still reads as "this app" mid-spin. */
const ORBIT_ICONS: { icon: LucideIcon; color: string }[] = [
  { icon: ListChecks, color: '#e4f222' },
  { icon: NotebookPen, color: '#8b5cf6' },
  { icon: Newspaper, color: '#02b8cc' },
  { icon: CalendarDays, color: '#eb5757' },
  { icon: Pill, color: '#27a644' },
  { icon: FileText, color: '#6366f1' },
  { icon: BookMarked, color: '#f2a922' },
];


/**
 * Centered, circularly-animated loading mark shown while a page/module is
 * settling — a ring of app icons orbits a fixed center mark. Each icon
 * counter-rotates in lockstep with the ring so it stays upright while it
 * travels, and the ring fades each icon in on its own beat as it mounts.
 */
export function CircularLoader({
  title,
  subtitle,
  size = 132,
}: {
  title?: string;
  subtitle?: string;
  size?: number;
}): JSX.Element {
  const radius = size * 0.42;
  const count = ORBIT_ICONS.length;
  const { t } = useI18n();

  return (
    <div className="flex flex-col items-center justify-center gap-4 px-6 py-10" role="status" aria-live="polite">
      <div className="nx-orbit-spin relative shrink-0" style={{ width: size, height: size }}>
        {ORBIT_ICONS.map(({ icon: Icon, color }, i) => {
          const deg = (360 / count) * i;
          const pivotStyle = {
            '--nx-orbit-deg': `${deg}deg`,
            '--nx-orbit-delay': `${i * 0.16}s`,
            transform: `translate(-50%, -50%) rotate(${deg}deg) translateX(${radius}px)`,
          } as CSSProperties;

          return (
            <div
              key={i}
              className="nx-orbit-item absolute left-1/2 top-1/2 h-7 w-7 opacity-0"
              style={pivotStyle}
            >
              <div className="nx-orbit-icon flex h-full w-full items-center justify-center rounded-[9px] bg-carbon shadow-[inset_0_0_0_1px_var(--color-graphite),0_2px_10px_rgba(8,9,10,0.5)]">
                <Icon size={13} strokeWidth={1.9} color={color} aria-hidden />
              </div>
            </div>
          );
        })}

        <span
          className="absolute left-1/2 top-1/2 flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center overflow-hidden rounded-full bg-[#0b0c10] shadow-[0_0_0_2px_rgba(228,242,34,0.55),0_2px_18px_rgba(228,242,34,0.3)]"
          aria-hidden
        >
          <img src={MARK_SRC} alt="" width={48} height={48} className="h-full w-full object-cover" />
        </span>
      </div>

      {title ? <p className="text-[14px] font-medium tracking-[-0.012em] text-paper">{title}</p> : null}
      {subtitle ? <p className="text-[12.5px] text-ash">{subtitle}</p> : null}
      <span className="sr-only">{t('sh.loading')}</span>
    </div>
  );
}
