import { AlertTriangle } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/state/languageStore';
import type { Bucket, Category, Currency } from './salaryModel';

/* ── money formatting ────────────────────────────────────────────────── */

export type Money = (n: number, opts?: { sign?: boolean; compact?: boolean }) => string;

export function useMoney(currency: Currency, hidden: boolean): Money {
  const { locale } = useLanguage();
  const fmt = useMemo(
    () => new Intl.NumberFormat(locale, { style: 'currency', currency, maximumFractionDigits: 0 }),
    [locale, currency],
  );
  const compact = useMemo(
    () => new Intl.NumberFormat(locale, { style: 'currency', currency, notation: 'compact', maximumFractionDigits: 1 }),
    [locale, currency],
  );
  return useCallback(
    (n, opts) => {
      if (hidden) return '•••••';
      const v = Math.round(n);
      const s = (opts?.compact ? compact : fmt).format(Math.abs(v));
      if (v < 0) return `−${s}`;
      return opts?.sign && v > 0 ? `+${s}` : s;
    },
    [fmt, compact, hidden],
  );
}

export function useMonthLabel(): (key: string) => string {
  const { locale } = useLanguage();
  const f = useMemo(() => new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }), [locale]);
  return useCallback((key: string) => {
    const [y, m] = key.split('-').map(Number);
    return f.format(new Date(y, m - 1, 1));
  }, [f]);
}

/** Name shown for a category: built-ins follow the language. */
export function useCategoryName(): (c: Pick<Category, 'key' | 'name'>) => string {
  const { t } = useLanguage();
  return useCallback((c) => c.name.trim() || (c.key ? t(c.key) : t('sal.cat.untitled')), [t]);
}

/* ── inputs ──────────────────────────────────────────────────────────── */

/** A number box that lets you type freely and reports clean numbers. */
export function AmountInput({
  value,
  onChange,
  className,
  label,
  min = 0,
  max,
  placeholder,
  autoFocus,
}: {
  value: number;
  onChange: (n: number) => void;
  className?: string;
  label: string;
  min?: number;
  max?: number;
  placeholder?: string;
  autoFocus?: boolean;
}): JSX.Element {
  const [text, setText] = useState(value ? String(value) : '');
  const focused = useRef(false);
  useEffect(() => {
    if (!focused.current) setText(value ? String(value) : '');
  }, [value]);
  return (
    <input
      className={cn('field sp-num', className)}
      inputMode="decimal"
      aria-label={label}
      placeholder={placeholder ?? '0'}
      value={text}
      autoFocus={autoFocus}
      onFocus={(e) => {
        focused.current = true;
        e.currentTarget.select();
      }}
      onBlur={() => {
        focused.current = false;
        setText(value ? String(value) : '');
      }}
      onChange={(e) => {
        const raw = e.target.value.replace(/[^\d.,]/g, '').replace(',', '.');
        setText(raw);
        let n = Number(raw);
        if (!Number.isFinite(n)) return;
        n = Math.max(min, n);
        if (max !== undefined) n = Math.min(max, n);
        onChange(n);
      }}
    />
  );
}

/* ── small pieces ────────────────────────────────────────────────────── */

export const BUCKET_ICON_CLASS: Record<Bucket, string> = {
  needs: 'is-needs',
  wants: 'is-wants',
  savings: 'is-savings',
};

export function BucketDot({ bucket }: { bucket: Bucket }): JSX.Element {
  return <span className={cn('sp-dot', BUCKET_ICON_CLASS[bucket])} aria-hidden />;
}

export function Card({
  title,
  action,
  children,
  className,
}: {
  title?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}): JSX.Element {
  return (
    <section className={cn('sp-card', className)}>
      {title || action ? (
        <header className="sp-card-head">
          {title ? <h3 className="sp-card-title">{title}</h3> : <span />}
          {action}
        </header>
      ) : null}
      {children}
    </section>
  );
}

/** Spent against planned, with an over-budget state that never relies on colour. */
export function Meter({
  spent,
  planned,
  bucket,
  money,
  label,
}: {
  spent: number;
  planned: number;
  bucket: Bucket;
  money: Money;
  label: ReactNode;
}): JSX.Element {
  const { t } = useLanguage();
  const over = spent > planned && spent > 0;
  const full = planned > 0 && spent === planned;
  const near = !over && !full && planned > 0 && spent / planned >= 0.85;
  const pct = planned > 0 ? Math.min(100, (spent / planned) * 100) : spent > 0 ? 100 : 0;
  return (
    <div className="sp-meter" data-state={over ? 'over' : near ? 'near' : undefined}>
      <div className="sp-meter-top">
        <span className="sp-meter-label">
          <BucketDot bucket={bucket} />
          {label}
        </span>
        <span className="sp-meter-val num">
          {money(spent)} <span className="text-ash">/ {money(planned)}</span>
        </span>
      </div>
      <div className="sp-meter-track" role="presentation">
        <i className={BUCKET_ICON_CLASS[bucket]} style={{ width: `${pct}%` }} />
      </div>
      {over ? (
        <p className="sp-meter-note">
          <AlertTriangle size={12} strokeWidth={2} aria-hidden />
          {t('sal.over', { amount: money(spent - planned) })}
        </p>
      ) : full ? (
        <p className="sp-meter-note is-full">{t('sal.full')}</p>
      ) : near ? (
        <p className="sp-meter-note is-near">{t('sal.near', { amount: money(planned - spent) })}</p>
      ) : null}
    </div>
  );
}

/* ── pace chart ──────────────────────────────────────────────────────── */

/**
 * Cumulative spending through the month against an even pace towards the
 * plan. One axis, two lines (the pace line is dashed and labelled).
 */
export function PaceChart({
  cumulative,
  budget,
  today,
  money,
}: {
  cumulative: number[];
  budget: number;
  /** Day of month to stop the actual line at (null = whole month). */
  today: number | null;
  money: Money;
}): JSX.Element {
  const { t } = useLanguage();
  const W = 520;
  const H = 180;
  const P = { l: 8, r: 8, t: 14, b: 22 };
  const days = cumulative.length;
  const last = today ?? days;
  const shown = cumulative.slice(0, last);
  const top = Math.max(budget, ...shown, 1) * 1.08;
  const x = (d: number): number => P.l + ((W - P.l - P.r) * d) / Math.max(1, days - 1);
  const y = (v: number): number => H - P.b - ((H - P.t - P.b) * v) / top;
  const line = shown.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join('');
  const area = shown.length ? `${line}L${x(shown.length - 1).toFixed(1)},${y(0)}L${x(0)},${y(0)}Z` : '';
  const [hover, setHover] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const onMove = (e: React.PointerEvent): void => {
    const r = svgRef.current?.getBoundingClientRect();
    if (!r) return;
    const rel = (e.clientX - r.left) / r.width;
    const d = Math.round(rel * (days - 1));
    setHover(Math.min(days - 1, Math.max(0, d)));
  };

  const hv = hover !== null && hover < shown.length ? shown[hover] : null;
  const paceAt = (d: number): number => (budget * (d + 1)) / days;

  return (
    <figure className="sp-pace">
      <div className="sp-pace-legend">
        <span>
          <i className="is-actual" /> {t('sal.pace.actual')}
        </span>
        <span>
          <i className="is-pace" /> {t('sal.pace.even')}
        </span>
      </div>
      {/* Days run left to right in both languages, like a calendar strip. */}
      <div className="sp-pace-plot" dir="ltr">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="sp-pace-svg"
        role="img"
        aria-label={t('sal.pace.aria', { spent: money(shown[shown.length - 1] ?? 0), budget: money(budget) })}
        onPointerMove={onMove}
        onPointerLeave={() => setHover(null)}
      >
        {[0.25, 0.5, 0.75, 1].map((f) => (
          <line key={f} x1={P.l} x2={W - P.r} y1={y(top * f)} y2={y(top * f)} className="sp-gridline" />
        ))}
        <line x1={P.l} x2={W - P.r} y1={y(0)} y2={y(0)} className="sp-axis" />
        <line x1={x(0)} y1={y(budget / days)} x2={x(days - 1)} y2={y(budget)} className="sp-pace-line" />
        {area ? <path d={area} className="sp-pace-area" /> : null}
        {line ? <path d={line} className="sp-actual-line" /> : null}
        {shown.length ? (
          <circle cx={x(shown.length - 1)} cy={y(shown[shown.length - 1])} r={4.5} className="sp-actual-dot" />
        ) : null}
        {hover !== null ? (
          <>
            <line x1={x(hover)} x2={x(hover)} y1={P.t} y2={y(0)} className="sp-cross" />
            {hv !== null ? <circle cx={x(hover)} cy={y(hv)} r={4} className="sp-actual-dot" /> : null}
          </>
        ) : null}
        {[1, Math.ceil(days / 2), days].map((d) => (
          <text key={d} x={x(d - 1)} y={H - 6} className="sp-tick" textAnchor={d === 1 ? 'start' : d === days ? 'end' : 'middle'}>
            {d}
          </text>
        ))}
      </svg>
      {hover !== null ? (
        <figcaption
          className="sp-tip"
          style={{ left: `${(x(hover) / W) * 100}%` }}
        >
          <strong>{t('sal.pace.day', { n: hover + 1 })}</strong>
          {hv !== null ? (
            <span>
              {t('sal.pace.actual')}: <b className="num">{money(hv)}</b>
            </span>
          ) : null}
          <span>
            {t('sal.pace.even')}: <b className="num">{money(paceAt(hover))}</b>
          </span>
        </figcaption>
      ) : null}
      </div>
    </figure>
  );
}
