import { useEffect, useState } from 'react';
import { resolveAttachmentUrl } from '@/data/attachments';
import type { Attachment } from '@/lib/types';

/**
 * A local attachment resolves instantly to its data URL; a stored one needs a
 * signed URL, which is fetched once and cached until it nears expiry.
 */
export function useAttachmentUrl(attachment: Attachment | null): {
  url: string | null;
  loading: boolean;
} {
  const [url, setUrl] = useState<string | null>(attachment?.dataUrl ?? null);
  const [loading, setLoading] = useState(Boolean(attachment && !attachment.dataUrl));

  useEffect(() => {
    if (!attachment) {
      setUrl(null);
      setLoading(false);
      return;
    }
    if (attachment.dataUrl) {
      setUrl(attachment.dataUrl);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    void resolveAttachmentUrl(attachment)
      .then((resolved) => {
        if (!cancelled) setUrl(resolved);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [attachment]);

  return { url, loading };
}
