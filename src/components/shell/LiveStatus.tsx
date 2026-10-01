import { useI18n } from '@/components/ui/useI18n';
import { useAuth } from '@/state/authStore';

/**
 * "Live · signed in" with a blinking dot, shown in the sidebar while an
 * account is signed in. Collapsed rails get the dot alone.
 */
export function LiveStatus({ expanded = true }: { expanded?: boolean }): JSX.Element | null {
  const { user } = useAuth();
  const { t } = useI18n();
  if (!user) return null;
  return (
    <div className="live-status" data-compact={!expanded || undefined} role="status" title={t('sh.liveSignedIn')}>
      <span className="live-status-dot" aria-hidden />
      {expanded ? <span>{t('sh.liveSignedIn')}</span> : <span className="sr-only">{t('sh.liveSignedIn')}</span>}
    </div>
  );
}
