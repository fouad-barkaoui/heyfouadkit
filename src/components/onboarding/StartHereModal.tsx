import { Newspaper } from 'lucide-react';
import { useLanguage } from '@/state/languageStore';
import { ConsentSheet } from './ConsentSheet';

/**
 * Shown once before anything else: points newcomers to News, where the
 * founder explains what Kanz is for and what every tool does.
 */
export function StartHereModal({
  open,
  onOpen,
  onLater,
}: {
  open: boolean;
  onOpen: () => void;
  onLater: () => void;
}): JSX.Element {
  const { t } = useLanguage();
  return (
    <ConsentSheet
      open={open}
      tone="green"
      partner={t('nf.start.kicker')}
      title={t('nf.start.title')}
      body={<p>{t('nf.start.body')}</p>}
      boxIcon={Newspaper}
      box={() => <p>{t('nf.start.where')}</p>}
      acceptLabel={t('nf.start.go')}
      cancelLabel={t('nf.start.later')}
      onAccept={onOpen}
      onCancel={onLater}
    />
  );
}
