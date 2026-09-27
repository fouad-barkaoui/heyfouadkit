import { describe, expect, it } from 'vitest';
import {
  dayBucket,
  domainOf,
  excerpt,
  formatBytes,
  groupByDay,
  isValidUrl,
  refCode,
  sanitizeHtml,
  stripHtml,
  tint,
  wordCount,
} from './utils';

const daysAgo = (n: number): string => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
};

describe('dayBucket', () => {
  it('labels today and yesterday by name', () => {
    expect(dayBucket(new Date().toISOString())).toBe('Today');
    expect(dayBucket(daysAgo(1))).toBe('Yesterday');
  });

  it('falls back to an explicit date beyond a week', () => {
    expect(dayBucket(daysAgo(20))).toMatch(/\d{4}$/);
  });
});

describe('groupByDay', () => {
  it('keeps buckets in input order and groups same-day items together', () => {
    const rows = [
      { id: 'a', at: new Date().toISOString() },
      { id: 'b', at: new Date().toISOString() },
      { id: 'c', at: daysAgo(1) },
    ];
    const grouped = groupByDay(rows, (r) => r.at);
    expect(grouped.map(([label]) => label)).toEqual(['Today', 'Yesterday']);
    expect(grouped[0]?.[1]).toHaveLength(2);
  });
});

describe('formatBytes', () => {
  it('scales units and handles the empty case', () => {
    expect(formatBytes(0)).toBe('—');
    expect(formatBytes(null)).toBe('—');
    expect(formatBytes(900)).toBe('900 B');
    expect(formatBytes(2048)).toBe('2.0 KB');
    expect(formatBytes(5 * 1024 * 1024)).toBe('5.0 MB');
  });
});

describe('tint', () => {
  it('expands shorthand hex and applies alpha', () => {
    expect(tint('#fff', 0.5)).toBe('rgba(255, 255, 255, 0.5)');
    expect(tint('#6366f1', 0.2)).toBe('rgba(99, 102, 241, 0.2)');
  });
});

describe('sanitizeHtml', () => {
  it('removes script blocks, inline handlers and javascript: urls', () => {
    const dirty = '<p onclick="steal()">hi</p><script>alert(1)</script><a href="javascript:bad()">x</a>';
    const clean = sanitizeHtml(dirty);
    expect(clean).not.toContain('script');
    expect(clean).not.toContain('onclick');
    expect(clean).not.toContain('javascript:');
    expect(clean).toContain('hi');
  });

  it('leaves ordinary formatting intact', () => {
    expect(sanitizeHtml('<p><strong>bold</strong></p>')).toBe('<p><strong>bold</strong></p>');
  });
});

describe('text helpers', () => {
  it('strips markup and counts words', () => {
    expect(stripHtml('<p>two&nbsp;words</p>')).toBe('two words');
    expect(wordCount('<p>one two three</p>')).toBe(3);
    expect(wordCount('')).toBe(0);
  });

  it('truncates with an ellipsis only when needed', () => {
    expect(excerpt('<p>short</p>', 40)).toBe('short');
    expect(excerpt(`<p>${'x'.repeat(80)}</p>`, 20)).toHaveLength(21);
  });
});

describe('refCode', () => {
  it('is stable for the same id and differs across ids', () => {
    expect(refCode('NOTE', 'abc')).toBe(refCode('NOTE', 'abc'));
    expect(refCode('NOTE', 'abc')).not.toBe(refCode('NOTE', 'abd'));
    expect(refCode('TSK', 'abc')).toMatch(/^TSK-\d{4}$/);
  });
});

describe('url helpers', () => {
  it('accepts http(s) only', () => {
    expect(isValidUrl('https://example.com')).toBe(true);
    expect(isValidUrl('ftp://example.com')).toBe(false);
    expect(isValidUrl('not a url')).toBe(false);
  });

  it('strips the www prefix from a host', () => {
    expect(domainOf('https://www.example.com/path')).toBe('example.com');
    expect(domainOf('nonsense')).toBe('nonsense');
  });
});
