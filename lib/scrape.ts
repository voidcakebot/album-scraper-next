import { load } from 'cheerio';
import type { Album } from './types';

type JsonLd = Record<string, unknown>;
const DEFAULT_USER_AGENT = 'album-scraper-next/1.0 (+https://github.com/voidcakebot/album-scraper-next)';
const TITLE_SUFFIXES = [/\|\s*Spotify$/i, /-\s*Bandcamp$/i, /\|\s*YouTube Music$/i, /\|\s*Apple Music$/i];

const normalizeText = (v?: string | null) => (v ?? '').replace(/\s+/g, ' ').trim();
const cleanTitle = (t: string) => TITLE_SUFFIXES.reduce((acc, re) => acc.replace(re, '').trim(), normalizeText(t));
const toAbsoluteUrl = (value: string | undefined, sourceUrl: string) => {
  if (!value) return '';
  try {
    return new URL(value, sourceUrl).toString();
  } catch {
    return '';
  }
};

function parseJsonLd(html: string): JsonLd[] {
  const $ = load(html);
  const blocks: JsonLd[] = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    const raw = $(el).text();
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed)) parsed.forEach((i) => i && typeof i === 'object' && blocks.push(i as JsonLd));
      else if (parsed && typeof parsed === 'object') blocks.push(parsed as JsonLd);
    } catch {
      // ignore malformed json-ld
    }
  });
  return blocks;
}

function extractFromJsonLd(blocks: JsonLd[]) {
  for (const block of blocks) {
    const type = String(block['@type'] ?? '').toLowerCase();
    if (!(type.includes('musicalbum') || type.includes('album') || type.includes('product'))) continue;

    const albumTitle = normalizeText(String(block.name ?? '')) || undefined;
    const imageCandidate = block.image ?? block.thumbnailUrl;
    const coverImageUrl =
      typeof imageCandidate === 'string'
        ? imageCandidate
        : Array.isArray(imageCandidate) && typeof imageCandidate[0] === 'string'
          ? imageCandidate[0]
          : undefined;

    const byArtist = block.byArtist as JsonLd | JsonLd[] | undefined;
    const artist = block.artist as JsonLd | JsonLd[] | undefined;
    const artistCandidate = Array.isArray(byArtist)
      ? byArtist[0]
      : byArtist ?? (Array.isArray(artist) ? artist[0] : artist);
    const artistName =
      artistCandidate && typeof artistCandidate === 'object'
        ? normalizeText(String((artistCandidate as JsonLd).name ?? '')) || undefined
        : undefined;

    return { albumTitle, artistName, coverImageUrl };
  }
  return {} as { albumTitle?: string; artistName?: string; coverImageUrl?: string };
}

function inferArtistFromTitle(title: string): string {
  const normalized = normalizeText(title);
  const dashMatch = normalized.match(/^(.+?)\s+[–-]\s+(.+)$/);
  if (dashMatch) return normalizeText(dashMatch[1]);
  const byMatch = normalized.match(/^(.+?)\s+by\s+(.+)$/i);
  if (byMatch) return normalizeText(byMatch[2]);
  return '';
}

function parseSputnikBestNewMusic(html: string, sourceUrl: string): Omit<Album, 'scrapedAt'>[] {
  const $ = load(html);
  const rows = $('td.bestnewmusic');
  if (rows.length === 0) return [];

  const albums: Omit<Album, 'scrapedAt'>[] = [];

  rows.each((_, cell) => {
    const container = $(cell);
    const artistName = normalizeText(container.find('strong').first().text());
    const albumTitle = normalizeText(container.find('font[size="2"]').first().text());
    const linkHref = container.find('a').first().attr('href');
    const coverSrc = container.prev('td').find('img').first().attr('src');

    const resolvedSource = toAbsoluteUrl(linkHref, sourceUrl) || sourceUrl;
    const resolvedCover = toAbsoluteUrl(coverSrc, sourceUrl);

    if (!artistName || !albumTitle || !resolvedCover) return;

    albums.push({
      sourceUrl: resolvedSource,
      albumTitle,
      artistName,
      coverImageUrl: resolvedCover
    });
  });

  return albums;
}

export function parseAlbumFromHtml(html: string, sourceUrl: string): Omit<Album, 'scrapedAt'> {
  const $ = load(html);
  const jsonLd = extractFromJsonLd(parseJsonLd(html));
  const ogImage = $('meta[property="og:image"]').attr('content');
  const twitterImage = $('meta[name="twitter:image"]').attr('content');
  const fallbackImg = $('img')
    .map((_, el) => $(el).attr('src'))
    .get()
    .map((src) => toAbsoluteUrl(src, sourceUrl))
    .find((src) => /^https?:\/\//i.test(src));

  const coverImageUrl =
    toAbsoluteUrl(ogImage, sourceUrl) ||
    toAbsoluteUrl(twitterImage, sourceUrl) ||
    toAbsoluteUrl(jsonLd.coverImageUrl, sourceUrl) ||
    fallbackImg ||
    '';

  const ogTitle = $('meta[property="og:title"]').attr('content');
  const h1 = $('h1').first().text();
  const titleTag = $('title').first().text();
  const albumTitle = cleanTitle(ogTitle ?? '') || cleanTitle(jsonLd.albumTitle ?? '') || cleanTitle(h1) || cleanTitle(titleTag) || 'Unknown Album';

  const authorMeta = $('meta[name="author"]').attr('content');
  const domArtist = $('[class*="artist" i], [class*="band" i], [class*="byline" i], [class*="subtitle" i]').first().text() || '';
  const artistName =
    normalizeText(jsonLd.artistName) ||
    normalizeText(authorMeta) ||
    normalizeText(domArtist) ||
    inferArtistFromTitle(ogTitle ?? titleTag ?? '') ||
    'Unknown Artist';

  if (!coverImageUrl) throw new Error('No cover image found (og:image/twitter:image/json-ld/img fallback failed).');
  return { sourceUrl, albumTitle, artistName, coverImageUrl };
}

export function parseAlbumsFromHtml(html: string, sourceUrl: string): Omit<Album, 'scrapedAt'>[] {
  const sputnikAlbums = parseSputnikBestNewMusic(html, sourceUrl);
  if (sputnikAlbums.length > 0) return sputnikAlbums;

  return [parseAlbumFromHtml(html, sourceUrl)];
}

export async function fetchHtml(sourceUrl: string, timeoutMs: number): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(sourceUrl, {
      headers: { 'user-agent': DEFAULT_USER_AGENT, accept: 'text/html,application/xhtml+xml' },
      signal: controller.signal
    });
    if (!response.ok) throw new Error(`HTTP ${response.status} ${response.statusText}`);
    return await response.text();
  } finally {
    clearTimeout(timer);
  }
}
