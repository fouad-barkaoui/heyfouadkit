import { describe, expect, it } from 'vitest';
import { detect, draftLink, extractUrls, normalizeUrl } from './linkIntel';

describe('normalizeUrl', () => {
  it('adds https to bare domains and strips tracking params', () => {
    expect(normalizeUrl('github.com/vercel/next.js')).toBe('https://github.com/vercel/next.js');
    expect(normalizeUrl('https://example.com/a?utm_source=x&id=2&fbclid=9')).toBe('https://example.com/a?id=2');
  });
  it('rejects things that are not web links', () => {
    expect(normalizeUrl('hello world')).toBeNull();
    expect(normalizeUrl('javascript:alert(1)')).toBeNull();
    expect(normalizeUrl('file:///etc/passwd')).toBeNull();
    expect(normalizeUrl('http://localhost')).toBeNull();
  });
});

describe('extractUrls', () => {
  it('pulls every link out of pasted text, trimming punctuation', () => {
    expect(extractUrls('look: https://a.com/x, and (https://b.org/y).')).toEqual(['https://a.com/x', 'https://b.org/y']);
  });
});

describe('detect', () => {
  it('turns YouTube links into an embeddable video with a thumbnail', () => {
    for (const u of [
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=1m5s',
      'https://youtu.be/dQw4w9WgXcQ?t=65',
      'https://youtube.com/shorts/dQw4w9WgXcQ',
    ]) {
      const d = detect(u);
      expect(d.kind).toBe('video');
      expect(d.image).toBe('https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg');
      expect(d.embedUrl).toContain('youtube-nocookie.com/embed/dQw4w9WgXcQ');
    }
    expect(detect('https://youtu.be/dQw4w9WgXcQ?t=65').embedUrl).toContain('start=65');
  });
  it('recognises repos, audio, pdfs, social and articles', () => {
    expect(detect('https://github.com/fouad-barkaoui/heyfouadkit').kind).toBe('repo');
    expect(detect('https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC').embedUrl).toBe(
      'https://open.spotify.com/embed/track/4uLU6hMCjMI75M1A2tKUQC',
    );
    expect(detect('https://arxiv.org/pdf/1706.03762.pdf').kind).toBe('pdf');
    expect(detect('https://x.com/someone/status/1').kind).toBe('social');
    expect(detect('https://someone.substack.com/p/a-post').kind).toBe('article');
    expect(detect('https://vimeo.com/76979871').embedUrl).toContain('player.vimeo.com/video/76979871');
  });
  it('drafts a readable title from the URL before any network call', () => {
    expect(draftLink('https://example.com/blog/how-to-build-a-rag-pipeline').title).toBe('How to build a rag pipeline');
    expect(draftLink('https://github.com/vercel/next.js').title).toBe('vercel/next.js');
    expect(draftLink('https://www.youtube.com/watch?v=dQw4w9WgXcQ').title).toBe('YouTube video');
  });
});
