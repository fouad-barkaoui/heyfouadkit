import type { DoseUnit, DurationUnit, Medicine } from '@/lib/types';
import { translate } from '@/state/languageStore';

/** Weekday indexes (0 = Sunday). Labels come from `weekdayLetter` / `weekdayName` so they follow the language. */
export const WEEKDAYS = [0, 1, 2, 3, 4, 5, 6];

export const weekdayLetter = (d: number): string => translate(`med.weekday.letter.${d}`);
export const weekdayName = (d: number): string => translate(`med.weekday.name.${d}`);

export const DOSE_UNITS: DoseUnit[] = ['mg', 'mL', 'tablet', 'capsule', 'g'];
export const DURATION_UNITS: DurationUnit[] = ['Days', 'Weeks', 'Months'];

/** Display label for a dose unit — metric units stay Latin, countable forms are translated. */
export function doseUnitLabel(unit: DoseUnit): string {
  return unit === 'tablet' || unit === 'capsule' ? translate(`med.unit.${unit}`) : unit;
}

export const durationUnitLabel = (unit: DurationUnit): string => translate(`med.durationUnit.${unit}`);

/** Stored default prescriber when none is given. Kept in English in data, translated for display. */
export const SELF_MANAGED = 'Self-managed';
export const prescriberLabel = (prescriber: string): string =>
  prescriber === SELF_MANAGED ? translate('med.plan.selfManaged') : prescriber;

export const EVERY_DAY = [0, 1, 2, 3, 4, 5, 6];
export const EVERY_OTHER_DAY = [0, 2, 4, 6];

/** Short frequency badge text — "3x daily" for a scheduled medicine, "As needed" otherwise. */
export function frequencyLabel(med: Medicine): string {
  if (med.type === 'as_needed') return translate('med.type.asNeeded');
  const n = med.times.length || 1;
  if (n === 1) return translate('med.freq.once', { count: n });
  if (n === 2) return translate('med.freq.twice', { count: n });
  return translate('med.freq.many', { count: n });
}

export function addDuration(startIso: string, value: number, unit: DurationUnit): string {
  const d = new Date(startIso);
  if (unit === 'Days') d.setDate(d.getDate() + value);
  else if (unit === 'Weeks') d.setDate(d.getDate() + value * 7);
  else d.setMonth(d.getMonth() + value);
  return d.toISOString();
}

export function formatDaysShort(days: number[]): string {
  if (days.length === 7) return translate('med.days.everyDay');
  if (days.length === 0) return translate('med.days.none');
  const sorted = [...days].sort((a, b) => a - b);
  if (sorted.join(',') === EVERY_OTHER_DAY.join(',')) return translate('med.days.everyOtherDay');
  return sorted.map((d) => weekdayLetter(d)).join(' ');
}

/** True when today falls on one of the medicine's scheduled days (always true for as-needed). */
export function isDueToday(med: Medicine): boolean {
  if (med.type === 'as_needed') return true;
  const today = new Date().getDay();
  return med.days.includes(today);
}
