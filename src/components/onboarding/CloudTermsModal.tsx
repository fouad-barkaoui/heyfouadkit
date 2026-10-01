import { HardDrive, Lock, RefreshCw, ShieldCheck } from 'lucide-react';
import { MAX_CLOUD_BYTES, MAX_TOTAL_CLOUD_BYTES, humanLimit } from '@/data/attachments';
import { useLanguage } from '@/state/languageStore';
import { ConsentSheet } from './ConsentSheet';

const RULES: { icon: typeof Lock; key: string }[] = [
  { icon: ShieldCheck, key: 'private' },
  { icon: HardDrive, key: 'storage' },
  { icon: RefreshCw, key: 'control' },
];

/**
 * Asked once per account, for life — the answer (accept or decline) is
 * stored on the account, so no device ever asks again.
 */
export function CloudTermsModal({
  open,
  onAccept,
  onCancel,
}: {
  open: boolean;
  onAccept: () => void;
  onCancel: () => void;
}): JSX.Element {
  const { t } = useLanguage();
  const limits = { total: humanLimit(MAX_TOTAL_CLOUD_BYTES), each: humanLimit(MAX_CLOUD_BYTES) };
  return (
    <ConsentSheet
      open={open}
      tone="green"
      partner={t('ob.cloud.partner')}
      title={t('ob.cloud.title')}
      body={
        <p>{t('ob.cloud.body')}</p>
      }
      boxIcon={Lock}
      box={(link) => (
        <p>
          {t('ob.cloud.boxBefore')}
          {link(t('ob.cloud.boxLink'))}
          {t('ob.cloud.boxAfter', limits)}
        </p>
      )}
      details={
        <ul className="space-y-2.5">
          {RULES.map(({ icon: Icon, key }) => (
            <li key={key} className="flex items-start gap-2.5">
              <Icon size={14} strokeWidth={1.9} className="mt-[2px] shrink-0 text-[#1d1c1a]" aria-hidden />
              <span>
                <span className="block font-medium text-[#1d1c1a]">{t(`ob.cloud.rule.${key}.title`, limits)}</span>
                <span className="block text-[#6b6a66]">{t(`ob.cloud.rule.${key}.body`, limits)}</span>
              </span>
            </li>
          ))}
        </ul>
      }
      acceptLabel={t('ob.cloud.accept')}
      cancelLabel={t('ob.decline')}
      onAccept={onAccept}
      onCancel={onCancel}
    />
  );
}
