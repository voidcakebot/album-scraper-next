import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { neon } from '@neondatabase/serverless';
import type { AddedState, AlbumInput } from './spotify/types';

const EMPTY_STATE: AddedState = {
  version: 1,
  added: {}
};

let dbReady = false;

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[’`]/g, "'")
    .replace(/[^\p{L}\p{N}' ]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function getDbUrl(): string | null {
  return process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL || process.env.DATABASE_URL || null;
}

function getSql() {
  const url = getDbUrl();
  if (!url) return null;
  return neon(url);
}

async function ensureDbSchema(): Promise<void> {
  if (dbReady) return;
  const sql = getSql();
  if (!sql) return;

  await sql`
    CREATE TABLE IF NOT EXISTS spotify_added_albums (
      spotify_album_id TEXT PRIMARY KEY,
      artist_name TEXT NOT NULL,
      album_title TEXT NOT NULL,
      added_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await sql`CREATE INDEX IF NOT EXISTS spotify_added_albums_artist_album_idx ON spotify_added_albums (artist_name, album_title)`;
  dbReady = true;
}

async function readStateFromDb(): Promise<AddedState> {
  const sql = getSql();
  if (!sql) return EMPTY_STATE;

  await ensureDbSchema();
  const rows = await sql<{
    spotify_album_id: string;
    artist_name: string;
    album_title: string;
    added_at: string;
  }>`
    SELECT spotify_album_id, artist_name, album_title, added_at
    FROM spotify_added_albums
  `;

  const added: AddedState['added'] = {};
  for (const row of rows) {
    added[row.spotify_album_id] = {
      artistName: row.artist_name,
      albumTitle: row.album_title,
      addedAt: new Date(row.added_at).toISOString()
    };
  }

  return { version: 1, added };
}

async function writeStateToDb(state: AddedState): Promise<void> {
  const sql = getSql();
  if (!sql) return;

  await ensureDbSchema();

  for (const [albumId, entry] of Object.entries(state.added)) {
    await sql`
      INSERT INTO spotify_added_albums (spotify_album_id, artist_name, album_title, added_at)
      VALUES (${albumId}, ${entry.artistName}, ${entry.albumTitle}, ${entry.addedAt}::timestamptz)
      ON CONFLICT (spotify_album_id) DO UPDATE SET
        artist_name = EXCLUDED.artist_name,
        album_title = EXCLUDED.album_title,
        added_at = EXCLUDED.added_at
    `;
  }
}

export async function readState(path: string): Promise<AddedState> {
  try {
    if (getDbUrl()) {
      return await readStateFromDb();
    }
  } catch {
    // fall back to file state on DB problems
  }

  try {
    const raw = await readFile(path, 'utf8');
    const parsed = JSON.parse(raw) as AddedState;
    if (!parsed || parsed.version !== 1 || typeof parsed.added !== 'object') {
      return EMPTY_STATE;
    }
    return parsed;
  } catch {
    return EMPTY_STATE;
  }
}

export async function writeStateAtomic(path: string, state: AddedState): Promise<void> {
  try {
    if (getDbUrl()) {
      await writeStateToDb(state);
      return;
    }
  } catch {
    // fall back to file state on DB problems
  }

  await mkdir(dirname(path), { recursive: true });
  const tmp = `${path}.tmp-${process.pid}-${Date.now()}`;
  await writeFile(tmp, JSON.stringify(state, null, 2), 'utf8');
  await rename(tmp, path);
}

export function hasAlbumId(state: AddedState, albumId: string): boolean {
  return Boolean(state.added[albumId]);
}

export function hasInputAlreadyAdded(state: AddedState, input: AlbumInput): boolean {
  const targetArtist = normalize(input.artistName);
  const targetAlbum = normalize(input.albumTitle);

  return Object.values(state.added).some((entry) => {
    return normalize(entry.artistName) === targetArtist && normalize(entry.albumTitle) === targetAlbum;
  });
}

export function markAdded(state: AddedState, albumId: string, input: AlbumInput): void {
  state.added[albumId] = {
    artistName: input.artistName,
    albumTitle: input.albumTitle,
    addedAt: new Date().toISOString()
  };
}
