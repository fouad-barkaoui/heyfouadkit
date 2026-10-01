import { useEffect, useRef, useState } from 'react';
import { AttachmentPanel } from '@/components/attachments/AttachmentPanel';
import { Button } from '@/components/ui/Button';
import { FieldRow, Label, Select, TextArea, TextInput } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import type { Recurrence, TaskPriority, TaskStatus, Todo } from '@/lib/types';
import { nowISO, uid } from '@/lib/utils';
import { useLanguage } from '@/state/languageStore';
import { PRIORITY_LABEL, STATUS_LABEL } from './taskMeta';

export interface TaskDraft {
  title: string;
  description: string;
  priority: TaskPriority;
  status: TaskStatus;
  startDate: string;
  dueDate: string;
  recurrence: Recurrence;
}

const blank = (): TaskDraft => ({
  title: '',
  description: '',
  priority: 'medium',
  status: 'backlog',
  startDate: '',
  dueDate: '',
  recurrence: 'none',
});

const toInputDate = (iso: string | null): string => (iso ? iso.slice(0, 10) : '');

export function TaskEditor({
  open,
  onOpenChange,
  task,
  initialDates,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: Todo | null;
  /** Prefilled start/due dates for a brand-new task (e.g. dropped onto the Calendar). Ignored when editing. */
  initialDates?: { startDate?: string; dueDate?: string };
  onSave: (todo: Todo) => void;
}): JSX.Element {
  const { t } = useLanguage();
  const [draft, setDraft] = useState<TaskDraft>(blank);
  const [touched, setTouched] = useState(false);
  /** Stable id for the record from the moment the modal opens, so files can attach to it. */
  const [ownerId, setOwnerId] = useState<string>('');
  const committed = useRef(false);

  useEffect(() => {
    if (!open) return;
    setTouched(false);
    setOwnerId(task?.id ?? uid('todo'));
    committed.current = Boolean(task);
    setDraft(
      task
        ? {
            title: task.title,
            description: task.description,
            priority: task.priority,
            status: task.status,
            startDate: toInputDate(task.startDate),
            dueDate: toInputDate(task.dueDate),
            recurrence: task.recurrence,
          }
        : { ...blank(), startDate: initialDates?.startDate ?? '', dueDate: initialDates?.dueDate ?? '' },
    );
  }, [open, task, initialDates]);

  const valid = draft.title.trim().length > 0;

  const build = (): Todo => {
    const base: Todo = task ?? {
      id: ownerId,
      title: '',
      description: '',
      priority: 'medium',
      status: 'backlog',
      startDate: null,
      dueDate: null,
      recurrence: 'none',
      isInteresting: false,
      createdAt: nowISO(),
      updatedAt: nowISO(),
    };
    return {
      ...base,
      title: draft.title.trim() || t('task.untitled'),
      description: draft.description.trim(),
      priority: draft.priority,
      status: draft.status,
      startDate: draft.startDate ? new Date(`${draft.startDate}T09:00:00`).toISOString() : null,
      dueDate: draft.dueDate ? new Date(`${draft.dueDate}T17:00:00`).toISOString() : null,
      recurrence: draft.recurrence,
      updatedAt: nowISO(),
    };
  };

  const submit = (): void => {
    setTouched(true);
    if (!valid) return;
    onSave(build());
    committed.current = true;
    onOpenChange(false);
  };

  /** Attaching a file saves the task first, so the file always has a home. */
  const ensureOwnerId = (): string => {
    if (!valid) {
      setTouched(true);
      return '';
    }
    if (!committed.current) {
      onSave(build());
      committed.current = true;
    }
    return ownerId;
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={task ? t('task.edit') : t('task.new')}
      description={task ? t('task.editor.descEdit') : t('task.editor.descNew')}
      footer={
        <>
          <Button onClick={() => onOpenChange(false)}>{t('task.editor.cancel')}</Button>
          <Button variant="primary" onClick={submit}>
            {task ? t('task.editor.saveChanges') : t('task.editor.create')}
          </Button>
        </>
      }
    >
      <FieldRow>
        <Label htmlFor="task-title">{t('task.editor.title')}</Label>
        <TextInput
          id="task-title"
          autoFocus
          value={draft.title}
          onChange={(e) => setDraft({ ...draft, title: e.target.value })}
          placeholder={t('task.editor.titlePlaceholder')}
          onKeyDown={(e) => {
            if (e.key === 'Enter') submit();
          }}
        />
        {touched && !valid ? <p className="mt-1.5 text-[12px] text-coral">{t('task.editor.titleRequired')}</p> : null}
      </FieldRow>

      <FieldRow>
        <Label htmlFor="task-desc">{t('task.editor.description')}</Label>
        <TextArea
          id="task-desc"
          rows={3}
          value={draft.description}
          onChange={(e) => setDraft({ ...draft, description: e.target.value })}
          placeholder={t('task.editor.descPlaceholder')}
        />
      </FieldRow>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FieldRow>
          <Label htmlFor="task-priority">{t('task.editor.priority')}</Label>
          <Select
            id="task-priority"
            value={draft.priority}
            onChange={(e) => setDraft({ ...draft, priority: e.target.value as TaskPriority })}
          >
            {(Object.keys(PRIORITY_LABEL) as TaskPriority[]).map((p) => (
              <option key={p} value={p}>
                {PRIORITY_LABEL[p]}
              </option>
            ))}
          </Select>
        </FieldRow>

        <FieldRow>
          <Label htmlFor="task-status">{t('task.editor.status')}</Label>
          <Select
            id="task-status"
            value={draft.status}
            onChange={(e) => setDraft({ ...draft, status: e.target.value as TaskStatus })}
          >
            {(Object.keys(STATUS_LABEL) as TaskStatus[]).map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </Select>
        </FieldRow>

        <FieldRow>
          <Label htmlFor="task-start">{t('task.editor.start')}</Label>
          <TextInput
            id="task-start"
            type="date"
            value={draft.startDate}
            onChange={(e) => setDraft({ ...draft, startDate: e.target.value })}
          />
        </FieldRow>

        <FieldRow>
          <Label htmlFor="task-due">{t('task.editor.due')}</Label>
          <TextInput
            id="task-due"
            type="date"
            value={draft.dueDate}
            onChange={(e) => setDraft({ ...draft, dueDate: e.target.value })}
          />
        </FieldRow>

        <FieldRow>
          <Label htmlFor="task-recurrence">{t('task.editor.repeats')}</Label>
          <Select
            id="task-recurrence"
            value={draft.recurrence}
            onChange={(e) => setDraft({ ...draft, recurrence: e.target.value as Recurrence })}
          >
            <option value="none">{t('task.recurrence.none')}</option>
            <option value="daily">{t('task.recurrence.daily')}</option>
            <option value="weekly">{t('task.recurrence.weekly')}</option>
            <option value="monthly">{t('task.recurrence.monthly')}</option>
          </Select>
        </FieldRow>
      </div>

      {ownerId ? (
        <AttachmentPanel ownerType="todo" ownerId={ownerId} ensureOwnerId={ensureOwnerId} compact className="mt-1" />
      ) : null}
    </Modal>
  );
}
