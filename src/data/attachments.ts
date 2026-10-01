import type { Attachment, ItemType } from '@/lib/types';
import { nowISO, uid } from '@/lib/utils';
import { getSupabase, STORAGE_BUCKET } from './supabaseClient';
import { translate } from '@/state/languageStore';

/** localStorage is the offline store; anything bigger needs a signed-in session. */
export const MAX_LOCAL_BYTES = 3 * 1024 * 1024;
export const MAX_CLOUD_BYTES = 50 * 1024 * 1024;
/** Every account gets its own private slice of the cloud, not an unlimited one. */
export const MAX_TOTAL_CLOUD_BYTES = 250 * 1024 * 1024;

/** Sum of every file already living in the cloud bucket for this workspace. */
export function totalCloudBytes(attachments: readonly Attachment[]): number {
  return attachments.reduce((sum, a) => sum + (a.storagePath ? a.size : 0), 0);
}

export const ACCEPTED_TYPES =
  '.pdf,.png,.jpg,.jpeg,.webp,.gif,.svg,.txt,.md,.csv,.json,.log,.yml,.yaml,.zip,.docx,.xlsx,.pptx';

export type UploadOutcome =
  | { ok: true; attachment: Attachment }
  | { ok: false; error: string };

function safeName(name: string): string {
  return name.replace(/[^\w.\- ]+/g, '_').slice(0, 120) || 'file';
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error(translate('core.file.readFailed')));
    reader.readAsDataURL(file);
  });
}

export function humanLimit(bytes: number): string {
  return `${Math.round(bytes / (1024 * 1024))} MB`;
}

/**
 * Signed in with an active team → the file goes to Supabase Storage under
 * that team's prefix, so every teammate with access can read it back.
 * Signed out (or no team yet) → it is held locally as a data URL, so
 * composing still works fully offline.
 */
export async function uploadAttachment(
  file: File,
  ownerType: ItemType,
  ownerId: string,
  teamId: string | null,
  usedCloudBytes = 0,
): Promise<UploadOutcome> {
  const client = getSupabase();
  const id = uid('att');

  if (teamId && client) {
    if (file.size > MAX_CLOUD_BYTES) {
      return { ok: false, error: translate('core.file.overCloudLimit', { name: file.name, limit: humanLimit(MAX_CLOUD_BYTES) }) };
    }
    if (usedCloudBytes + file.size > MAX_TOTAL_CLOUD_BYTES) {
      return {
        ok: false,
        error: translate('core.file.storageFull', { limit: humanLimit(MAX_TOTAL_CLOUD_BYTES), name: file.name }),
      };
    }
    const path = `${teamId}/${ownerType}/${id}-${safeName(file.name)}`;
    const { error } = await client.storage.from(STORAGE_BUCKET).upload(path, file, {
      upsert: false,
      contentType: file.type || 'application/octet-stream',
    });
    if (error) return { ok: false, error: translate('core.file.uploadFailed', { name: file.name, error: error.message }) };
    return {
      ok: true,
      attachment: {
        id,
        ownerType,
        ownerId,
        name: file.name,
        mimeType: file.type || 'application/octet-stream',
        size: file.size,
        storagePath: path,
        dataUrl: null,
        createdAt: nowISO(),
      },
    };
  }

  if (file.size > MAX_LOCAL_BYTES) {
    return {
      ok: false,
      error: translate('core.file.overOfflineLimit', {
        name: file.name,
        limit: humanLimit(MAX_LOCAL_BYTES),
        cloudLimit: humanLimit(MAX_CLOUD_BYTES),
      }),
    };
  }

  try {
    const dataUrl = await readAsDataUrl(file);
    return {
      ok: true,
      attachment: {
        id,
        ownerType,
        ownerId,
        name: file.name,
        mimeType: file.type || 'application/octet-stream',
        size: file.size,
        storagePath: null,
        dataUrl,
        createdAt: nowISO(),
      },
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : translate('core.file.readFailed') };
  }
}

/** Signed URLs are short-lived, so they are cached per path until they expire. */
const urlCache = new Map<string, { url: string; expiresAt: number }>();
const SIGN_SECONDS = 60 * 60 * 8;

export async function resolveAttachmentUrl(attachment: Attachment): Promise<string | null> {
  if (attachment.dataUrl) return attachment.dataUrl;
  if (!attachment.storagePath) return null;

  const cached = urlCache.get(attachment.storagePath);
  if (cached && cached.expiresAt > Date.now()) return cached.url;

  const client = getSupabase();
  if (!client) return null;

  const { data, error } = await client.storage
    .from(STORAGE_BUCKET)
    .createSignedUrl(attachment.storagePath, SIGN_SECONDS);
  if (error || !data?.signedUrl) return null;

  urlCache.set(attachment.storagePath, {
    url: data.signedUrl,
    expiresAt: Date.now() + (SIGN_SECONDS - 300) * 1000,
  });
  return data.signedUrl;
}

/** Best effort: a stored object that outlives its row is tidied, never fatal. */
export async function deleteAttachmentFile(attachment: Attachment): Promise<void> {
  if (!attachment.storagePath) return;
  const client = getSupabase();
  if (!client) return;
  urlCache.delete(attachment.storagePath);
  try {
    await client.storage.from(STORAGE_BUCKET).remove([attachment.storagePath]);
  } catch {
    /* the row is already gone; a stray object is not worth failing the delete */
  }
}

export type AttachmentKind = 'image' | 'pdf' | 'text' | 'other';

export function attachmentKind(attachment: Attachment): AttachmentKind {
  const mime = attachment.mimeType.toLowerCase();
  const name = attachment.name.toLowerCase();
  if (mime.startsWith('image/') || /\.(png|jpe?g|webp|gif|svg|avif)$/.test(name)) return 'image';
  if (mime === 'application/pdf' || name.endsWith('.pdf')) return 'pdf';
  if (mime.startsWith('text/') || /\.(txt|md|csv|json|log ?|ya?ml)$/.test(name)) return 'text';
  return 'other';
}
