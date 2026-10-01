import type { LinkKind, SavedLink } from '@/lib/types';
import { nowISO, uid } from '@/lib/utils';
import { translate } from '@/state/languageStore';

/**
 * Link intelligence for SaveIt: understands a URL the instant it's pasted
 * (kind, thumbnail, in-app player) with zero network, then enriches it from
 * the /api/unfurl function (title, description, preview image, theme colour,
 * reading time). Every step degrades gracefully — a link is always saved.
 */

const URL_RE = /\bhttps?:\/\/[^\s<>"'`]+/gi;
const BARE_DOMAIN_RE = /^(?:[a-z0-9-]+\.)+[a-z]{2,}(?:[/?#][^\s]*)?$/i;

/** Accepts "youtube.com/watch?v=…" as well as full URLs. Returns null if it isn't a web link. */
export function normalizeUrl(input: string): string | null {
  let v = input.trim().replace(/[)\].,;!?'"]+$/, '');
  if (!v) return null;
  if (!/^https?:\/\//i.test(v)) {
    if (!BARE_DOMAIN_RE.test(v)) return null;
    v = `https://${v}`;
  }
  try {
    const u = new URL(v);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
    if (!u.hostname.includes('.')) return null;
    // Strip tracking noise so the same page isn't saved twice.
    for (const p of Array.from(u.searchParams.keys())) { // copy: we delete while iterating
      if (/^(utm_|fbclid$|gclid$|mc_|igshid$|si$|ref_src$)/i.test(p)) u.searchParams.delete(p);
    }
    u.hash = u.hash === '#' ? '' : u.hash;
    return u.toString().slice(0, 4000);
  } catch {
    return null;
  }
}

/** Every distinct web link inside a blob of pasted text. */
export function extractUrls(text: string): string[] {
  const found = new Set<string>();
  for (const m of text.matchAll(URL_RE)) {
    const n = normalizeUrl(m[0]);
    if (n) found.add(n);
  }
  if (found.size === 0) {
    const single = normalizeUrl(text);
    if (single) found.add(single);
  }
  return [...found];
}

export function domainOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

export function faviconFor(domain: string): string {
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=64`;
}

interface Detected {
  kind: LinkKind;
  siteName: string;
  image: string | null;
  embedUrl: string | null;
  title?: string;
}

function youtubeId(u: URL): string | null {
  const host = u.hostname.replace(/^www\.|^m\./, '');
  if (host === 'youtu.be') return u.pathname.slice(1).split('/')[0] || null;
  if (host.endsWith('youtube.com') || host.endsWith('youtube-nocookie.com')) {
    if (u.searchParams.get('v')) return u.searchParams.get('v');
    const m = u.pathname.match(/^\/(?:shorts|embed|live|v)\/([\w-]{6,})/);
    if (m) return m[1] ?? null;
  }
  return null;
}

function startSeconds(u: URL): number {
  const t = u.searchParams.get('t') ?? u.searchParams.get('start');
  if (!t) return 0;
  const m = t.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s?)?$/);
  if (!m) return 0;
  return (Number(m[1] ?? 0) * 3600) + (Number(m[2] ?? 0) * 60) + Number(m[3] ?? 0);
}

/** Pure, instant, offline: what we can know from the URL alone. */
export function detect(url: string): Detected {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return { kind: 'website', siteName: '', image: null, embedUrl: null };
  }
  const host = u.hostname.replace(/^www\.|^m\./, '');
  const path = u.pathname.toLowerCase();

  const yt = youtubeId(u);
  if (yt && /^[\w-]{6,20}$/.test(yt)) {
    const start = startSeconds(u);
    return {
      kind: 'video',
      siteName: 'YouTube',
      image: `https://i.ytimg.com/vi/${yt}/hqdefault.jpg`,
      embedUrl: `https://www.youtube-nocookie.com/embed/${yt}?autoplay=1&rel=0${start ? `&start=${start}` : ''}`,
    };
  }
  const vimeo = host === 'vimeo.com' && u.pathname.match(/^\/(\d+)/);
  if (vimeo) {
    return { kind: 'video', siteName: 'Vimeo', image: null, embedUrl: `https://player.vimeo.com/video/${vimeo[1]}?autoplay=1` };
  }
  const loom = host.endsWith('loom.com') && u.pathname.match(/^\/share\/([\w-]+)/);
  if (loom) return { kind: 'video', siteName: 'Loom', image: null, embedUrl: `https://www.loom.com/embed/${loom[1]}?autoplay=1` };
  const dm = host.endsWith('dailymotion.com') && u.pathname.match(/^\/video\/([a-z0-9]+)/i);
  if (dm) {
    return {
      kind: 'video',
      siteName: 'Dailymotion',
      image: `https://www.dailymotion.com/thumbnail/video/${dm[1]}`,
      embedUrl: `https://geo.dailymotion.com/player.html?video=${dm[1]}`,
    };
  }
  const tt = host.endsWith('tiktok.com') && u.pathname.match(/\/video\/(\d+)/);
  if (tt) return { kind: 'video', siteName: 'TikTok', image: null, embedUrl: `https://www.tiktok.com/embed/v2/${tt[1]}` };
  if (host.endsWith('twitch.tv')) return { kind: 'video', siteName: 'Twitch', image: null, embedUrl: null };

  const sp = host === 'open.spotify.com' && u.pathname.match(/^\/(?:intl-[a-z]+\/)?(track|album|playlist|episode|show|artist)\/([A-Za-z0-9]+)/);
  if (sp) return { kind: 'audio', siteName: 'Spotify', image: null, embedUrl: `https://open.spotify.com/embed/${sp[1]}/${sp[2]}` };
  if (host === 'soundcloud.com' && u.pathname.split('/').filter(Boolean).length >= 2) {
    return {
      kind: 'audio',
      siteName: 'SoundCloud',
      image: null,
      embedUrl: `https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}&auto_play=true&visual=true`,
    };
  }
  if (host.endsWith('podcasts.apple.com') || host.endsWith('anchor.fm') || host.endsWith('deezer.com')) {
    return { kind: 'audio', siteName: host, image: null, embedUrl: null };
  }

  const gh = host === 'github.com' && u.pathname.match(/^\/([\w.-]+)\/([\w.-]+)/);
  if (gh) {
    return {
      kind: 'repo',
      siteName: 'GitHub',
      image: `https://opengraph.githubassets.com/1/${gh[1]}/${gh[2]}`,
      embedUrl: null,
      title: `${gh[1]}/${gh[2]}`,
    };
  }
  if (host === 'gitlab.com' || host === 'bitbucket.org' || host === 'codeberg.org' || host === 'huggingface.co') {
    return { kind: 'repo', siteName: host, image: null, embedUrl: null };
  }

  if (path.endsWith('.pdf')) return { kind: 'pdf', siteName: host, image: null, embedUrl: null };
  if (/\.(png|jpe?g|gif|webp|avif|svg)$/.test(path)) return { kind: 'image', siteName: host, image: url, embedUrl: null };

  if (
    /(^|\.)(x|twitter|linkedin|instagram|facebook|threads|reddit|mastodon\.social|bsky|tiktok|pinterest)\.(com|net|app|social)$/.test(host)
  ) {
    return { kind: 'social', siteName: host, image: null, embedUrl: null };
  }

  if (
    /(^|\.)(medium|substack|dev|hashnode|hackernoon|wikipedia|nytimes|theguardian|bbc|arstechnica|wired|theverge|techcrunch)\./.test(host) ||
    /\/(blog|posts?|articles?|news|stories|p)\//.test(path)
  ) {
    return { kind: 'article', siteName: host, image: null, embedUrl: null };
  }

  return { kind: 'website', siteName: host, image: null, embedUrl: null };
}

/** A complete record from the URL alone — saved instantly, enriched afterwards. */
export function draftLink(url: string, collection = 'Inbox'): SavedLink {
  const d = detect(url);
  const domain = domainOf(url);
  const now = nowISO();
  let fallbackTitle = d.title ?? '';
  if (!fallbackTitle) {
    try {
      const u = new URL(url);
      const slug = decodeURIComponent(u.pathname.split('/').filter(Boolean).pop() ?? '')
        .replace(/\.[a-z0-9]{2,5}$/i, '')
        .replace(/[-_+]+/g, ' ')
        .trim();
      const generic = /^(watch|index|home|view|video|embed|shorts|share|status|p|post|article)$/i.test(slug);
      fallbackTitle =
        slug && !generic && !/^\d+$/.test(slug) && slug.length > 3
          ? slug.charAt(0).toUpperCase() + slug.slice(1)
          : d.kind === 'video' && d.siteName
            ? translate('si.siteVideo', { site: d.siteName })
            : d.siteName || domain;
    } catch {
      fallbackTitle = domain;
    }
  }
  return {
    id: uid('lnk'),
    url,
    title: fallbackTitle.slice(0, 300),
    description: '',
    kind: d.kind,
    siteName: d.siteName || domain,
    domain,
    image: d.image,
    favicon: faviconFor(domain),
    embedUrl: d.embedUrl,
    tags: [],
    collection,
    note: '',
    status: 'unread',
    readingMinutes: null,
    accent: null,
    isInteresting: false,
    openedAt: null,
    createdAt: now,
    updatedAt: now,
    isDeleted: false,
    deletedAt: null,
  };
}

interface UnfurlResponse {
  url?: string;
  title?: string;
  description?: string;
  image?: string | null;
  siteName?: string;
  favicon?: string | null;
  themeColor?: string | null;
  type?: string;
  readingMinutes?: number | null;
}

async function fetchJson<T>(url: string, ms: number): Promise<T | null> {
  const ctrl = new AbortController();
  const t = window.setTimeout(() => ctrl.abort(), ms);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  } finally {
    window.clearTimeout(t);
  }
}

/**
 * Everything the network can add on top of `draftLink`. Tries our own
 * /api/unfurl first, then noembed (CORS-enabled oEmbed) for video/audio
 * titles. Returns only the fields worth patching.
 */
export async function enrich(link: SavedLink): Promise<Partial<SavedLink>> {
  const patch: Partial<SavedLink> = {};
  const meta = await fetchJson<UnfurlResponse>(`/api/unfurl?url=${encodeURIComponent(link.url)}`, 9000);
  if (meta && !('error' in meta)) {
    if (meta.title) patch.title = meta.title.slice(0, 300);
    if (meta.description) patch.description = meta.description.slice(0, 600);
    // Keep our own video thumbnail (sharper, never hotlink-blocked); else use the page's.
    if (!link.image && meta.image) patch.image = meta.image;
    if (meta.siteName) patch.siteName = meta.siteName.slice(0, 80);
    if (meta.favicon) patch.favicon = meta.favicon;
    if (meta.themeColor) patch.accent = meta.themeColor;
    if (meta.readingMinutes && link.kind !== 'video' && link.kind !== 'audio') patch.readingMinutes = meta.readingMinutes;
    if (link.kind === 'website' && meta.type?.startsWith('article')) patch.kind = 'article';
    if (link.kind === 'website' && meta.type?.startsWith('video')) patch.kind = 'video';
  }
  if (!patch.title && (link.kind === 'video' || link.kind === 'audio' || link.kind === 'social')) {
    const o = await fetchJson<{ title?: string; author_name?: string; thumbnail_url?: string; provider_name?: string }>(
      `https://noembed.com/embed?url=${encodeURIComponent(link.url)}`,
      7000,
    );
    if (o?.title) patch.title = o.title.slice(0, 300);
    if (o?.author_name && !patch.description) patch.description = translate('si.byAuthor', { author: o.author_name });
    if (!link.image && o?.thumbnail_url?.startsWith('https://')) patch.image = o.thumbnail_url;
  }
  return patch;
}

/** Kind labels are read through getters so they follow the current language. */
function kindMeta(kind: LinkKind, color: string): { readonly label: string; readonly plural: string; color: string } {
  return {
    get label() {
      return translate(`si.kind.${kind}`);
    },
    get plural() {
      return translate(`si.kinds.${kind}`);
    },
    color,
  };
}

export const KIND_META: Record<LinkKind, { readonly label: string; readonly plural: string; color: string }> = {
  video: kindMeta('video', '#f25f5c'),
  article: kindMeta('article', '#7c83ff'),
  repo: kindMeta('repo', '#2dd4a0'),
  social: kindMeta('social', '#38bdf8'),
  audio: kindMeta('audio', '#f5a524'),
  pdf: kindMeta('pdf', '#f472b6'),
  image: kindMeta('image', '#b784ff'),
  website: kindMeta('website', '#9aa4b2'),
};

/** "5m ago" / "قبل 5 د" — falls back to a short date after a month. */
export function relativeTimeT(iso: string | null | undefined, locale: string): string {
  if (!iso) return '—';
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return '—';
  const mins = Math.round((Date.now() - t) / 60_000);
  if (mins < 1) return translate('si.time.now');
  if (mins < 60) return translate('si.time.min', { count: mins });
  const hours = Math.round(mins / 60);
  if (hours < 24) return translate('si.time.hour', { count: hours });
  const days = Math.round(hours / 24);
  if (days < 30) return translate('si.time.day', { count: days });
  return new Date(iso).toLocaleDateString(locale, { month: 'short', day: 'numeric', year: 'numeric' });
}

/** Date + time in the current UI locale (same shape as formatDateTime). */
export function formatDateTimeT(iso: string | null | undefined, locale: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString(locale, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export const KIND_ORDER: LinkKind[] = ['video', 'article', 'repo', 'social', 'audio', 'pdf', 'image', 'website'];
