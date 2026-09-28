import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Label, TextArea, TextInput } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import type { Goal, Habit } from '@/lib/types';
import { cn, nowISO, uid } from '@/lib/utils';
import { HABIT_COLORS, HABIT_EMOJI } from './habitMath';

const WEEK = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const WEEK_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function Swatches({ value, onChange }: { value: string; onChange: (c: string) => void }): JSX.Element {
  return (
    <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Colour">
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
  return (
    <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Icon">
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
      title={habit ? 'Edit habit' : 'New habit'}
      description="Small, specific and daily beats big and vague."
      width="sm"
      footer={
        <>
          {habit ? (
            <Button variant="quiet" className="me-auto text-coral" onClick={() => onDelete(habit)}>
              Delete
            </Button>
          ) : null}
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" disabled={!name.trim()} onClick={save}>
            {habit ? 'Save' : 'Create habit'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <Label htmlFor="hb-name">Habit</Label>
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
              placeholder="Read 10 pages, drink water, pray on time…"
            />
          </div>
        </div>
        <div>
          <Label>Icon</Label>
          <EmojiPick value={emoji} onChange={setEmoji} />
        </div>
        <div>
          <Label>Colour</Label>
          <Swatches value={color} onChange={setColor} />
        </div>
        <div>
          <Label>Repeat</Label>
          <div className="mb-2 flex flex-wrap gap-1.5">
            <button type="button" className="pill" data-active={preset === 'daily'} onClick={() => setDays([])}>
              Every day
            </button>
            <button type="button" className="pill" data-active={preset === 'weekdays'} onClick={() => setDays([1, 2, 3, 4, 5])}>
              Weekdays
            </button>
            <button type="button" className="pill" data-active={preset === 'custom'} onClick={() => setDays(days.length ? days : [1, 3, 5])}>
              Custom
            </button>
          </div>
          <div className="flex gap-1.5">
            {WEEK.map((d, i) => {
              const on = days.length === 0 || days.includes(i);
              return (
                <button
                  key={i}
                  type="button"
                  aria-pressed={on}
                  aria-label={WEEK_LONG[i]}
                  onClick={() => {
                    const base = days.length === 0 ? [0, 1, 2, 3, 4, 5, 6] : days;
                    const next = base.includes(i) ? base.filter((x) => x !== i) : [...base, i];
                    setDays(next.length === 0 || next.length === 7 ? [] : next);
                  }}
                  className={cn('hb-day flex h-9 w-9 items-center justify-center rounded-full text-[12px] font-medium', on && 'is-on')}
                  style={on ? { background: color, color: '#0b0c0e' } : undefined}
                >
                  {d}
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
      title={goal ? 'Edit goal' : 'New goal'}
      description="Name the outcome, then break it into steps you can act on."
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" disabled={!title.trim()} onClick={save}>
            {goal ? 'Save' : 'Create goal'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <Label htmlFor="gl-title">Goal</Label>
          <TextInput id="gl-title" autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Pass the CompTIA Security+ exam" />
        </div>
        <div>
          <Label htmlFor="gl-why">Why it matters</Label>
          <TextArea id="gl-why" rows={2} value={why} onChange={(e) => setWhy(e.target.value)} placeholder="Your reason — shown on the goal to keep you going." />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="gl-due">Target date</Label>
            <TextInput id="gl-due" type="date" value={due} onChange={(e) => setDue(e.target.value)} />
          </div>
          <div>
            <Label>Colour</Label>
            <Swatches value={color} onChange={setColor} />
          </div>
        </div>
        <div>
          <Label>Icon</Label>
          <EmojiPick value={emoji} onChange={setEmoji} />
        </div>
        <div>
          <Label htmlFor="gl-steps">{goal ? 'Add steps' : 'Steps'} — one per line</Label>
          <TextArea
            id="gl-steps"
            rows={4}
            value={stepsText}
            onChange={(e) => setStepsText(e.target.value)}
            placeholder={'Book the exam\nFinish the video course\nDo 3 practice tests'}
          />
        </div>
      </div>
    </Modal>
  );
}
