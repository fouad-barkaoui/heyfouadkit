import type { ModuleId } from '@/lib/types';

export type ShapeName = 'sphere' | 'helix' | 'grid' | 'torus' | 'lattice' | 'spiral' | 'ring';

/** Each module owns a formation, so switching views visibly re-forms the field. */
export const MODULE_SHAPE: Record<ModuleId, ShapeName> = {
  home: 'sphere',
  notebook: 'sphere',
  todo: 'helix',
  calendar: 'grid',
  team: 'ring',
  news: 'lattice',
  saveit: 'spiral',
  medications: 'torus',
  articles: 'grid',
  courses: 'torus',
  docs: 'lattice',
  vault: 'ring',
  reporting: 'spiral',
  analytics: 'spiral',
  trash: 'grid',
};

/** Accent the field tints toward, per module. */
export const MODULE_TINT: Record<ModuleId, [number, number, number]> = {
  home: [0.5, 0.5, 0.5],
  notebook: [0.55, 0.6, 0.72],
  todo: [0.89, 0.95, 0.13],
  calendar: [0.45, 0.8, 0.9],
  team: [0.7, 0.3, 0.8],
  news: [0.01, 0.72, 0.8],
  saveit: [0.96, 0.62, 0.04],
  medications: [0.15, 0.75, 0.35],
  articles: [0.39, 0.4, 0.95],
  courses: [0.01, 0.72, 0.8],
  docs: [0.55, 0.36, 0.96],
  vault: [0.92, 0.34, 0.34],
  reporting: [0.2, 0.7, 0.3],
  analytics: [0.15, 0.65, 0.27],
  trash: [0.7, 0.4, 0.2],
};

const TAU = Math.PI * 2;
const GOLDEN = Math.PI * (3 - Math.sqrt(5));

/** Deterministic pseudo-random so the field is identical across reloads. */
function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export function buildShape(name: ShapeName, count: number): Float32Array {
  const out = new Float32Array(count * 3);
  const rand = rng(0x5eed);

  for (let i = 0; i < count; i += 1) {
    const t = i / count;
    let x = 0;
    let y = 0;
    let z = 0;

    switch (name) {
      case 'sphere': {
        const phi = Math.acos(1 - 2 * (i + 0.5) / count);
        const theta = GOLDEN * i;
        const r = 5.4 + (rand() - 0.5) * 0.55;
        x = r * Math.sin(phi) * Math.cos(theta);
        y = r * Math.cos(phi);
        z = r * Math.sin(phi) * Math.sin(theta);
        break;
      }
      case 'helix': {
        const strand = i % 2 === 0 ? 0 : Math.PI;
        const a = t * TAU * 3.1 + strand;
        const r = 3.1 + (rand() - 0.5) * 0.32;
        x = Math.cos(a) * r;
        y = (t - 0.5) * 13;
        z = Math.sin(a) * r;
        break;
      }
      case 'grid': {
        const side = Math.ceil(Math.sqrt(count));
        const gx = i % side;
        const gz = Math.floor(i / side);
        x = (gx / side - 0.5) * 15;
        z = (gz / side - 0.5) * 15;
        y = Math.sin(x * 0.55) * Math.cos(z * 0.55) * 1.5 - 1.2 + (rand() - 0.5) * 0.16;
        break;
      }
      case 'torus': {
        const u = t * TAU * 7;
        const v = GOLDEN * i;
        const R = 4.5;
        const rr = 1.55 + (rand() - 0.5) * 0.3;
        x = (R + rr * Math.cos(v)) * Math.cos(u);
        y = rr * Math.sin(v);
        z = (R + rr * Math.cos(v)) * Math.sin(u);
        break;
      }
      case 'lattice': {
        const side = Math.ceil(Math.cbrt(count));
        const gx = i % side;
        const gy = Math.floor(i / side) % side;
        const gz = Math.floor(i / (side * side));
        const jitter = 0.22;
        x = (gx / (side - 1) - 0.5) * 9.5 + (rand() - 0.5) * jitter;
        y = (gy / (side - 1) - 0.5) * 9.5 + (rand() - 0.5) * jitter;
        z = (gz / (side - 1) - 0.5) * 9.5 + (rand() - 0.5) * jitter;
        break;
      }
      case 'spiral': {
        const arms = 3;
        const arm = i % arms;
        const a = t * TAU * 2.3 + (arm / arms) * TAU;
        const r = 0.6 + t * 6.4 + (rand() - 0.5) * 0.7;
        x = Math.cos(a) * r;
        z = Math.sin(a) * r;
        y = (rand() - 0.5) * (1.4 - t) * 2.4;
        break;
      }
      case 'ring': {
        const band = Math.floor(rand() * 3);
        const a = rand() * TAU;
        const r = 3.4 + band * 1.35 + (rand() - 0.5) * 0.28;
        x = Math.cos(a) * r;
        z = Math.sin(a) * r;
        y = (rand() - 0.5) * 0.55 + (band - 1) * 0.5;
        break;
      }
    }

    out[i * 3] = x;
    out[i * 3 + 1] = y;
    out[i * 3 + 2] = z;
  }

  return out;
}

export function buildSeeds(count: number): Float32Array {
  const rand = rng(0xbeef);
  const out = new Float32Array(count);
  for (let i = 0; i < count; i += 1) out[i] = rand();
  return out;
}
