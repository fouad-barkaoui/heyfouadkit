import { describe, expect, it } from 'vitest';
import { resolveTheme } from './themeStore';

describe('resolveTheme', () => {
  it('follows the device when set to system', () => {
    expect(resolveTheme('system', 'dark')).toBe('dark');
    expect(resolveTheme('system', 'light')).toBe('light');
  });

  it('lets an explicit choice override the device', () => {
    expect(resolveTheme('light', 'dark')).toBe('light');
    expect(resolveTheme('dark', 'light')).toBe('dark');
  });
});
