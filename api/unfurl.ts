/**
 * GET /api/unfurl?url=https://…
 *
 * Reads a public web page server-side and returns its preview metadata
 * (title, description, image, site name, favicon, theme colour, reading
 * time). Browsers can't do this themselves because of CORS.
 *
 * Because this fetches arbitrary URLs on the server, it is hardened against
 * SSRF: only http(s) on standard ports, every hostname is resolved and
 * rejected if ANY address is private / loopback / link-local / metadata /
 * reserved, redirects are followed manually (max 4) and re-validated at each
 * hop, bodies are capped at 1 MB, and the whole request times out.
 */
import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';

interface Req {
  method?: string;
  query: Record<string, string | string[] | undefined>;
  headers: Record<string, string | string[] | undefined>;
}
interface Res {
  status: (code: number) => Res;
  setHeader: (name: string, value: string) => void;
  json: (body: unknown) => void;
  end: (body?: string) => void;
}

const MAX_BYTES = 1024 * 1024;
const TIMEOUT_MS = 7000;
const MAX_REDIRECTS = 4;
const UA =
  'Mozilla/5.0 (compatible; KanzSaveIt/1.0; +https://kanz-workspace.vercel.app) AppleWebKit/537.36 (KHTML, like Gecko)';

/* ── SSRF guards ───────────────────────────────────────────────────────── */

function ipv4Blocked(ip: string): boolean {
  const p = ip.split('.').map(Number);
  if (p.length !== 4 || p.some((n) => Number.isNaN(n))) return true;
  const [a, b] = p as [number, number, number, number];
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) || // CGNAT
    (a === 169 && b === 254) || // link-local + cloud metadata
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 192 && b === 0) ||
    (a === 198 && (b === 18 || b === 19)) ||
    a >= 224 // multicast + reserved
  );
}

function ipv6Blocked(ip: string): boolean {
  const v = ip.toLowerCase();
  if (v === '::' || v === '::1') return true;
  const mapped = v.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return ipv4Blocked(mapped[1]!);
  // IPv4-mapped in hex form (::ffff:7f00:1) — URL parsing normalises to this.
  const hex = v.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/);
  if (hex) {
    const hi = parseInt(hex[1]!, 16);
    const lo = parseInt(hex[2]!, 16);
    return ipv4Blocked(`${hi >> 8}.${hi & 255}.${lo >> 8}.${lo & 255}`);
  }
  // Any other ::-prefixed form (IPv4-compatible, unspecified…) is never a public site.
  if (v.startsWith('::')) return true;
  return (
    v.startsWith('fc') ||
    v.startsWith('fd') || // unique local
    v.startsWith('fe8') ||
    v.startsWith('fe9') ||
    v.startsWith('fea') ||
    v.startsWith('feb') || // link-local
    v.startsWith('ff') || // multicast
    v.startsWith('64:ff9b') || // NAT64
    v.startsWith('2001:db8') // documentation
  );
}

function addressBlocked(ip: string): boolean {
  const fam = isIP(ip);
  if (fam === 4) return ipv4Blocked(ip);
  if (fam === 6) return ipv6Blocked(ip);
  return true;
}

export async function assertPublicUrl(raw: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new HttpError(400, 'That is not a valid link.');
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') throw new HttpError(400, 'Only http and https links can be previewed.');
  if (url.username || url.password) throw new HttpError(400, 'Links with credentials are not allowed.');
  if (url.port && url.port !== '80' && url.port !== '443') throw new HttpError(400, 'Only standard web ports are allowed.');
  const host = url.hostname.replace(/^\[|\]$/g, '');
  if (!host || host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') || host.endsWith('.internal')) {
    throw new HttpError(400, 'Private addresses cannot be previewed.');
  }
  if (isIP(host)) {
    if (addressBlocked(host)) throw new HttpError(400, 'Private addresses cannot be previewed.');
    return url;
  }
  let addrs: { address: string }[];
  try {
    addrs = await lookup(host, { all: true, verbatim: true });
  } catch {
    throw new HttpError(422, 'That site could not be found.');
  }
  if (addrs.length === 0 || addrs.some((a) => addressBlocked(a.address))) {
    throw new HttpError(400, 'Private addresses cannot be previewed.');
  }
  return url;
}

class HttpError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

/* ── Fetch with manual, re-validated redirects and a byte cap ─────────── */

async function fetchPage(start: URL): Promise<{ finalUrl: URL; html: string; contentType: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    let current = start;
    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      const res = await fetch(current, {
        redirect: 'manual',
        signal: controller.signal,
        headers: {
          'user-agent': UA,
          accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.5',
          'accept-language': 'en,fr;q=0.8,ar;q=0.6',
        },
      });
      if (res.status >= 300 && res.status < 400) {
        const loc = res.headers.get('location');
        if (!loc) throw new HttpError(422, 'The site redirected without a destination.');
        current = await assertPublicUrl(new URL(loc, current).toString());
        continue;
      }
      const contentType = (res.headers.get('content-type') ?? '').toLowerCase();
      if (!res.ok) return { finalUrl: current, html: '', contentType };
      if (!contentType.includes('html')) {
        await res.body?.cancel();
        return { finalUrl: current, html: '', contentType };
      }
      const reader = res.body?.getReader();
      if (!reader) return { finalUrl: current, html: '', contentType };
      const chunks: Uint8Array[] = [];
      let total = 0;
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        total += value.byteLength;
        chunks.push(value);
        if (total >= MAX_BYTES) {
          await reader.cancel();
          break;
        }
      }
      return { finalUrl: current, html: Buffer.concat(chunks).toString('utf8'), contentType };
    }
    throw new HttpError(422, 'Too many redirects.');
  } finally {
    clearTimeout(timer);
  }
}

/* ── HTML metadata extraction (no DOM on the server — tolerant regexes) ─ */

function decodeEntities(s: string): string {
  return s
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n: string) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&');
}

function attr(tag: string, name: string): string | null {
  const m = tag.match(new RegExp(`\\b${name}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i'));
  return m ? decodeEntities((m[2] ?? m[3] ?? m[4] ?? '').trim()) : null;
}

function metaMap(head: string): Map<string, string> {
  const map = new Map<string, string>();
  for (const m of head.matchAll(/<meta\b[^>]*>/gi)) {
    const tag = m[0];
    const key = (attr(tag, 'property') ?? attr(tag, 'name') ?? attr(tag, 'itemprop') ?? '').toLowerCase();
    const content = attr(tag, 'content');
    if (key && content && !map.has(key)) map.set(key, content);
  }
  return map;
}

function linkHref(head: string, relMatch: RegExp): string | null {
  for (const m of head.matchAll(/<link\b[^>]*>/gi)) {
    const rel = attr(m[0], 'rel');
    if (rel && relMatch.test(rel)) return attr(m[0], 'href');
  }
  return null;
}

function absolute(u: string | null, base: URL): string | null {
  if (!u) return null;
  try {
    const abs = new URL(u, base);
    if (abs.protocol !== 'https:' && abs.protocol !== 'http:') return null;
    if (abs.protocol === 'http:') abs.protocol = 'https:'; // avoid mixed content
    return abs.toString().slice(0, 4000);
  } catch {
    return null;
  }
}

function readingMinutes(html: string): number | null {
  const body = (html.match(/<article\b[\s\S]*?<\/article>/i)?.[0] ?? html.match(/<body\b[\s\S]*<\/body>/i)?.[0] ?? '')
    .replace(/<(script|style|noscript|svg|nav|footer|header)\b[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]+>/g, ' ');
  const words = body.split(/\s+/).filter((w) => /\p{L}/u.test(w)).length;
  if (words < 180) return null;
  return Math.max(1, Math.round(words / 230));
}

function clean(s: string | null | undefined, max: number): string {
  return (s ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
}

export function extractMeta(html: string, finalUrl: URL, contentType = 'text/html'): Record<string, unknown> {
  const head = html.slice(0, 400_000).match(/<head\b[\s\S]*?<\/head>/i)?.[0] ?? html.slice(0, 200_000);
  const meta = metaMap(head);
  const titleTag = head.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1];
  const ogType = (meta.get('og:type') ?? '').toLowerCase();
  const theme = meta.get('theme-color') ?? '';
  return {
    url: finalUrl.toString(),
    title: clean(meta.get('og:title') ?? meta.get('twitter:title') ?? (titleTag ? decodeEntities(titleTag) : ''), 300),
    description: clean(meta.get('og:description') ?? meta.get('twitter:description') ?? meta.get('description'), 600),
    image: absolute(
      meta.get('og:image:secure_url') ?? meta.get('og:image') ?? meta.get('twitter:image') ?? meta.get('twitter:image:src') ?? null,
      finalUrl,
    ),
    siteName: clean(meta.get('og:site_name') ?? meta.get('application-name') ?? '', 80),
    favicon:
      absolute(linkHref(head, /(^|\s)(apple-touch-icon|icon|shortcut icon)(\s|$)/i), finalUrl) ??
      absolute('/favicon.ico', finalUrl),
    themeColor: /^#[0-9a-f]{3,8}$/i.test(theme) ? theme : null,
    type: ogType,
    author: clean(meta.get('author') ?? meta.get('article:author') ?? '', 120),
    publishedAt: clean(meta.get('article:published_time') ?? '', 40) || null,
    readingMinutes: ogType.startsWith('video') ? null : readingMinutes(html),
    contentType: contentType.split(';')[0] ?? '',
  };
}

export default async function handler(req: Req, res: Res): Promise<void> {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (req.method && req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  const raw = Array.isArray(req.query.url) ? req.query.url[0] : req.query.url;
  if (!raw || raw.length > 4096) {
    res.status(400).json({ error: 'Pass ?url=' });
    return;
  }

  try {
    const url = await assertPublicUrl(raw);
    const { finalUrl, html, contentType } = await fetchPage(url);
    const body = extractMeta(html, finalUrl, contentType);
    res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=604800');
    res.status(200).json(body);
  } catch (err) {
    const status = err instanceof HttpError ? err.status : (err as Error)?.name === 'AbortError' ? 504 : 502;
    const message =
      err instanceof HttpError
        ? err.message
        : status === 504
          ? 'The site took too long to answer.'
          : 'The site could not be reached.';
    res.setHeader('Cache-Control', 'no-store');
    res.status(status).json({ error: message });
  }
}
