import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  Minus,
  Plus,
  Search,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { IconButton } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

interface TextMatch {
  page: number;
  snippet: string;
}

/**
 * Inline PDF viewer built directly on pdf.js — page navigation, zoom, and a
 * full-text search that reports which pages a term lands on.
 */
export function PdfViewer({ src, className }: { src: string; className?: string }): JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const docRef = useRef<{ numPages: number; getPage: (n: number) => Promise<unknown> } | null>(null);
  const renderTask = useRef<{ cancel: () => void } | null>(null);

  const [pages, setPages] = useState(0);
  const [page, setPage] = useState(1);
  const [scale, setScale] = useState(1.25);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [matches, setMatches] = useState<TextMatch[] | null>(null);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setMatches(null);
    setPage(1);

    void (async () => {
      try {
        const pdfjs = await import('pdfjs-dist');
        const worker = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
        pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
        const task = pdfjs.getDocument(src);
        const doc = await task.promise;
        if (cancelled) return;
        docRef.current = doc as unknown as { numPages: number; getPage: (n: number) => Promise<unknown> };
        setPages(doc.numPages);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'This PDF could not be opened.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      docRef.current = null;
    };
  }, [src]);

  const renderPage = useCallback(async () => {
    const doc = docRef.current;
    const canvas = canvasRef.current;
    if (!doc || !canvas) return;
    try {
      renderTask.current?.cancel();
      const pdfPage = (await doc.getPage(page)) as {
        getViewport: (o: { scale: number }) => { width: number; height: number };
        render: (o: unknown) => { promise: Promise<void>; cancel: () => void };
      };
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const viewport = pdfPage.getViewport({ scale: scale * dpr });
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      canvas.style.width = `${viewport.width / dpr}px`;
      canvas.style.height = `${viewport.height / dpr}px`;
      const task = pdfPage.render({ canvasContext: ctx, viewport });
      renderTask.current = task;
      await task.promise;
    } catch {
      /* a cancelled render is expected while paging quickly */
    }
  }, [page, scale]);

  useEffect(() => {
    void renderPage();
  }, [renderPage, pages]);

  const runSearch = async (): Promise<void> => {
    const doc = docRef.current;
    const term = query.trim().toLowerCase();
    if (!doc || !term) {
      setMatches(null);
      return;
    }
    setSearching(true);
    const found: TextMatch[] = [];
    for (let p = 1; p <= doc.numPages; p += 1) {
      const pdfPage = (await doc.getPage(p)) as {
        getTextContent: () => Promise<{ items: { str?: string }[] }>;
      };
      const content = await pdfPage.getTextContent();
      const text = content.items.map((i) => i.str ?? '').join(' ');
      const at = text.toLowerCase().indexOf(term);
      if (at !== -1) {
        found.push({ page: p, snippet: `…${text.slice(Math.max(0, at - 40), at + 60).trim()}…` });
      }
    }
    setMatches(found);
    setSearching(false);
    if (found[0]) setPage(found[0].page);
  };

  return (
    <div className={cn('flex min-h-0 flex-col', className)}>
      <div className="no-print mb-3 flex flex-wrap items-center gap-2 rounded-[6px] bg-[rgb(var(--tint-rgb)/0.02)] px-2 py-1.5 shadow-[inset_0_0_0_1px_var(--color-graphite)]">
        <IconButton label="Previous page" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
          <ChevronLeft size={15} strokeWidth={1.8} />
        </IconButton>
        <span className="mono num min-w-[68px] text-center text-[11.5px] text-mist">
          {pages ? `${page} / ${pages}` : '—'}
        </span>
        <IconButton
          label="Next page"
          disabled={page >= pages}
          onClick={() => setPage((p) => Math.min(pages, p + 1))}
        >
          <ChevronRight size={15} strokeWidth={1.8} />
        </IconButton>

        <span className="mx-1 h-4 w-px bg-graphite" aria-hidden />

        <IconButton label="Zoom out" onClick={() => setScale((s) => Math.max(0.5, +(s - 0.25).toFixed(2)))}>
          <Minus size={14} strokeWidth={1.9} />
        </IconButton>
        <span className="mono num min-w-[42px] text-center text-[11.5px] text-mist">
          {Math.round(scale * 100)}%
        </span>
        <IconButton label="Zoom in" onClick={() => setScale((s) => Math.min(3, +(s + 0.25).toFixed(2)))}>
          <Plus size={14} strokeWidth={1.9} />
        </IconButton>

        <span className="mx-1 h-4 w-px bg-graphite" aria-hidden />

        <div className="relative min-w-[150px] flex-1">
          <Search
            size={13}
            strokeWidth={1.7}
            className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-ash"
            aria-hidden
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void runSearch();
            }}
            placeholder="Find in document…"
            aria-label="Find in document"
            className="field py-[5px] pl-7 pr-7 text-[12.5px]"
          />
          {query ? (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => {
                setQuery('');
                setMatches(null);
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-ash hover:text-mist"
            >
              <X size={12} strokeWidth={2} />
            </button>
          ) : null}
        </div>
        {searching ? <Loader2 size={14} className="animate-spin text-ash" aria-hidden /> : null}
      </div>

      {matches ? (
        <div className="no-print mb-3 rounded-[6px] bg-[rgb(var(--tint-rgb)/0.02)] p-2 shadow-[inset_0_0_0_1px_var(--color-graphite)]">
          {matches.length === 0 ? (
            <p className="px-1 py-1 text-[12px] text-ash">No match for “{query}”.</p>
          ) : (
            <>
              <p className="px-1 pb-1.5 text-[11px] uppercase tracking-[0.07em] text-ash">
                {matches.length} page{matches.length === 1 ? '' : 's'} matched
              </p>
              <div className="scroll-y max-h-[130px]">
                {matches.map((m) => (
                  <button
                    key={m.page}
                    type="button"
                    onClick={() => setPage(m.page)}
                    className={cn(
                      'flex w-full gap-2 rounded-[5px] px-2 py-1.5 text-left text-[12px] transition-colors',
                      m.page === page ? 'bg-obsidian text-mist' : 'text-ash hover:bg-[rgb(var(--tint-rgb)/0.03)]',
                    )}
                  >
                    <span className="mono shrink-0 text-[11px] text-accent">p{m.page}</span>
                    <span className="truncate">{m.snippet}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      ) : null}

      <div className="scroll-y min-h-0 flex-1 rounded-[8px] bg-obsidian p-4 shadow-[inset_0_0_0_1px_var(--color-graphite)]">
        {loading ? (
          <div className="flex h-[320px] items-center justify-center gap-2 text-[13px] text-ash">
            <Loader2 size={15} className="animate-spin" aria-hidden />
            Opening document…
          </div>
        ) : error ? (
          <div className="flex h-[320px] items-center justify-center px-6 text-center text-[13px] text-coral">
            {error}
          </div>
        ) : (
          <div className="flex justify-center">
            <canvas ref={canvasRef} className="max-w-full rounded-[4px] shadow-[0_4px_32px_rgba(8,9,10,0.6)]" />
          </div>
        )}
      </div>
    </div>
  );
}
