import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { localeTag, translate } from '@/state/languageStore';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export function uid(prefix = 'nx'): string {
  const rand =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
  return `${prefix}_${Date.now().toString(36)}${rand}`;
}

export function nowISO(): string {
  return new Date().toISOString();
}

/** Deterministic short ref (ENG-2703 style) used for mono metadata. */
export function refCode(prefix: string, id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return `${prefix}-${(hash % 9000) + 1000}`;
}

const DAY = 86_400_000;

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(localeTag(), { month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString(localeTag(), {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function relativeTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return '—';
  const diff = Date.now() - t;
  const mins = Math.round(diff / 60_000);
  if (mins < 1) return translate('core.time.justNow');
  if (mins < 60) return translate('core.time.minutesAgo', { n: mins });
  const hours = Math.round(mins / 60);
  if (hours < 24) return translate('core.time.hoursAgo', { n: hours });
  const days = Math.round(hours / 24);
  if (days < 30) return translate('core.time.daysAgo', { n: days });
  return formatDate(iso);
}

/** Timeline bucket label — Today / Yesterday / explicit date. */
export function dayBucket(iso: string): string {
  const d = new Date(iso);
  const start = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const delta = Math.round((start(new Date()) - start(d)) / DAY);
  if (delta <= 0) return translate('core.time.today');
  if (delta === 1) return translate('core.time.yesterday');
  if (delta < 7) return translate('core.time.daysAgoLong', { n: delta });
  return d.toLocaleDateString(localeTag(), { month: 'short', day: 'numeric', year: 'numeric' });
}

export function groupByDay<T>(items: T[], getDate: (item: T) => string): [string, T[]][] {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const key = dayBucket(getDate(item));
    const bucket = map.get(key);
    if (bucket) bucket.push(item);
    else map.set(key, [item]);
  }
  return [...map.entries()];
}

export function formatBytes(bytes: number | null | undefined): string {
  if (!bytes || bytes <= 0) return '—';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** i).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

export function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Minimal allow-nothing-dangerous pass over stored HTML before it is rendered.
 * Content is authored locally by the user, but a workspace file can travel, so
 * script/style/iframe/event-handler payloads never reach the DOM.
 */
export function sanitizeHtml(html: string): string {
  return html
    .replace(/<\s*(script|style|iframe|object|embed|link|meta)\b[\s\S]*?<\s*\/\s*\1\s*>/gi, '')
    .replace(/<\s*(script|style|iframe|object|embed|link|meta)\b[^>]*\/?>/gi, '')
    .replace(/\son\w+\s*=\s*"[^"]*"/gi, '')
    .replace(/\son\w+\s*=\s*'[^']*'/gi, '')
    .replace(/\son\w+\s*=\s*[^\s>]+/gi, '')
    .replace(/(href|src)\s*=\s*(["'])\s*javascript:[^"']*\2/gi, '$1="#"');
}

export function wordCount(html: string): number {
  const text = stripHtml(html);
  return text ? text.split(/\s+/).length : 0;
}

export function excerpt(html: string, max = 140): string {
  const text = stripHtml(html);
  return text.length > max ? `${text.slice(0, max).trimEnd()}…` : text;
}

/** Hex → rgba with alpha, for badge tints derived from a single hex token. */
export function tint(hex: string, alpha: number): string {
  const clean = hex.replace('#', '');
  const full =
    clean.length === 3
      ? clean
          .split('')
          .map((c) => c + c)
          .join('')
      : clean;
  const int = Number.parseInt(full || '3b82f6', 16);
  const r = (int >> 16) & 255;
  const g = (int >> 8) & 255;
  const b = int & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Wide enough for the three-pane shell. On a phone the list is the landing
 * view, so modules must not auto-open a record and strand the navigation.
 */
export function isWideViewport(): boolean {
  return typeof window !== 'undefined' && window.innerWidth >= 768;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function isValidUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

export function domainOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}
