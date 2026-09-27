import { describe, expect, it } from 'vitest';
import {
  attachmentKind,
  humanLimit,
  MAX_CLOUD_BYTES,
  MAX_LOCAL_BYTES,
  MAX_TOTAL_CLOUD_BYTES,
  totalCloudBytes,
} from './attachments';
import { normalizeAttachment } from './normalize';
import type { Attachment } from '@/lib/types';

const make = (over: Partial<Attachment>): Attachment => ({
  id: 'a1',
  ownerType: 'note',
  ownerId: 'n1',
  name: 'file.bin',
  mimeType: 'application/octet-stream',
  size: 10,
  storagePath: null,
  dataUrl: null,
  createdAt: new Date().toISOString(),
  ...over,
});

describe('attachmentKind', () => {
  it('detects images by mime type or extension', () => {
    expect(attachmentKind(make({ mimeType: 'image/png' }))).toBe('image');
    expect(attachmentKind(make({ mimeType: '', name: 'diagram.WEBP' }))).toBe('image');
  });

  it('detects PDFs either way', () => {
    expect(attachmentKind(make({ mimeType: 'application/pdf' }))).toBe('pdf');
    expect(attachmentKind(make({ mimeType: '', name: 'report.pdf' }))).toBe('pdf');
  });

  it('detects readable text files', () => {
    expect(attachmentKind(make({ mimeType: 'text/markdown' }))).toBe('text');
    expect(attachmentKind(make({ mimeType: '', name: 'config.yaml' }))).toBe('text');
  });

  it('falls back to other', () => {
    expect(attachmentKind(make({ name: 'archive.zip' }))).toBe('other');
  });
});

describe('limits', () => {
  it('keeps the offline cap well under the cloud cap', () => {
    expect(MAX_LOCAL_BYTES).toBeLessThan(MAX_CLOUD_BYTES);
    expect(humanLimit(MAX_LOCAL_BYTES)).toBe('3 MB');
    expect(humanLimit(MAX_CLOUD_BYTES)).toBe('50 MB');
  });

  it('keeps a single file well under the total account quota', () => {
    expect(MAX_CLOUD_BYTES).toBeLessThan(MAX_TOTAL_CLOUD_BYTES);
  });
});

describe('totalCloudBytes', () => {
  it('sums only files that actually live in the cloud bucket', () => {
    const cloudFile = make({ size: 100, storagePath: 'u1/note/a-1' });
    const localOnlyFile = make({ size: 999, storagePath: null, dataUrl: 'data:...' });
    expect(totalCloudBytes([cloudFile, localOnlyFile])).toBe(100);
  });

  it('is zero for an empty or fully-local set of attachments', () => {
    expect(totalCloudBytes([])).toBe(0);
    expect(totalCloudBytes([make({ storagePath: null })])).toBe(0);
  });
});

describe('normalizeAttachment', () => {
  it('repairs a partial record without throwing', () => {
    const a = normalizeAttachment({ id: 'x', ownerId: 'n1' });
    expect(a.ownerType).toBe('note');
    expect(a.size).toBe(0);
    expect(a.storagePath).toBeNull();
    expect(a.dataUrl).toBeNull();
  });

  it('rejects an unknown owner type rather than trusting it', () => {
    expect(normalizeAttachment({ id: 'x', ownerId: 'n1', ownerType: 'spaceship' }).ownerType).toBe('note');
  });

  it('keeps a valid owner type', () => {
    expect(normalizeAttachment({ id: 'x', ownerId: 'd1', ownerType: 'doc' }).ownerType).toBe('doc');
  });
});
