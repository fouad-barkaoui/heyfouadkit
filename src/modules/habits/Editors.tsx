import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Label, TextArea, TextInput } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import type { Goal, Habit } from '@/lib/types';
import { cn, nowISO, uid } from '@/lib/utils';
import { useLanguage } from '@/state/languageStore';
import { HABIT_COLORS, HABIT_EMOJI } from './habitMath';

const WEEK = [0, 1, 2, 3, 4, 5, 6];

/** Weekday name for index 0–6 (2026-09-27 is a Sunday). */
function weekdayName(day: number, locale: string, weekday: 'narrow' | 'long'): string {
  return new Date(2026, 8, 27 + day).toLocaleDateString(locale, { weekday });
}

function Swatches({ value, onChange }: { value: string; onChange: (c: string) => void }): JSX.Element {
  const { t } = useLanguage();
  return (
    <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={t('hab.colour')}>
      {HABIT_COLORS.map((c) => (
        <button
          key={c}
          type="button"
          role="radio"
          aria-checked={value === c}
          aria-label={c}
          onClick={() => onChange(c)}
          className={cn('hb-swatch h-7 w-7 rounded-full', value === c && 'is-on')}
          style={{ background: c }}
        />
      ))}
    </div>
  );
}

function EmojiPick({ value, onChange }: { value: string; onChange: (e: string) => void }): JSX.Element {
  const { t } = useLanguage();
  return (
    <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label={t('hab.icon')}>
      {HABIT_EMOJI.map((e) => (
        <button
          key={e}
          type="button"
          role="radio"
          aria-checked={value === e}
          onClick={() => onChange(e)}
          className={cn('hb-emoji flex h-9 w-9 items-center justify-center rounded-[10px] text-[18px]', value === e && 'is-on')}
        >
          {e}
        </button>
      ))}
    </div>
  );
}

export function HabitEditor({
  open,
  habit,
  onClose,
  onSave,
  onDelete,
}: {
  open: boolean;
  habit: Habit | null;
  onClose: () => void;
  onSave: (h: Habit) => void;
  onDelete: (h: Habit) => void;
}): JSX.Element {
  const { t, locale } = useLanguage();
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState(HABIT_EMOJI[0]!);
  const [color, setColor] = useState(HABIT_COLORS[0]!);
  const [days, setDays] = useState<number[]>([]);

  useEffect(() => {
    if (!open) return;
    setName(habit?.name ?? '');
    setEmoji(habit?.emoji ?? HABIT_EMOJI[0]!);
    setColor(habit?.color ?? HABIT_COLORS[0]!);
    setDays(habit?.days ?? []);
  }, [open, habit]);

  const preset = days.length === 0 ? 'daily' : days.join() === '1,2,3,4,5' ? 'weekdays' : 'custom';

  const save = (): void => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const now = nowISO();
    onSave({
      id: habit?.id ?? uid('hab'),
      name: trimmed.slice(0, 120),
      emoji,
      color,
      days: days.length === 7 ? [] : [...days].sort(),
      log: habit?.log ?? [],
      archived: habit?.archived ?? false,
      createdAt: habit?.createdAt ?? now,
      updatedAt: now,
      isDeleted: false,
      deletedAt: null,
    });
    onClose();
  };

  return (
    <Modal
      open={open}
      onOpenChange={(o) => (!o ? onClose() : undefined)}
      title={habit ? t('hab.editHabit') : t('hab.newHabit')}
      description={t('hab.habitHint')}
      width="sm"
      footer={
        <>
          {habit ? (
            <Button variant="quiet" className="me-auto text-coral" onClick={() => onDelete(habit)}>
              {t('hab.delete')}
            </Button>
          ) : null}
          <Button onClick={onClose}>{t('hab.cancel')}</Button>
          <Button variant="primary" disabled={!name.trim()} onClick={save}>
            {habit ? t('hab.save') : t('hab.createHabit')}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <Label htmlFor="hb-name">{t('hab.habit')}</Label>
          <div className="flex items-center gap-2">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] text-[20px]" style={{ background: `${color}22` }}>
              {emoji}
            </span>
            <TextInput
              id="hb-name"
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && save()}
              placeholder={t('hab.habitPlaceholder')}
            />
          </div>
        </div>
        <div>
          <Label>{t('hab.icon')}</Label>
          <EmojiPick value={emoji} onChange={setEmoji} />
        </div>
        <div>
          <Label>{t('hab.colour')}</Label>
          <Swatches value={color} onChange={setColor} />
        </div>
        <div>
          <Label>{t('hab.repeat')}</Label>
          <div className="mb-2 flex flex-wrap gap-1.5">
            <button type="button" className="pill" data-active={preset === 'daily'} onClick={() => setDays([])}>
              {t('hab.everyDay')}
            </button>
            <button type="button" className="pill" data-active={preset === 'weekdays'} onClick={() => setDays([1, 2, 3, 4, 5])}>
              {t('hab.weekdays')}
            </button>
            <button type="button" className="pill" data-active={preset === 'custom'} onClick={() => setDays(days.length ? days : [1, 3, 5])}>
              {t('hab.custom')}
            </button>
          </div>
          <div className="flex gap-1.5">
            {WEEK.map((i) => {
              const on = days.length === 0 || days.includes(i);
              return (
                <button
                  key={i}
                  type="button"
                  aria-pressed={on}
                  aria-label={weekdayName(i, locale, 'long')}
                  onClick={() => {
                    const base = days.length === 0 ? [0, 1, 2, 3, 4, 5, 6] : days;
                    const next = base.includes(i) ? base.filter((x) => x !== i) : [...base, i];
                    setDays(next.length === 0 || next.length === 7 ? [] : next);
                  }}
                  className={cn('hb-day flex h-9 w-9 items-center justify-center rounded-full text-[12px] font-medium', on && 'is-on')}
                  style={on ? { background: color, color: '#0b0c0e' } : undefined}
                >
                  {weekdayName(i, locale, 'narrow')}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </Modal>
  );
}

export function GoalEditor({
  open,
  goal,
  onClose,
  onSave,
}: {
  open: boolean;
  goal: Goal | null;
  onClose: () => void;
  onSave: (g: Goal) => void;
}): JSX.Element {
  const { t } = useLanguage();
  const [title, setTitle] = useState('');
  const [why, setWhy] = useState('');
  const [emoji, setEmoji] = useState('🎯');
  const [color, setColor] = useState(HABIT_COLORS[1]!);
  const [due, setDue] = useState('');
  const [stepsText, setStepsText] = useState('');

  useEffect(() => {
    if (!open) return;
    setTitle(goal?.title ?? '');
    setWhy(goal?.why ?? '');
    setEmoji(goal?.emoji ?? '🎯');
    setColor(goal?.color ?? HABIT_COLORS[1]!);
    setDue(goal?.dueDate ? goal.dueDate.slice(0, 10) : '');
    setStepsText('');
  }, [open, goal]);

  const save = (): void => {
    const t = title.trim();
    if (!t) return;
    const now = nowISO();
    const newSteps = stepsText
      .split('\n')
      .map((l) => l.replace(/^[-*•\d.)\s]+/, '').trim())
      .filter(Boolean)
      .map((s) => ({ id: uid('stp'), title: s.slice(0, 200), done: false, todoId: null, dueDate: null }));
    onSave({
      id: goal?.id ?? uid('goal'),
      title: t.slice(0, 200),
      why: why.slice(0, 4000),
      emoji,
      color,
      dueDate: due ? new Date(`${due}T12:00:00`).toISOString() : null,
      steps: [...(goal?.steps ?? []), ...newSteps],
      status: goal?.status ?? 'active',
      createdAt: goal?.createdAt ?? now,
      updatedAt: now,
      isDeleted: false,
      deletedAt: null,
    });
    onClose();
  };

  return (
    <Modal
      open={open}
      onOpenChange={(o) => (!o ? onClose() : undefined)}
      title={goal ? t('hab.editGoal') : t('hab.newGoal')}
      description={t('hab.goalHint')}
      footer={
        <>
          <Button onClick={onClose}>{t('hab.cancel')}</Button>
          <Button variant="primary" disabled={!title.trim()} onClick={save}>
            {goal ? t('hab.save') : t('hab.createGoal')}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <Label htmlFor="gl-title">{t('hab.goal')}</Label>
          <TextInput id="gl-title" autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t('hab.goalPlaceholder')} />
        </div>
        <div>
          <Label htmlFor="gl-why">{t('hab.why')}</Label>
          <TextArea id="gl-why" rows={2} value={why} onChange={(e) => setWhy(e.target.value)} placeholder={t('hab.whyPlaceholder')} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="gl-due">{t('hab.targetDate')}</Label>
            <TextInput id="gl-due" type="date" value={due} onChange={(e) => setDue(e.target.value)} />
          </div>
          <div>
            <Label>{t('hab.colour')}</Label>
            <Swatches value={color} onChange={setColor} />
          </div>
        </div>
        <div>
          <Label>{t('hab.icon')}</Label>
          <EmojiPick value={emoji} onChange={setEmoji} />
        </div>
        <div>
          <Label htmlFor="gl-steps">{goal ? t('hab.addStepsLine') : t('hab.stepsLine')}</Label>
          <TextArea
            id="gl-steps"
            rows={4}
            value={stepsText}
            onChange={(e) => setStepsText(e.target.value)}
            placeholder={t('hab.stepsPlaceholder')}
          />
        </div>
      </div>
    </Modal>
  );
}
