import type { User } from '@supabase/supabase-js';
import { Crown } from 'lucide-react';
import { isAdminUser, isProUser } from '@/lib/access';
import { cn } from '@/lib/utils';

/**
 * The tier tag shown next to a name: a gold "ADMIN" with a crown for the
 * owner account (which is Pro by definition), "PRO" for subscribers,
 * nothing for everyone else.
 */
export function PlanChip({ user, className }: { user: User | null; className?: string }): JSX.Element | null {
  if (isAdminUser(user)) {
    return (
      <span className={cn('pro-chip is-admin', className)} title="Admin · Pro account">
        <Crown size={10} strokeWidth={2.4} aria-hidden />
        ADMIN
      </span>
    );
  }
  if (isProUser(user)) return <span className={cn('pro-chip', className)}>PRO</span>;
  return null;
}
