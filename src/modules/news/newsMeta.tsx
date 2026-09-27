import type { StatusTone } from '@/components/ui/BadgeChip';
import type { NewsStage } from '@/lib/types';

export const STAGE_LABEL: Record<NewsStage, string> = {
  ideas: 'Ideas',
  research: 'Research',
  outline: 'Outline',
  draft: 'Draft',
  in_review: 'In Review',
  published: 'Published',
};

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
