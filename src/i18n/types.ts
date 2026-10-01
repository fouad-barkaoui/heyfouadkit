/** One area's phrases. Every key in `en` must exist in `ar` (checked by i18n.test.ts). */
export interface Dictionary {
  en: Record<string, string>;
  ar: Record<string, string>;
}

/** Identity helper so each area file gets type-checked as a Dictionary. */
export const defineDictionary = (d: Dictionary): Dictionary => d;
