import { describe, expect, it } from 'vitest';
import { describeGap, greetingFor, tzOffsetMinutes } from './localTime';

describe('tzOffsetMinutes', () => {
  it('is zero for UTC', () => {
    expect(tzOffsetMinutes('UTC', new Date('2026-10-01T18:00:00Z'))).toBe(0);
  });

  it('follows daylight saving', () => {
    expect(tzOffsetMinutes('Europe/Paris', new Date('2026-07-01T12:00:00Z'))).toBe(120);
    expect(tzOffsetMinutes('Europe/Paris', new Date('2026-01-15T12:00:00Z'))).toBe(60);
  });

  it('handles half-hour zones', () => {
    expect(tzOffsetMinutes('Asia/Kolkata', new Date('2026-10-01T18:00:00Z'))).toBe(330);
  });
});

describe('describeGap', () => {
  it('says when the clocks match', () => {
    expect(describeGap(60, 60)).toBe('same time as you');
  });

  it('describes hours ahead and behind', () => {
    expect(describeGap(60, 0)).toBe('1h ahead');
    expect(describeGap(60, 420)).toBe('6h behind');
  });

  it('keeps the minutes of half-hour gaps', () => {
    expect(describeGap(60, 330)).toBe('4h 30m behind');
    expect(describeGap(30, 0)).toBe('30m ahead');
  });
});

describe('greetingFor', () => {
  it('follows the hour', () => {
    expect(greetingFor(8)).toBe('Good morning');
    expect(greetingFor(14)).toBe('Good afternoon');
    expect(greetingFor(21)).toBe('Good evening');
    expect(greetingFor(2)).toBe('Good evening');
  });
});
