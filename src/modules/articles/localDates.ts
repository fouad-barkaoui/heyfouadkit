import { formatDate, formatDateTime, groupByDay, relativeTime } from '@/lib/utils';
import { localeTag, translate } from '@/state/languageStore';

/**
 * Language-aware wrappers around the shared date helpers. English goes straight
 * through to `@/lib/utils` (output unchanged); Arabic is built with Intl.
 */
const isArabic = (): boolean => localeTag().startsWith('ar');
const DAY = 86_400_000;

const parse = (iso: string | null | undefined): Date | null => {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
};

export function localDate(iso: string | null | undefined): string {
  if (!isArabic()) return formatDate(iso);
  const d = parse(iso);
  return d ? d.toLocaleDateString(localeTag(), { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
}

export function localDateTime(iso: string | null | undefined): string {
  if (!isArabic()) return formatDateTime(iso);
  const d = parse(iso);
  return d
    ? d.toLocaleString(localeTag(), { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })
    : '—';
}

export function localRelativeTime(iso: string | null | undefined): string {
  if (!isArabic()) return relativeTime(iso);
  const d = parse(iso);
  if (!d) return '—';
  const rtf = new Intl.RelativeTimeFormat(localeTag(), { numeric: 'always' });
  const mins = Math.round((Date.now() - d.getTime()) / 60_000);
  if (mins < 1) return translate('art.time.justNow');
  if (mins < 60) return rtf.format(-mins, 'minute');
  const hours = Math.round(mins / 60);
  if (hours < 24) return rtf.format(-hours, 'hour');
  const days = Math.round(hours / 24);
  if (days < 30) return rtf.format(-days, 'day');
  return localDate(iso);
}

function localDayBucket(iso: string): string {
  const d = new Date(iso);
  const start = (x: Date): number => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const delta = Math.round((start(new Date()) - start(d)) / DAY);
  const rtf = new Intl.RelativeTimeFormat(localeTag(), { numeric: 'auto' });
  if (delta <= 0) return rtf.format(0, 'day');
  if (delta === 1) return rtf.format(-1, 'day');
  if (delta < 7) return rtf.format(-delta, 'day');
  return d.toLocaleDateString(localeTag(), { month: 'short', day: 'numeric', year: 'numeric' });
}

export function localGroupByDay<T>(items: T[], getDate: (item: T) => string): [string, T[]][] {
  if (!isArabic()) return groupByDay(items, getDate);
  const map = new Map<string, T[]>();
  for (const item of items) {
    const key = localDayBucket(getDate(item));
    const bucket = map.get(key);
    if (bucket) bucket.push(item);
    else map.set(key, [item]);
  }
  return [...map.entries()];
}
