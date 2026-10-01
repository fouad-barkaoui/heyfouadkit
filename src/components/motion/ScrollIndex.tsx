import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { ArrowUp, Check, ChevronDown } from 'lucide-react';
import { forwardRef, useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { useI18n } from '@/components/ui/useI18n';
import { cn } from '@/lib/utils';

interface Heading {
  el: HTMLElement;
  text: string;
  level: number;
  /** position as a fraction of the scrollable length */
  at: number;
}

const RING_R = 8.5;
const RING_C = 2 * Math.PI * RING_R;

function topWithin(el: HTMLElement, root: HTMLElement): number {
  return el.getBoundingClientRect().top - root.getBoundingClientRect().top + root.scrollTop;
}

/**
 * Floating reading-progress pill: a ring that fills as you scroll, an
 * "Index" dropdown listing every heading in the pane (the current one is
 * marked and each shows where it sits), and a live percentage. It rises in
 * once you start scrolling and tucks away again at the top.
 */
export function ScrollIndex(): JSX.Element {
  // Drop this as the first child of any scrolling pane — it tracks its parent.
  const anchor = useRef<HTMLDivElement>(null);
  const target = useRef<HTMLElement | null>(null);
  useLayoutEffect(() => {
    target.current = anchor.current?.parentElement ?? null;
  }, []);
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const [scrollable, setScrollable] = useState(false);
  const [headings, setHeadings] = useState<Heading[]>([]);
  const [active, setActive] = useState(-1);
  const [open, setOpen] = useState(false);
  const { t } = useI18n();
  const frame = useRef(0);
  const headingsRef = useRef<Heading[]>([]);

  const collect = useCallback(() => {
    const root = target.current;
    if (!root) return;
    const max = Math.max(1, root.scrollHeight - root.clientHeight);
    const list: Heading[] = [];
    root.querySelectorAll<HTMLElement>('h1, h2, h3, [data-index-heading]').forEach((el) => {
      if (el.closest('[data-scroll-index-ignore]')) return;
      const text = (el.dataset.indexHeading || el.textContent || '').trim();
      if (!text || el.offsetParent === null) return;
      const level = el.tagName === 'H1' ? 1 : el.tagName === 'H3' ? 3 : 2;
      list.push({ el, text: text.length > 64 ? `${text.slice(0, 62)}…` : text, level, at: Math.min(1, topWithin(el, root) / max) });
    });
    headingsRef.current = list;
    setHeadings(list);
  }, [target]);

  const update = useCallback(() => {
    frame.current = 0;
    const root = target.current;
    if (!root) return;
    const max = root.scrollHeight - root.clientHeight;
    const canScroll = max > 64;
    const p = canScroll ? Math.min(1, Math.max(0, root.scrollTop / max)) : 0;
    setScrollable(canScroll);
    setProgress(p);
    setVisible(canScroll && root.scrollTop > 40);
    root.classList.toggle('is-scrolled', root.scrollTop > 6);
    // current section = last heading that has reached the top band
    const line = root.scrollTop + 96;
    let idx = -1;
    headingsRef.current.forEach((h, i) => {
      if (topWithin(h.el, root) <= line) idx = i;
    });
    setActive(idx);
  }, [target]);

  const schedule = useCallback(() => {
    if (!frame.current) frame.current = requestAnimationFrame(update);
  }, [update]);

  useEffect(() => {
    const root = target.current;
    if (!root) return;
    root.addEventListener('scroll', schedule, { passive: true });
    let debounce = 0;
    const refresh = (): void => {
      window.clearTimeout(debounce);
      debounce = window.setTimeout(() => {
        collect();
        schedule();
      }, 180);
    };
    const mo = new MutationObserver((records) => {
      // the pill's own text changes on every scroll — don't let it wake us
      if (records.every((m) => (m.target as Element).parentElement?.closest?.('[data-scroll-index-ignore]') || (m.target as Element).closest?.('[data-scroll-index-ignore]'))) return;
      refresh();
    });
    mo.observe(root, { childList: true, subtree: true, characterData: true });
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(refresh) : null;
    ro?.observe(root);
    if (root.firstElementChild) ro?.observe(root.firstElementChild);
    collect();
    update();
    return () => {
      root.removeEventListener('scroll', schedule);
      mo.disconnect();
      ro?.disconnect();
      window.clearTimeout(debounce);
      if (frame.current) cancelAnimationFrame(frame.current);
      root.classList.remove('is-scrolled');
    };
  }, [target, collect, update, schedule]);

  const jump = (top: number): void => {
    // wait for the menu to close so nothing competes with the smooth scroll
    window.setTimeout(() => target.current?.scrollTo({ top: Math.max(0, top), behavior: 'smooth' }), 30);
  };

  const pct = Math.round(progress * 100);
  const done = pct >= 100;

  return (
    <div ref={anchor} className="scroll-index-anchor" data-scroll-index-ignore>
      {scrollable ? (
    <div
      className="scroll-index"
      data-visible={visible || open}
      data-done={done}
      role="navigation"
      aria-label={t('sh.index.progress')}
    >
      <svg className="scroll-index-ring" viewBox="0 0 22 22" width={22} height={22} aria-hidden>
        <circle cx="11" cy="11" r={RING_R} className="scroll-index-ring-track" />
        <circle
          cx="11"
          cy="11"
          r={RING_R}
          className="scroll-index-ring-fill"
          strokeDasharray={RING_C}
          strokeDashoffset={RING_C * (1 - progress)}
        />
        {done ? <path d="M7.4 11.2l2.4 2.4 4.8-5" className="scroll-index-ring-check" /> : null}
      </svg>

      <DropdownMenu.Root open={open} onOpenChange={setOpen}>
        <DropdownMenu.Trigger asChild>
          <IndexTrigger open={open} label={t('sh.index.page')}>
            <span className="scroll-index-label">
              {active >= 0 && headings[active] ? (
                <span key={active} className="scroll-index-current">
                  {headings[active].text}
                </span>
              ) : (
                t('sh.index.title')
              )}
            </span>
          </IndexTrigger>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content
            align="center"
            sideOffset={10}
            collisionPadding={12}
            onCloseAutoFocus={(e) => e.preventDefault()}
            className="scroll-index-menu z-[60]"
          >
            <p className="px-2.5 pb-1.5 pt-1 text-[10.5px] font-medium uppercase tracking-[0.08em] text-ash">{t('sh.index.title')}</p>
            <DropdownMenu.Item className="scroll-index-item" onSelect={() => jump(0)}>
              <ArrowUp size={13} strokeWidth={2} className="shrink-0 text-ash" aria-hidden />
              <span className="min-w-0 flex-1 truncate">{t('sh.index.top')}</span>
            </DropdownMenu.Item>
            {headings.length === 0 ? (
              <p className="px-2.5 py-2 text-[12px] text-ash">{t('sh.index.empty')}</p>
            ) : (
              <div className="scroll-index-list">
                {headings.map((h, i) => (
                  <DropdownMenu.Item
                    key={`${i}-${h.text}`}
                    className="scroll-index-item"
                    data-active={i === active}
                    style={{ paddingInlineStart: 10 + (h.level - 1) * 12, ['--i' as string]: i }}
                    onSelect={() => {
                      const root = target.current;
                      if (root) jump(topWithin(h.el, root) - 72);
                    }}
                  >
                    <span className="scroll-index-dot" aria-hidden />
                    <span className="min-w-0 flex-1 truncate">{h.text}</span>
                    {i === active ? (
                      <Check size={12} strokeWidth={2.4} className="shrink-0 text-accent" aria-hidden />
                    ) : (
                      <span className="mono num shrink-0 text-[10.5px] text-ash">{Math.round(h.at * 100)}%</span>
                    )}
                  </DropdownMenu.Item>
                ))}
              </div>
            )}
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>

      <span className="scroll-index-pct num" aria-live="off">
        {pct}%
      </span>
    </div>
      ) : null}
    </div>
  );
}

const IndexTrigger = forwardRef<HTMLButtonElement, { open: boolean; label: string; children: ReactNode }>(function IndexTrigger(
  { open, label, children, ...rest },
  ref,
) {
  return (
    <button ref={ref} type="button" className="scroll-index-trigger" aria-label={label} {...rest}>
      {children}
      <ChevronDown
        size={14}
        strokeWidth={2.4}
        aria-hidden
        className={cn('shrink-0 transition-transform duration-300', open && 'rotate-180')}
      />
    </button>
  );
});
