import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import type { AddedState, AlbumInput } from './spotify/types';

const EMPTY_STATE: AddedState = {
  version: 1,
  added: {}
};

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[’`]/g, "'")
    .replace(/[^\p{L}\p{N}' ]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export async function readState(path: string): Promise<AddedState> {
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
