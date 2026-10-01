import { useEffect, useState } from 'react';
import { BadgeChip } from '@/components/ui/BadgeChip';
import { Button } from '@/components/ui/Button';
import { FieldRow, Label, TextArea, TextInput } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import type { Badge, Course } from '@/lib/types';
import { isValidUrl, nowISO, uid } from '@/lib/utils';
import { useLanguage } from '@/state/languageStore';

export function CourseEditor({
  open,
  onOpenChange,
  course,
  badges,
  onSave,
  onCreateBadge,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  course: Course | null;
  badges: Badge[];
  onSave: (course: Course) => void;
  onCreateBadge: () => void;
}): JSX.Element {
  const { t } = useLanguage();
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [description, setDescription] = useState('');
  const [badgeId, setBadgeId] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTouched(false);
    setTitle(course?.title ?? '');
    setUrl(course?.url ?? '');
    setDescription(course?.description ?? '');
    setBadgeId(course?.badgeId ?? null);
    setProgress(course?.progress ?? 0);
  }, [open, course]);

  const validTitle = title.trim().length > 0;
  const validUrl = url.trim().length === 0 || isValidUrl(url.trim());

  const submit = (): void => {
    setTouched(true);
    if (!validTitle || !validUrl) return;
    onSave({
      id: course?.id ?? uid('crs'),
      title: title.trim(),
      url: url.trim(),
      description: description.trim(),
      badgeId,
      progress,
      isInteresting: course?.isInteresting ?? false,
      createdAt: course?.createdAt ?? nowISO(),
      updatedAt: nowISO(),
    });
    onOpenChange(false);
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={course ? t('crs.edit') : t('crs.newCourse')}
      description={t('crs.editor.desc')}
      footer={
        <>
          <Button onClick={() => onOpenChange(false)}>{t('crs.editor.cancel')}</Button>
          <Button variant="primary" onClick={submit}>
            {course ? t('crs.editor.saveChanges') : t('crs.editor.add')}
          </Button>
        </>
      }
    >
      <FieldRow>
        <Label htmlFor="course-title">{t('crs.editor.title')}</Label>
        <TextInput
          id="course-title"
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Active Directory Enumeration & Attacks"
        />
        {touched && !validTitle ? <p className="mt-1.5 text-[12px] text-coral">{t('crs.editor.titleRequired')}</p> : null}
      </FieldRow>

      <FieldRow>
        <Label htmlFor="course-url">{t('crs.editor.link')}</Label>
        <TextInput
          id="course-url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://academy.hackthebox.com"
        />
        {touched && !validUrl ? (
          <p className="mt-1.5 text-[12px] text-coral">{t('crs.editor.badUrl')}</p>
        ) : null}
      </FieldRow>

      <FieldRow>
        <Label htmlFor="course-desc">{t('crs.editor.description')}</Label>
        <TextArea
          id="course-desc"
          rows={2}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t('crs.editor.descPlaceholder')}
        />
      </FieldRow>

      <FieldRow>
        <Label htmlFor="course-progress">{t('crs.editor.progress', { value: progress })}</Label>
        <input
          id="course-progress"
          type="range"
          min={0}
          max={100}
          step={5}
          value={progress}
          onChange={(e) => setProgress(Number(e.target.value))}
          className="h-[3px] w-full cursor-pointer appearance-none rounded-full bg-white/10 accent-[#e4f222]"
        />
      </FieldRow>

      <FieldRow>
        <Label>{t('crs.badge')}</Label>
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            className="pill"
            data-active={badgeId === null}
            onClick={() => setBadgeId(null)}
          >
            {t('crs.editor.none')}
          </button>
          {badges.map((badge) => (
            <BadgeChip
              key={badge.id}
              badge={badge}
              interactive
              active={badgeId === badge.id}
              onClick={() => setBadgeId(badge.id)}
            />
          ))}
          <button
            type="button"
            onClick={onCreateBadge}
            className="rounded-full border border-dashed border-graphite px-2.5 py-[3px] text-[12px] text-ash transition-colors hover:border-smoke hover:text-mist"
          >
            {t('crs.editor.newBadge')}
          </button>
        </div>
      </FieldRow>
    </Modal>
  );
}
