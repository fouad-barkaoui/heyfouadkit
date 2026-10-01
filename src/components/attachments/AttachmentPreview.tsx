import { Download, FileText, Loader2 } from 'lucide-react';
import { lazy, Suspense, useEffect, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { attachmentKind } from '@/data/attachments';
import type { Attachment } from '@/lib/types';
import { fmtBytes, fmtDateTime, useI18n } from '@/components/ui/useI18n';
import { useAttachmentUrl } from './useAttachmentUrl';

const PdfViewer = lazy(async () => ({
  default: (await import('@/modules/articles/PdfViewer')).PdfViewer,
}));

function TextPreview({ url }: { url: string }): JSX.Element {
  const [text, setText] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const { t } = useI18n();

  useEffect(() => {
    let cancelled = false;
    void fetch(url)
      .then((r) => r.text())
      .then((body) => {
        if (!cancelled) setText(body.slice(0, 200_000));
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [url]);

  if (failed) return <p className="py-8 text-center text-[13px] text-ash">{t('sh.files.unreadable')}</p>;
  if (text === null) {
    return (
      <div className="flex items-center justify-center gap-2 py-10 text-[13px] text-ash">
        <Loader2 size={15} className="animate-spin" aria-hidden />
        {t('sh.files.reading')}
      </div>
    );
  }
  return (
    <pre className="mono scroll-y max-h-[60vh] whitespace-pre-wrap rounded-[8px] bg-obsidian p-4 text-[12px] leading-[1.6] text-mist shadow-[inset_0_0_0_1px_var(--color-graphite)]">
      {text}
    </pre>
  );
}

/** Full-size look at one attached file, inline — never a forced download. */
export function AttachmentPreview({
  attachment,
  onOpenChange,
}: {
  attachment: Attachment | null;
  onOpenChange: (open: boolean) => void;
}): JSX.Element | null {
  const { url, loading } = useAttachmentUrl(attachment);
  const { t, locale } = useI18n();
  if (!attachment) return null;

  const kind = attachmentKind(attachment);

  return (
    <Modal
      open
      onOpenChange={onOpenChange}
      title={attachment.name}
      description={t(attachment.storagePath ? 'sh.files.metaCloud' : 'sh.files.metaDevice', {
        size: fmtBytes(attachment.size, t),
        date: fmtDateTime(attachment.createdAt, locale),
      })}
      width="xl"
      footer={
        <>
          <Button onClick={() => onOpenChange(false)}>{t('sh.close')}</Button>
          {url ? (
            <a href={url} download={attachment.name} className="btn btn-primary" target="_blank" rel="noreferrer">
              <Download size={13.5} strokeWidth={1.9} aria-hidden />
              {t('sh.files.download')}
            </a>
          ) : null}
        </>
      }
    >
      {loading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-[13px] text-ash">
          <Loader2 size={15} className="animate-spin" aria-hidden />
          {t('sh.files.loading')}
        </div>
      ) : !url ? (
        <p className="py-16 text-center text-[13px] text-ash">
          {t('sh.files.unreachable')}
        </p>
      ) : kind === 'image' ? (
        <img
          src={url}
          alt={attachment.name}
          className="mx-auto max-h-[64vh] rounded-[8px] object-contain shadow-[0_4px_32px_rgba(8,9,10,0.6)]"
        />
      ) : kind === 'pdf' ? (
        <Suspense
          fallback={
            <div className="flex items-center justify-center gap-2 py-16 text-[13px] text-ash">
              <Loader2 size={15} className="animate-spin" aria-hidden />
              {t('sh.files.openingViewer')}
            </div>
          }
        >
          <PdfViewer src={url} className="min-h-[54vh]" />
        </Suspense>
      ) : kind === 'text' ? (
        <TextPreview url={url} />
      ) : (
        <div className="flex flex-col items-center gap-3 py-14 text-center">
          <FileText size={26} strokeWidth={1.5} className="text-ash" aria-hidden />
          <p className="text-[13px] text-mist">{t('sh.files.noPreview')}</p>
          <p className="text-[12px] text-ash">{attachment.mimeType || t('sh.files.unknownType')}</p>
        </div>
      )}
    </Modal>
  );
}
