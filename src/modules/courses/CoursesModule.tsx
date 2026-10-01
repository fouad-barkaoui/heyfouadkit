import { ExternalLink, GraduationCap, Pencil, Plus, Star, Tag as TagIcon } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useStagger } from '@/components/motion/ViewTransition';
import { ModuleLayout } from '@/components/shell/ModuleLayout';
import { BadgeChip } from '@/components/ui/BadgeChip';
import { Button, IconButton } from '@/components/ui/Button';
import { ConfirmDelete } from '@/components/ui/ConfirmDelete';
import { EmptyState } from '@/components/ui/EmptyState';
import { ProgressBar } from '@/components/ui/ProgressRing';
import type { Badge, Course } from '@/lib/types';
import { cn, domainOf, nowISO } from '@/lib/utils';
import { localRelativeTime } from '@/modules/articles/localDates';
import { BadgeEditor } from '@/modules/badges/BadgeEditor';
import { useLanguage } from '@/state/languageStore';
import { useUI } from '@/state/uiStore';
import { useRequireAuth } from '@/state/useRequireAuth';
import { useWorkspace } from '@/state/workspaceStore';
import { CourseEditor } from './CourseEditor';

export function CoursesModule(): JSX.Element {
  const { t } = useLanguage();
  const { workspace, createRecord, updateRecord, toggleInteresting } = useWorkspace();
  const { focusRequest, clearFocus } = useUI();
  const requireAuth = useRequireAuth();

  const courses = useMemo(() => workspace.courses.filter((c) => !c.isDeleted), [workspace.courses]);

  const badges = useMemo(
    () => workspace.badges.filter((b) => b.category === 'course'),
    [workspace.badges],
  );

  const [query, setQuery] = useState('');
  const [activeBadges, setActiveBadges] = useState<string[]>([]);
  const [courseEditor, setCourseEditor] = useState<{ open: boolean; course: Course | null }>({
    open: false,
    course: null,
  });
  const [badgeEditor, setBadgeEditor] = useState<{ open: boolean; badge: Badge | null }>({
    open: false,
    badge: null,
  });
  const [highlightId, setHighlightId] = useState<string | null>(null);

  useEffect(() => {
    if (focusRequest?.module === 'courses') {
      setActiveBadges([]);
      setQuery('');
      setHighlightId(focusRequest.id);
      clearFocus();
    }
  }, [focusRequest, clearFocus]);

  const badgeById = useMemo(
    () => new Map(workspace.badges.map((b) => [b.id, b] as const)),
    [workspace.badges],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return courses
      .filter((c) => activeBadges.length === 0 || (c.badgeId !== null && activeBadges.includes(c.badgeId)))
      .filter(
        (c) =>
          !q ||
          c.title.toLowerCase().includes(q) ||
          c.description.toLowerCase().includes(q) ||
          c.url.toLowerCase().includes(q),
      )
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [courses, activeBadges, query]);

  const gridRef = useStagger([query, activeBadges.join(','), courses.length]);

  const toggleBadgeFilter = (id: string): void =>
    setActiveBadges((current) =>
      current.includes(id) ? current.filter((x) => x !== id) : [...current, id],
    );

  const saveCourse = (course: Course): void => {
    if (workspace.courses.some((c) => c.id === course.id)) updateRecord('courses', course.id, course);
    else createRecord('courses', course);
  };

  const saveBadge = (badge: Badge): void => {
    if (workspace.badges.some((b) => b.id === badge.id)) updateRecord('badges', badge.id, badge);
    else createRecord('badges', badge);
  };

  const startNewCourse = (): void => {
    if (!requireAuth()) return;
    setCourseEditor({ open: true, course: null });
  };

  const startNewBadge = (): void => {
    if (!requireAuth()) return;
    setBadgeEditor({ open: true, badge: null });
  };

  const panel = (
    <div>
      <div className="mb-3">
        <div className="mb-2 flex items-center justify-between px-1">
          <p className="text-[10.5px] font-medium uppercase tracking-[0.08em] text-ash/70">{t('crs.badgeFilters')}</p>
          <IconButton label={t('crs.newBadge')} onClick={startNewBadge}>
            <Plus size={13.5} strokeWidth={1.9} />
          </IconButton>
        </div>
        {badges.length === 0 ? (
          <p className="px-1 py-2 text-[12px] text-ash">{t('crs.noBadges')}</p>
        ) : (
          <div className="flex flex-wrap gap-1.5 px-1">
            {badges.map((badge) => (
              <span key={badge.id} className="group relative inline-flex">
                <BadgeChip
                  badge={badge}
                  size="sm"
                  interactive
                  active={activeBadges.includes(badge.id)}
                  onClick={() => toggleBadgeFilter(badge.id)}
                />
                <button
                  type="button"
                  aria-label={t('crs.editBadge', { name: badge.name })}
                  onClick={() => setBadgeEditor({ open: true, badge })}
                  className="absolute -end-1 -top-1 hidden h-[15px] w-[15px] items-center justify-center rounded-full bg-obsidian text-ash shadow-[0_0_0_1px_var(--color-graphite)] group-hover:flex hover:text-paper"
                >
                  <Pencil size={8.5} strokeWidth={2.2} />
                </button>
              </span>
            ))}
          </div>
        )}
        {activeBadges.length > 0 ? (
          <button
            type="button"
            onClick={() => setActiveBadges([])}
            className="mt-2 px-1 text-[11.5px] text-ash transition-colors hover:text-mist"
          >
            {activeBadges.length === 1 ? t('crs.clearFilterOne') : t('crs.clearFilterMany', { count: activeBadges.length })}
          </button>
        ) : null}
      </div>

      <div className="border-t border-graphite pt-3">
        <p className="mb-1.5 px-1 text-[10.5px] font-medium uppercase tracking-[0.08em] text-ash/70">
          {t('crs.library')}
        </p>
        {filtered.map((course) => (
          <button
            key={course.id}
            type="button"
            onClick={() => setCourseEditor({ open: true, course })}
            className="mb-[3px] block w-full rounded-[6px] px-2.5 py-2 text-start transition-colors duration-120 hover:bg-[rgb(var(--tint-rgb)/0.035)]"
          >
            <p className="truncate text-[12.5px] text-mist">{course.title}</p>
            <div className="mt-1.5">
              <ProgressBar value={course.progress} />
            </div>
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <>
      <ModuleLayout
        panelTitle={t('nav.courses')}
        panelCount={courses.length}
        panelActions={
          <IconButton label={t('crs.newCourse')} onClick={startNewCourse}>
            <Plus size={15} strokeWidth={1.9} />
          </IconButton>
        }
        panelSearch={{ value: query, onChange: setQuery, placeholder: t('crs.search') }}
        panel={panel}
        title={t('nav.courses')}
        subtitle={
          <span className="num">
            {t('crs.shownOfTotal', { shown: filtered.length, total: courses.length })}
            {activeBadges.length > 0 ? t('crs.badgeFilterActive', { count: activeBadges.length }) : ''}
          </span>
        }
        actions={
          <>
            <Button icon={<TagIcon size={13} strokeWidth={1.9} />} onClick={startNewBadge}>
              {t('crs.badge')}
            </Button>
            <Button
              variant="primary"
              icon={<Plus size={14} strokeWidth={2} />}
              onClick={startNewCourse}
            >
              {t('crs.newCourse')}
            </Button>
          </>
        }
        detailOpenOnMobile
      >
        {filtered.length === 0 ? (
          <EmptyState
            icon={<GraduationCap size={18} strokeWidth={1.6} />}
            title={query || activeBadges.length > 0 ? t('crs.empty.filtered') : t('crs.empty.none')}
            hint={t('crs.empty.hint')}
            action={
              <Button
                variant="primary"
                icon={<Plus size={14} strokeWidth={2} />}
                onClick={startNewCourse}
              >
                {t('crs.newCourse')}
              </Button>
            }
          />
        ) : (
          <div ref={gridRef} className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((course) => {
              const badge = course.badgeId ? badgeById.get(course.badgeId) : undefined;
              return (
                <article
                  key={course.id}
                  data-stagger
                  className={cn(
                    'group relative flex flex-col rounded-[10px] bg-[rgb(var(--tint-rgb)/0.022)] p-4 shadow-[inset_0_0_0_1px_var(--color-graphite)]',
                    'transition-[background-color,box-shadow] duration-150 hover:bg-[rgb(var(--tint-rgb)/0.04)] hover:shadow-[inset_0_0_0_1px_var(--color-smoke)]',
                    highlightId === course.id && 'shadow-[inset_0_0_0_1px_rgba(228,242,34,0.5)]',
                  )}
                >
                  <div className="mb-2.5 flex items-start justify-between gap-2">
                    {badge ? <BadgeChip badge={badge} size="sm" /> : <span className="h-[19px]" />}
                    <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity duration-150 group-hover:opacity-100 focus-within:opacity-100">
                      <IconButton
                        label={course.isInteresting ? t('crs.vault.remove') : t('crs.vault.add')}
                        className={cn('h-6 w-6', course.isInteresting && 'text-accent opacity-100')}
                        onClick={() => toggleInteresting('courses', course.id)}
                      >
                        <Star size={12.5} strokeWidth={1.9} fill={course.isInteresting ? 'currentColor' : 'none'} />
                      </IconButton>
                      <IconButton
                        label={t('crs.edit')}
                        className="h-6 w-6"
                        onClick={() => setCourseEditor({ open: true, course })}
                      >
                        <Pencil size={12.5} strokeWidth={1.9} />
                      </IconButton>
                      <ConfirmDelete
                        onConfirm={() => updateRecord('courses', course.id, { isDeleted: true, deletedAt: nowISO() })}
                        label={t('crs.delete')}
                        size={12.5}
                      />
                    </div>
                  </div>

                  <h3 className="text-[14px] font-medium leading-[1.35] tracking-[-0.012em] text-paper">
                    {course.title}
                  </h3>
                  {course.description ? (
                    <p className="mt-1.5 line-clamp-2 text-[12.5px] leading-[1.55] text-ash">{course.description}</p>
                  ) : null}

                  <div className="mt-auto pt-4">
                    <div className="mb-1.5 flex items-center justify-between text-[11.5px]">
                      <span className="text-ash">{t('crs.progress')}</span>
                      <span className="num text-mist">{course.progress}%</span>
                    </div>
                    <ProgressBar value={course.progress} />

                    <div className="mt-3 flex items-center justify-between gap-2">
                      <span className="mono truncate text-[11px] text-ash">
                        {course.url ? domainOf(course.url) : t('crs.noLink')}
                      </span>
                      <span className="flex items-center gap-2">
                        <span className="text-[11px] text-ash/70">{localRelativeTime(course.updatedAt)}</span>
                        {course.url ? (
                          <a
                            href={course.url}
                            target="_blank"
                            rel="noreferrer noopener"
                            aria-label={t('crs.open', { title: course.title })}
                            className="btn-icon h-6 w-6"
                          >
                            <ExternalLink size={12.5} strokeWidth={1.9} />
                          </a>
                        ) : null}
                      </span>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </ModuleLayout>

      <CourseEditor
        open={courseEditor.open}
        onOpenChange={(open) => setCourseEditor((s) => ({ ...s, open }))}
        course={courseEditor.course}
        badges={badges}
        onSave={saveCourse}
        onCreateBadge={startNewBadge}
      />

      <BadgeEditor
        open={badgeEditor.open}
        onOpenChange={(open) => setBadgeEditor((s) => ({ ...s, open }))}
        scope="course"
        badge={badgeEditor.badge}
        onSave={saveBadge}
      />
    </>
  );
}
