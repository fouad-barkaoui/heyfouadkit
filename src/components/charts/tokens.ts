/**
 * Chart parameters for the midnight surface.
 *
 * The three categorical slots were validated with the dataviz palette checker
 * against surface #0f1011 (`--pairs all`, dark mode): lightness band, chroma
 * floor, CVD separation (worst pair ΔE 14.7 protan / 10.5 tritan), normal-vision
 * floor (21.1) and ≥3:1 contrast all pass. Past three series, fold into "Other"
 * or facet rather than inventing a fourth hue.
 */
export const CATEGORICAL = ['#6366f1', '#12a3b0', '#dd6a4e'] as const;

/** Single-hue sequential ramp, low → high. Used for the activity heatmap. */
export const SEQUENTIAL = ['#191b33', '#26295c', '#37409a', '#4f57cf', '#7d84f4'] as const;

export const CHART_INK = {
  primary: 'var(--color-paper)',
  secondary: 'var(--color-mist)',
  muted: 'var(--color-fog)',
  faint: 'var(--color-ash)',
  grid: 'rgb(var(--tint-rgb) / 0.06)',
  axis: 'var(--color-graphite)',
  surface: 'var(--color-carbon)',
} as const;

/** Bars and areas that are about magnitude, not identity, use one hue. */
export const MAGNITUDE_HUE = '#6366f1';

export function rampStep(value: number, max: number): string {
  if (max <= 0 || value <= 0) return 'rgb(var(--tint-rgb) / 0.035)';
  const ratio = value / max;
  const index = Math.min(SEQUENTIAL.length - 1, Math.floor(ratio * SEQUENTIAL.length));
  return SEQUENTIAL[index] ?? SEQUENTIAL[0];
}
