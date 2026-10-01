import type { StatusTone } from '@/components/ui/BadgeChip';
import type { NewsStage } from '@/lib/types';
import { translate } from '@/state/languageStore';

/** Stage names are read through getters so they follow the current language. */
export const STAGE_LABEL: Record<NewsStage, string> = Object.defineProperties(
  {} as Record<NewsStage, string>,
  Object.fromEntries(
    (['ideas', 'research', 'outline', 'draft', 'in_review', 'published'] as const).map((stage) => [
      stage,
      { enumerable: true, get: () => translate(`news.stage.${stage}`) },
    ]),
  ),
);

/** "Today" / "Yesterday" / "3 days ago" / date — localised day heading for the list view. */
export function dayBucketT(iso: string, locale: string): string {
  const d = new Date(iso);
  const start = (x: Date): number => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const delta = Math.round((start(new Date()) - start(d)) / 864e5);
  if (delta <= 0) return translate('news.today');
  if (delta === 1) return translate('news.yesterday');
  if (delta === 2) return translate('news.twoDaysAgo');
  if (delta < 7) return translate('news.daysAgo', { count: delta });
  return d.toLocaleDateString(locale, { month: 'short', day: 'numeric', year: 'numeric' });
}

/** "5m ago" — localised relative time for cards. */
export function relativeTimeT(iso: string | null | undefined, locale: string): string {
  if (!iso) return '—';
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return '—';
  const mins = Math.round((Date.now() - t) / 60_000);
  if (mins < 1) return translate('news.time.now');
  if (mins < 60) return translate('news.time.min', { count: mins });
  const hours = Math.round(mins / 60);
  if (hours < 24) return translate('news.time.hour', { count: hours });
  const days = Math.round(hours / 24);
  if (days < 30) return translate('news.time.day', { count: days });
  return new Date(iso).toLocaleDateString(locale, { month: 'short', day: 'numeric', year: 'numeric' });
}

export const STAGE_TONE: Record<NewsStage, StatusTone> = {
  ideas: 'neutral',
  research: 'violet',
  outline: 'info',
  draft: 'accent',
  in_review: 'teal',
  published: 'success',
};

/** Left-to-right column order on the editorial board — the pipeline a story moves through. */
export const NEWS_STAGES: NewsStage[] = ['ideas', 'research', 'outline', 'draft', 'in_review', 'published'];
