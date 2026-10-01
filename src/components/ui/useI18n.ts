import { createElement, Fragment, type ReactNode } from 'react';
import { localeTag, translate, useLanguage, type TranslateVars } from '@/state/languageStore';

export interface I18n {
  t: (key: string, vars?: TranslateVars) => string;
  locale: string;
  isArabic: boolean;
}

/**
 * `useLanguage()` for the shared shell / UI kit. These building blocks are also
 * rendered on their own (unit tests, isolated previews) without a
 * <LanguageProvider>, so instead of throwing they fall back to the current
 * language through `translate()`.
 */
export function useI18n(): I18n {
  try {
    const { t, locale, isArabic } = useLanguage();
    return { t, locale, isArabic };
  } catch {
    return { t: translate, locale: localeTag(), isArabic: false };
  }
}

/**
 * Fill {slots} in a translated phrase with React nodes, e.g. a phrase that
 * wraps a value in a styled <span>: `rich(t('sh.x'), { file: <code>…</code> })`.
 */
export function rich(text: string, nodes: Record<string, ReactNode>): ReactNode[] {
  return text.split(/(\{\w+\})/g).map((part, i) => {
    const m = /^\{(\w+)\}$/.exec(part);
    const node = m && m[1]! in nodes ? nodes[m[1]!] : part;
    return createElement(Fragment, { key: i }, node);
  });
}

type T = I18n['t'];

const BYTE_UNITS = ['B', 'KB', 'MB', 'GB'] as const;

/** `formatBytes` with translated units. */
export function fmtBytes(bytes: number | null | undefined, t: T): string {
  if (!bytes || bytes <= 0) return '—';
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), BYTE_UNITS.length - 1);
  return t('sh.unit.bytes', {
    n: (bytes / 1024 ** i).toFixed(i === 0 ? 0 : 1),
    unit: t(`sh.unit.${BYTE_UNITS[i]}`),
  });
}

function validDate(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** `formatDate` in the current locale. */
export function fmtDate(iso: string | null | undefined, locale: string): string {
  const d = validDate(iso);
  return d ? d.toLocaleDateString(locale, { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
}

/** `formatDateTime` in the current locale. */
export function fmtDateTime(iso: string | null | undefined, locale: string): string {
  const d = validDate(iso);
  return d
    ? d.toLocaleString(locale, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })
    : '—';
}

/** `relativeTime` with translated words. */
export function fmtRelative(iso: string | null | undefined, t: T, locale: string): string {
  const d = validDate(iso);
  if (!d) return '—';
  const mins = Math.round((Date.now() - d.getTime()) / 60_000);
  if (mins < 1) return t('sh.time.justNow');
  if (mins < 60) return t('sh.time.minsAgo', { n: mins });
  const hours = Math.round(mins / 60);
  if (hours < 24) return t('sh.time.hoursAgo', { n: hours });
  const days = Math.round(hours / 24);
  if (days < 30) return t('sh.time.daysAgo', { n: days });
  return fmtDate(iso, locale);
}
