import type { DoseUnit, DurationUnit, Medicine } from '@/lib/types';

export const WEEKDAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
export const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export const DOSE_UNITS: DoseUnit[] = ['mg', 'mL', 'tablet', 'capsule', 'g'];
export const DURATION_UNITS: DurationUnit[] = ['Days', 'Weeks', 'Months'];

export const EVERY_DAY = [0, 1, 2, 3, 4, 5, 6];
export const EVERY_OTHER_DAY = [0, 2, 4, 6];

/** Short frequency badge text — "3x · ⌛" for a scheduled medicine, "As needed · ⌛" otherwise. */
export function frequencyLabel(med: Medicine): string {
  if (med.type === 'as_needed') return 'As needed';
  const n = med.times.length || 1;
  return `${n}x daily`;
}

export function addDuration(startIso: string, value: number, unit: DurationUnit): string {
  const d = new Date(startIso);
  if (unit === 'Days') d.setDate(d.getDate() + value);
  else if (unit === 'Weeks') d.setDate(d.getDate() + value * 7);
  else d.setMonth(d.getMonth() + value);
  return d.toISOString();
}

export function formatDaysShort(days: number[]): string {
  if (days.length === 7) return 'Every day';
  if (days.length === 0) return 'No days set';
  const sorted = [...days].sort((a, b) => a - b);
  if (sorted.join(',') === EVERY_OTHER_DAY.join(',')) return 'Every other day';
  return sorted.map((d) => WEEKDAY_LETTERS[d]).join(' ');
}

/** True when today falls on one of the medicine's scheduled days (always true for as-needed). */
export function isDueToday(med: Medicine): boolean {
  if (med.type === 'as_needed') return true;
  const today = new Date().getDay();
  return med.days.includes(today);
}
