import type { AlbumInput, SpotifyAlbum, SpotifySearchResponse } from './types';

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[’`]/g, "'")
    .replace(/[^\p{L}\p{N}' ]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function scoreCandidate(input: AlbumInput, album: SpotifyAlbum): number {
  const inputTitle = normalize(input.albumTitle);
  const inputArtist = normalize(input.artistName);
  const albumTitle = normalize(album.name);
  const albumArtists = normalize(album.artists.map((a) => a.name).join(' '));

  let score = 0;

  if (albumTitle === inputTitle) score += 2;
  else if (albumTitle.includes(inputTitle) || inputTitle.includes(albumTitle)) score += 1;

  if (albumArtists === inputArtist) score += 2;
  else if (albumArtists.includes(inputArtist) || inputArtist.includes(albumArtists)) score += 1;

  return score;
}

export async function searchBestAlbumMatch(params: {
  input: AlbumInput;
  accessToken: string;
  timeoutMs: number;
}): Promise<{ album: SpotifyAlbum; score: number } | null> {
  const { input, accessToken, timeoutMs } = params;

  const q = `album:"${input.albumTitle}" artist:"${input.artistName}"`;
  const url = new URL('https://api.spotify.com/v1/search');
  url.searchParams.set('q', q);
  url.searchParams.set('type', 'album');
  url.searchParams.set('limit', '5');

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: controller.signal
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Spotify search failed (${response.status}): ${text}`);
    }

    const payload = (await response.json()) as SpotifySearchResponse;
    const items = payload.albums?.items ?? [];
    if (items.length === 0) return null;

    let best: { album: SpotifyAlbum; score: number } | null = null;

    for (const item of items) {
      const score = scoreCandidate(input, item);
      if (!best || score > best.score) best = { album: item, score };
    }

    if (!best || best.score < 3) return null;
    return best;
  } finally {
    clearTimeout(timer);
  }
}
