import { friendlyCloudError, retryTransient } from './cloudErrors';
import { getSupabase } from './supabaseClient';

/** Public bucket created in supabase/schema.sql — writes are limited to the owner's uid folder. */
export const AVATAR_BUCKET = 'avatars';
/** Rendered output edge, in px. 512 stays crisp on 3x screens at the largest (160px) display size. */
export const AVATAR_EDGE = 512;
/** Upload guard for the *source* file; the cropped output is always far smaller. */
export const MAX_AVATAR_SOURCE_BYTES = 12 * 1024 * 1024;
export const AVATAR_ACCEPT = 'image/png,image/jpeg,image/webp,image/gif,image/avif';

const LOCAL_KEY = 'heyfouad.avatar.local.v1';
export const AVATAR_EVENT = 'heyfouad:avatar-local';

export interface CropState {
  /** Zoom factor on top of "cover" fit — 1 means the short edge fills the circle. */
  zoom: number;
  /** Offset of the image centre from the frame centre, as a fraction of the frame edge. */
  x: number;
  y: number;
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('That image could not be opened. Try a PNG, JPG or WebP.'));
    img.src = src;
  });
}

/** Cover-fit scale so the image's short edge exactly fills a frame of `edge` px. */
export function coverScale(img: { naturalWidth: number; naturalHeight: number }, edge: number): number {
  return edge / Math.min(img.naturalWidth, img.naturalHeight);
}

/** Keep the image covering the frame — no empty corners, whatever the zoom. */
export function clampCrop(img: { naturalWidth: number; naturalHeight: number }, crop: CropState): CropState {
  const s = coverScale(img, 1) * crop.zoom;
  const maxX = Math.max(0, (img.naturalWidth * s - 1) / 2);
  const maxY = Math.max(0, (img.naturalHeight * s - 1) / 2);
  return {
    zoom: crop.zoom,
    x: Math.min(maxX, Math.max(-maxX, crop.x)),
    y: Math.min(maxY, Math.max(-maxY, crop.y)),
  };
}

/** Draw the chosen square out of the source image, at AVATAR_EDGE, as WebP (PNG fallback). */
export async function renderCrop(img: HTMLImageElement, crop: CropState): Promise<Blob> {
  const edge = AVATAR_EDGE;
  const canvas = document.createElement('canvas');
  canvas.width = edge;
  canvas.height = edge;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Your browser could not prepare the image.');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  const s = coverScale(img, edge) * crop.zoom;
  const w = img.naturalWidth * s;
  const h = img.naturalHeight * s;
  const cx = edge / 2 + crop.x * edge;
  const cy = edge / 2 + crop.y * edge;
  ctx.drawImage(img, cx - w / 2, cy - h / 2, w, h);

  const toBlob = (type: string, q?: number): Promise<Blob | null> =>
    new Promise((resolve) => canvas.toBlob(resolve, type, q));
  const webp = await toBlob('image/webp', 0.9);
  if (webp && webp.type === 'image/webp') return webp;
  const png = await toBlob('image/png');
  if (!png) throw new Error('Your browser could not export the image.');
  return png;
}

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('The image could not be read.'));
    reader.readAsDataURL(blob);
  });
}

/* ── Local (no account) storage ─────────────────────────────────────────── */

export function readLocalAvatar(): string | null {
  try {
    return window.localStorage.getItem(LOCAL_KEY);
  } catch {
    return null;
  }
}

export function writeLocalAvatar(dataUrl: string | null): boolean {
  try {
    if (dataUrl) window.localStorage.setItem(LOCAL_KEY, dataUrl);
    else window.localStorage.removeItem(LOCAL_KEY);
    window.dispatchEvent(new Event(AVATAR_EVENT));
    return true;
  } catch {
    return false;
  }
}

/* ── Cloud storage ──────────────────────────────────────────────────────── */

/**
 * Upload under `<uid>/avatar-<time>.<ext>` — a new name every time, so no
 * CDN or browser cache ever serves the previous picture — then clear out
 * the older files in that folder. Returns the public URL.
 */
export async function uploadCloudAvatar(userId: string, blob: Blob): Promise<string> {
  const client = getSupabase();
  if (!client) throw new Error('This build is not connected to a cloud project.');
  const ext = blob.type === 'image/webp' ? 'webp' : 'png';
  const name = `avatar-${Date.now()}.${ext}`;
  const path = `${userId}/${name}`;
  try {
    await retryTransient(async () => {
      const { error } = await client.storage
        .from(AVATAR_BUCKET)
        .upload(path, blob, { upsert: true, contentType: blob.type, cacheControl: '31536000' });
      if (error) throw new Error(error.message);
    });
  } catch (err) {
    throw new Error(`The picture could not be uploaded — ${friendlyCloudError(err)}`);
  }
  void pruneCloudAvatars(userId, name);
  return client.storage.from(AVATAR_BUCKET).getPublicUrl(path).data.publicUrl;
}

/** Best effort: remove every avatar file for this user except `keep`. */
export async function pruneCloudAvatars(userId: string, keep: string | null): Promise<void> {
  const client = getSupabase();
  if (!client) return;
  try {
    const { data } = await client.storage.from(AVATAR_BUCKET).list(userId, { limit: 100 });
    const stale = (data ?? []).filter((f) => f.name !== keep).map((f) => `${userId}/${f.name}`);
    if (stale.length) await client.storage.from(AVATAR_BUCKET).remove(stale);
  } catch {
    /* leftovers are harmless — they're overwritten by name next time */
  }
}

/* ── Colour ─────────────────────────────────────────────────────────────── */

/**
 * A vivid-but-soft average colour of the picture — used as the aura behind
 * the profile, so each person's profile takes on the tone of their photo.
 */
export async function dominantColor(src: string): Promise<string | null> {
  try {
    const img = await loadImage(src);
    const canvas = document.createElement('canvas');
    canvas.width = 24;
    canvas.height = 24;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, 24, 24);
    const { data } = ctx.getImageData(0, 0, 24, 24);
    let r = 0;
    let g = 0;
    let b = 0;
    let wsum = 0;
    for (let i = 0; i < data.length; i += 4) {
      const pr = data[i]!;
      const pg = data[i + 1]!;
      const pb = data[i + 2]!;
      const max = Math.max(pr, pg, pb);
      const min = Math.min(pr, pg, pb);
      // favour saturated, mid-bright pixels over greys/whites/blacks
      const w = 0.15 + (max - min) / 255;
      r += pr * w;
      g += pg * w;
      b += pb * w;
      wsum += w;
    }
    if (!wsum) return null;
    return `rgb(${Math.round(r / wsum)} ${Math.round(g / wsum)} ${Math.round(b / wsum)})`;
  } catch {
    return null; // cross-origin without CORS, or decode failure
  }
}
