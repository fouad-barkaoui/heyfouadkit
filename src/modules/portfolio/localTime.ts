import { translate } from '@/state/languageStore';

/** Fouad's home time zone. */
export const HOME_TZ = 'Africa/Casablanca';

/** Minutes the given time zone is ahead of UTC at `at` (DST-aware). */
export function tzOffsetMinutes(timeZone: string, at: Date): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(at);
  const get = (type: Intl.DateTimeFormatPartTypes): number => Number(parts.find((p) => p.type === type)?.value ?? 0);
  const asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'));
  return Math.round((asUtc - Math.floor(at.getTime() / 1000) * 1000) / 60000);
}

/** "1h ahead", "2h 30m behind", "same time as you". */
export function describeGap(homeMinutes: number, visitorMinutes: number): string {
  const diff = homeMinutes - visitorMinutes;
  if (diff === 0) return translate('pf.gap.same');
  const abs = Math.abs(diff);
  const amount = joinUnits('pf.gap.join', unit('hour', Math.floor(abs / 60)), unit('minute', abs % 60));
  return translate(diff > 0 ? 'pf.gap.ahead' : 'pf.gap.behind', { amount });
}

/**
 * "3h" / "3 ساعات" — picks the Arabic number form (1, 2, 3–10, 11+); English
 * uses the same short form for all of them. Empty for zero.
 */
function unit(name: 'hour' | 'minute' | 'month' | 'year', n: number): string {
  if (!n) return '';
  const tens = n % 100;
  const form = n === 1 ? 'one' : n === 2 ? 'two' : tens >= 3 && tens <= 10 ? 'few' : 'many';
  return translate(`pf.unit.${name}.${form}`, { n });
}

function joinUnits(joinKey: string, a: string, b: string): string {
  return a && b ? translate(joinKey, { a, b }) : a || b;
}

/** Greeting for the visitor's own hour of the day. */
export function greetingFor(hour: number): string {
  if (hour >= 5 && hour < 12) return translate('pf.greeting.morning');
  if (hour >= 12 && hour < 18) return translate('pf.greeting.afternoon');
  return translate('pf.greeting.evening');
}

/** "1m", "11m", "2y 7m" — calendar months from `start` (YYYY-MM) to `now`, at least 1. */
export function formatDuration(start: string, now: Date): string {
  const [y, m] = start.split('-').map(Number) as [number, number];
  const months = Math.max(1, (now.getFullYear() - y) * 12 + (now.getMonth() + 1 - m));
  const years = Math.floor(months / 12);
  const rest = months % 12;
  return joinUnits('pf.dur.join', unit('year', years), unit('month', rest));
}

/** "09.2026" from "2026-09". */
export function formatMonth(start: string): string {
  const [y, m] = start.split('-');
  return `${m}.${y}`;
}
