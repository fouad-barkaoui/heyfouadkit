import { ChevronLeft, ChevronRight, Minus, Plus, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button, IconButton } from '@/components/ui/Button';
import { ConfirmDelete } from '@/components/ui/ConfirmDelete';
import { FieldRow, Label, TextInput } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import type { DoseUnit, DurationUnit, Medicine, MedicineType } from '@/lib/types';
import { cn, nowISO, uid } from '@/lib/utils';
import {
  addDuration,
  DOSE_UNITS,
  DURATION_UNITS,
  EVERY_DAY,
  EVERY_OTHER_DAY,
  WEEKDAY_LETTERS,
} from './medsMeta';

interface MedDraft {
  name: string;
  dosage: string;
  unit: DoseUnit;
  type: MedicineType;
  days: number[];
  times: string[];
  ongoing: boolean;
  durationValue: number;
  durationUnit: DurationUnit;
}

const blank = (): MedDraft => ({
  name: '',
  dosage: '',
  unit: 'mg',
  type: 'scheduled',
  days: [...EVERY_DAY],
  times: ['08:00'],
  ongoing: false,
  durationValue: 7,
  durationUnit: 'Days',
});

const to24 = (label: string): string => {
  // Best-effort parse of a stored "8:30 AM" style label back to "HH:MM" for the <input type="time">.
  const m = /^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i.exec(label.trim());
  if (!m) return '08:00';
  let h = Number(m[1]);
  const mins = m[2];
  const ap = m[3]?.toUpperCase();
  if (ap === 'PM' && h !== 12) h += 12;
  if (ap === 'AM' && h === 12) h = 0;
  return `${String(h).padStart(2, '0')}:${mins}`;
};

const to12 = (value: string): string => {
  const [hStr, mStr] = value.split(':');
  let h = Number(hStr);
  const ap = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${mStr} ${ap}`;
};

const STEPS = ['Name & dose', 'Schedule', 'Duration'] as const;

export function MedicineEditor({
  open,
  onOpenChange,
  medicine,
  treatmentPlanId,
  onSave,
  onDelete,
  onComplete,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  medicine: Medicine | null;
  /** Pre-assigns a new medicine to this plan. Ignored when editing. */
  treatmentPlanId?: string | null;
  onSave: (med: Medicine) => void;
  onDelete?: (id: string) => void;
  onComplete?: (id: string) => void;
}): JSX.Element {
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<MedDraft>(blank);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (!open) return;
    setStep(0);
    setTouched(false);
    setDraft(
      medicine
        ? {
            name: medicine.name,
            dosage: medicine.dosage,
            unit: medicine.unit,
            type: medicine.type,
            days: medicine.days.length ? medicine.days : [...EVERY_DAY],
            times: medicine.times.length ? medicine.times.map(to24) : ['08:00'],
            ongoing: !medicine.endDate,
            durationValue: medicine.durationValue,
            durationUnit: medicine.durationUnit,
          }
        : blank(),
    );
  }, [open, medicine]);

  const nameValid = draft.name.trim().length > 0;
  const dosageValid = draft.dosage.trim().length > 0;

  const canAdvance = step === 0 ? nameValid && dosageValid : true;

  const submit = (): void => {
    setTouched(true);
    if (!nameValid || !dosageValid) {
      setStep(0);
      return;
    }
    const startDate = medicine?.startDate ?? nowISO();
    const endDate = draft.ongoing ? null : addDuration(startDate, draft.durationValue, draft.durationUnit);
    const base: Medicine = medicine ?? {
      id: uid('med'),
      name: '',
      dosage: '',
      unit: 'mg',
      type: 'scheduled',
      days: [],
      times: [],
      startDate,
      endDate: null,
      durationValue: 7,
      durationUnit: 'Days',
      treatmentPlanId: treatmentPlanId ?? null,
      completed: false,
      createdAt: nowISO(),
      updatedAt: nowISO(),
    };
    onSave({
      ...base,
      name: draft.name.trim(),
      dosage: draft.dosage.trim(),
      unit: draft.unit,
      type: draft.type,
      days: draft.type === 'scheduled' ? draft.days : [],
      times: draft.type === 'scheduled' ? draft.times.map(to12) : [],
      endDate,
      durationValue: draft.durationValue,
      durationUnit: draft.durationUnit,
      updatedAt: nowISO(),
    });
    onOpenChange(false);
  };

  const toggleDay = (d: number): void => {
    setDraft((cur) => ({
      ...cur,
      days: cur.days.includes(d) ? cur.days.filter((x) => x !== d) : [...cur.days, d].sort((a, b) => a - b),
    }));
  };

  const addTime = (): void => setDraft((cur) => ({ ...cur, times: [...cur.times, '12:00'] }));
  const removeTime = (i: number): void =>
    setDraft((cur) => ({ ...cur, times: cur.times.filter((_, idx) => idx !== i) }));
  const setTime = (i: number, value: string): void =>
    setDraft((cur) => ({ ...cur, times: cur.times.map((t, idx) => (idx === i ? value : t)) }));

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={medicine ? 'Edit medicine' : 'New medicine'}
      description={STEPS[step]}
      width="lg"
      footer={
        <div className="flex w-full items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            {medicine && onDelete ? (
              <ConfirmDelete onConfirm={() => onDelete(medicine.id)} label="Delete medicine" />
            ) : null}
            {medicine && onComplete && !medicine.completed ? (
              <Button onClick={() => onComplete(medicine.id)}>Mark complete</Button>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            {step > 0 ? (
              <IconButton label="Previous step" onClick={() => setStep((s) => s - 1)}>
                <ChevronLeft size={15} strokeWidth={1.9} />
              </IconButton>
            ) : null}
            {step < STEPS.length - 1 ? (
              <Button
                variant="primary"
                icon={<ChevronRight size={14} strokeWidth={2} />}
                onClick={() => canAdvance && setStep((s) => s + 1)}
              >
                Next
              </Button>
            ) : (
              <Button variant="primary" onClick={submit}>
                {medicine ? 'Save changes' : 'Create medicine'}
              </Button>
            )}
          </div>
        </div>
      }
    >
      {/* Step indicator */}
      <div className="mb-4 flex items-center gap-1.5">
        {STEPS.map((label, i) => (
          <div key={label} className="flex flex-1 items-center gap-1.5">
            <span
              className={cn(
                'flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10.5px]',
                i === step
                  ? 'bg-acid text-void'
                  : i < step
                    ? 'bg-[rgb(var(--tint-rgb)/0.1)] text-mist'
                    : 'bg-[rgb(var(--tint-rgb)/0.05)] text-ash',
              )}
            >
              {i + 1}
            </span>
            <span className={cn('text-[11px]', i === step ? 'text-mist' : 'text-ash')}>{label}</span>
            {i < STEPS.length - 1 ? <span className="h-px flex-1 bg-graphite" aria-hidden /> : null}
          </div>
        ))}
      </div>

      {step === 0 ? (
        <div className="space-y-4">
          <FieldRow>
            <Label htmlFor="med-name">Medicine name</Label>
            <TextInput
              id="med-name"
              autoFocus
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              placeholder="Enter medicine name"
            />
            {touched && !nameValid ? <p className="mt-1.5 text-[12px] text-coral">Please name the medicine.</p> : null}
          </FieldRow>

          <FieldRow>
            <Label>Dosage</Label>
            <div className="flex items-center gap-2">
              <TextInput
                inputMode="decimal"
                value={draft.dosage}
                onChange={(e) => setDraft({ ...draft, dosage: e.target.value })}
                placeholder="500"
                className="max-w-[140px]"
              />
              <div className="flex flex-wrap gap-1.5">
                {DOSE_UNITS.map((u) => (
                  <button
                    key={u}
                    type="button"
                    className="pill"
                    data-active={draft.unit === u}
                    onClick={() => setDraft({ ...draft, unit: u })}
                  >
                    {u}
                  </button>
                ))}
              </div>
            </div>
            {touched && !dosageValid ? (
              <p className="mt-1.5 text-[12px] text-coral">Please provide the amount.</p>
            ) : null}
          </FieldRow>

          <FieldRow>
            <Label>Type</Label>
            <div className="flex gap-1.5">
              <button
                type="button"
                className="pill"
                data-active={draft.type === 'scheduled'}
                onClick={() => setDraft({ ...draft, type: 'scheduled' })}
              >
                Scheduled
              </button>
              <button
                type="button"
                className="pill"
                data-active={draft.type === 'as_needed'}
                onClick={() => setDraft({ ...draft, type: 'as_needed' })}
              >
                As needed
              </button>
            </div>
          </FieldRow>
        </div>
      ) : null}

      {step === 1 ? (
        <div className="space-y-4">
          {draft.type === 'as_needed' ? (
            <p className="rounded-[8px] bg-[rgb(var(--tint-rgb)/0.03)] p-3 text-[12.5px] text-ash">
              "As needed" medicines don't carry a fixed schedule — log a dose whenever it's taken.
            </p>
          ) : (
            <>
              <FieldRow>
                <Label>Days</Label>
                <div className="mb-2 flex gap-1.5">
                  <button type="button" className="pill" onClick={() => setDraft({ ...draft, days: [...EVERY_DAY] })}>
                    Every day
                  </button>
                  <button
                    type="button"
                    className="pill"
                    onClick={() => setDraft({ ...draft, days: [...EVERY_OTHER_DAY] })}
                  >
                    Every other
                  </button>
                </div>
                <div className="flex gap-1.5">
                  {WEEKDAY_LETTERS.map((letter, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => toggleDay(i)}
                      aria-pressed={draft.days.includes(i)}
                      className={cn(
                        'flex h-8 w-8 items-center justify-center rounded-full text-[12px] transition-colors duration-150',
                        draft.days.includes(i)
                          ? 'bg-acid text-void'
                          : 'bg-[rgb(var(--tint-rgb)/0.05)] text-ash hover:text-mist',
                      )}
                    >
                      {letter}
                    </button>
                  ))}
                </div>
              </FieldRow>

              <FieldRow>
                <Label>Times</Label>
                <div className="mb-2 flex gap-1.5">
                  <button
                    type="button"
                    className="pill"
                    onClick={() => setDraft({ ...draft, times: ['00:00', '08:00', '16:00'] })}
                  >
                    Every 8h
                  </button>
                  <button type="button" className="pill" onClick={() => setDraft({ ...draft, times: ['08:00', '20:00'] })}>
                    Every 12h
                  </button>
                </div>
                <div className="space-y-2">
                  {draft.times.map((t, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input
                        type="time"
                        value={t}
                        onChange={(e) => setTime(i, e.target.value)}
                        className="field max-w-[160px]"
                        aria-label={`Time ${i + 1}`}
                      />
                      {draft.times.length > 1 ? (
                        <IconButton label="Remove time" onClick={() => removeTime(i)}>
                          <X size={13} strokeWidth={1.9} />
                        </IconButton>
                      ) : null}
                    </div>
                  ))}
                </div>
                <Button className="mt-2" icon={<Plus size={13} strokeWidth={2} />} onClick={addTime}>
                  Add a time
                </Button>
              </FieldRow>
            </>
          )}
        </div>
      ) : null}

      {step === 2 ? (
        <div className="space-y-4">
          <FieldRow>
            <Label>Duration</Label>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 rounded-[7px] bg-[rgb(var(--tint-rgb)/0.03)] p-1 shadow-[inset_0_0_0_1px_var(--color-graphite)]">
                <IconButton
                  label="Decrease"
                  onClick={() => setDraft((c) => ({ ...c, durationValue: Math.max(1, c.durationValue - 1) }))}
                >
                  <Minus size={13} strokeWidth={2} />
                </IconButton>
                <span className="num w-8 text-center text-[13.5px] text-paper">{draft.durationValue}</span>
                <IconButton
                  label="Increase"
                  onClick={() => setDraft((c) => ({ ...c, durationValue: c.durationValue + 1 }))}
                >
                  <Plus size={13} strokeWidth={2} />
                </IconButton>
              </div>
              <div className="flex gap-1.5">
                {DURATION_UNITS.map((u) => (
                  <button
                    key={u}
                    type="button"
                    className="pill"
                    data-active={draft.durationUnit === u}
                    onClick={() => setDraft({ ...draft, durationUnit: u })}
                  >
                    {u}
                  </button>
                ))}
              </div>
            </div>
          </FieldRow>

          <FieldRow>
            <label className="flex items-center gap-2 text-[12.5px] text-mist">
              <input
                type="checkbox"
                checked={draft.ongoing}
                onChange={(e) => setDraft({ ...draft, ongoing: e.target.checked })}
                className="h-4 w-4 accent-[var(--color-acid)]"
              />
              Ongoing — no end date (∞)
            </label>
          </FieldRow>

          <p className="rounded-[8px] bg-[rgb(var(--tint-rgb)/0.03)] p-3 text-[12.5px] text-ash">
            {draft.ongoing
              ? 'This medicine continues indefinitely once started.'
              : `Runs for ${draft.durationValue} ${draft.durationUnit.toLowerCase()} from the start date.`}
          </p>
        </div>
      ) : null}
    </Modal>
  );
}
