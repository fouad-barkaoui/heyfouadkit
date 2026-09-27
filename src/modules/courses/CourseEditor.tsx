import { useEffect, useState } from 'react';
import { BadgeChip } from '@/components/ui/BadgeChip';
import { Button } from '@/components/ui/Button';
import { FieldRow, Label, TextArea, TextInput } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import type { Badge, Course } from '@/lib/types';
import { isValidUrl, nowISO, uid } from '@/lib/utils';

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
      title={course ? 'Edit course' : 'New course'}
      description="Badges scoped to the Course Hub keep this list separate from Docs Storage."
      footer={
        <>
          <Button onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button variant="primary" onClick={submit}>
            {course ? 'Save changes' : 'Add course'}
          </Button>
        </>
      }
    >
      <FieldRow>
        <Label htmlFor="course-title">Title</Label>
        <TextInput
          id="course-title"
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Active Directory Enumeration & Attacks"
        />
        {touched && !validTitle ? <p className="mt-1.5 text-[12px] text-coral">A title is required.</p> : null}
      </FieldRow>

      <FieldRow>
        <Label htmlFor="course-url">Link</Label>
        <TextInput
          id="course-url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://academy.hackthebox.com"
        />
        {touched && !validUrl ? (
          <p className="mt-1.5 text-[12px] text-coral">That does not look like an http(s) URL.</p>
        ) : null}
      </FieldRow>

      <FieldRow>
        <Label htmlFor="course-desc">Description</Label>
        <TextArea
          id="course-desc"
          rows={2}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What this covers, and why it is on the list."
        />
      </FieldRow>

      <FieldRow>
        <Label htmlFor="course-progress">Progress — {progress}%</Label>
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
        <Label>Badge</Label>
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            className="pill"
            data-active={badgeId === null}
            onClick={() => setBadgeId(null)}
          >
            None
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
            + New badge
          </button>
        </div>
      </FieldRow>
    </Modal>
  );
}
