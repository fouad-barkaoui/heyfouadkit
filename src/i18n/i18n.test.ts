import { describe, expect, it } from 'vitest';
import type { Dictionary } from './types';

const AREAS = import.meta.glob<{ default: Dictionary }>('./*.ts', { eager: true });

describe('translation files', () => {
  it('are loaded as modules', () => {
    expect(typeof AREAS).toBe('object');
  });
  for (const [path, mod] of Object.entries(AREAS)) {
    if (path.endsWith('types.ts') || path.endsWith('.test.ts') || !mod.default) continue;
    it(`${path} has an Arabic phrase for every English one`, () => {
      const en = Object.keys(mod.default.en);
      const ar = new Set(Object.keys(mod.default.ar));
      expect(en.filter((k) => !ar.has(k))).toEqual([]);
      expect([...ar].filter((k) => !(k in mod.default.en))).toEqual([]);
      for (const k of en) {
        const slots = (s: string): string[] => (s.match(/\{\w+\}/g) ?? []).sort();
        expect(slots(mod.default.ar[k]!), `${path} ${k}`).toEqual(slots(mod.default.en[k]!));
      }
    });
  }
});
