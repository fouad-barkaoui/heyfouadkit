import { useI18n } from '@/components/ui/useI18n';

/** Centred spinner shown while the workspace or a page is loading. */
export function CircularLoader({ title, subtitle }: { title?: string; subtitle?: string }): JSX.Element {
  const { t } = useI18n();
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-10" role="status" aria-live="polite">
      <span className="loader-ring" aria-hidden />
      {title ? <p className="text-[14px] font-medium text-paper">{title}</p> : null}
      {subtitle ? <p className="text-[12.5px] text-ash">{subtitle}</p> : null}
      <span className="sr-only">{t('sh.loading')}</span>
    </div>
  );
}
