import { Printer } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import type { Article } from '@/lib/types';
import { formatDate, sanitizeHtml, wordCount } from '@/lib/utils';

/**
 * A4 print engine. The preview shows the real print stylesheet's geometry
 * (210×297mm at 18/16mm margins); `window.print()` then renders `#print-root`
 * alone, everything else being hidden by the `@media print` rules.
 */
export function PrintSheet({
  open,
  onOpenChange,
  article,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  article: Article | null;
}): JSX.Element | null {
  if (!article) return null;

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Print preview"
      description="A4 · portrait · 18mm top-bottom, 16mm side margins"
      width="lg"
      footer={
        <>
          <Button onClick={() => onOpenChange(false)}>Close</Button>
          <Button variant="primary" icon={<Printer size={14} strokeWidth={1.9} />} onClick={() => window.print()}>
            Print
          </Button>
        </>
      }
    >
      <div className="flex justify-center">
        <div
          id="print-root"
          className="w-full max-w-[560px] rounded-[4px] bg-white px-[38px] py-[42px] text-[#111] shadow-[0_4px_32px_rgba(0,0,0,0.5)]"
          style={{ aspectRatio: '210 / 297', overflow: 'hidden' }}
        >
          <p className="print-meta text-[10px] uppercase tracking-[0.12em] text-[#666]">
            {article.kind === 'written' ? 'Article' : article.kind === 'pdf' ? 'PDF record' : 'Image record'}
          </p>
          <h1 className="mt-2 text-[21px] font-semibold leading-[1.2] tracking-[-0.02em] text-black">
            {article.title}
          </h1>
          <div className="print-rule mt-3 border-t border-[#ddd] pt-2">
            <p className="print-meta text-[10.5px] text-[#555]">
              {formatDate(article.createdAt)} · {wordCount(article.content)} words
              {article.fileName ? ` · ${article.fileName}` : ''}
            </p>
          </div>

          {article.tags.length > 0 ? (
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {article.tags.map((tag) => (
                <span
                  key={tag}
                  className="print-badge rounded-[3px] border border-[#bbb] px-1.5 py-[1px] text-[9px] text-[#444]"
                >
                  {tag}
                </span>
              ))}
            </div>
          ) : null}

          {article.kind === 'image' && article.fileUrl ? (
            <img src={article.fileUrl} alt="" className="mt-4 max-h-[300px] w-full rounded-[3px] object-contain" />
          ) : null}

          <div
            className="prose-print mt-4 text-[11.5px] leading-[1.6] text-[#222]"
            // eslint-disable-next-line react/no-danger
            dangerouslySetInnerHTML={{
              __html:
                sanitizeHtml(article.content) ||
                '<p style="color:#888">No written content on this record.</p>',
            }}
          />
        </div>
      </div>
    </Modal>
  );
}
