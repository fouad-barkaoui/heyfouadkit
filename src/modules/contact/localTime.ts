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
  if (diff === 0) return 'same time as you';
  const abs = Math.abs(diff);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  const amount = [h ? `${h}h` : '', m ? `${m}m` : ''].filter(Boolean).join(' ');
  return `${amount} ${diff > 0 ? 'ahead' : 'behind'}`;
}

/** Greeting for the visitor's own hour of the day. */
export function greetingFor(hour: number): string {
  if (hour >= 5 && hour < 12) return 'Good morning';
  if (hour >= 12 && hour < 18) return 'Good afternoon';
  return 'Good evening';
}

/** "1m", "11m", "2y 7m" — calendar months from `start` (YYYY-MM) to `now`, at least 1. */
export function formatDuration(start: string, now: Date): string {
  const [y, m] = start.split('-').map(Number) as [number, number];
  const months = Math.max(1, (now.getFullYear() - y) * 12 + (now.getMonth() + 1 - m));
  const years = Math.floor(months / 12);
  const rest = months % 12;
  return [years ? `${years}y` : '', rest ? `${rest}m` : ''].filter(Boolean).join(' ');
}

/** "09.2026" from "2026-09". */
export function formatMonth(start: string): string {
  const [y, m] = start.split('-');
  return `${m}.${y}`;
}
