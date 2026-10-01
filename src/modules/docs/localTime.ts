import { localeTag, translate } from '@/state/languageStore';

/*
 * Language-aware versions of the date helpers in lib/utils, used by Docs,
 * Analytics, Vault and Reporting. English output matches lib/utils exactly.
 */

function parse(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function fmtDate(iso: string | null | undefined): string {
  const d = parse(iso);
  if (!d) return '—';
  return d.toLocaleDateString(localeTag(), { month: 'short', day: 'numeric', year: 'numeric' });
}

export function fmtDateTime(iso: string | null | undefined): string {
  const d = parse(iso);
  if (!d) return '—';
  return d.toLocaleString(localeTag(), {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function relTime(iso: string | null | undefined): string {
  const d = parse(iso);
  if (!d) return '—';
  const mins = Math.round((Date.now() - d.getTime()) / 60_000);
  if (mins < 1) return translate('doc.time.justNow');
  if (mins < 60) return translate('doc.time.minutes', { n: mins });
  const hours = Math.round(mins / 60);
  if (hours < 24) return translate('doc.time.hours', { n: hours });
  const days = Math.round(hours / 24);
  if (days < 30) return translate('doc.time.days', { n: days });
  return fmtDate(iso);
}
