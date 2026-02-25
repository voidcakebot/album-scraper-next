import { readFile } from 'node:fs/promises';
import type { AlbumInput } from './spotify/types';

function toAlbumInput(value: unknown, index: number): AlbumInput {
  if (!value || typeof value !== 'object') {
    throw new Error(`Invalid item at index ${index}: expected object`);
  }

  const obj = value as Record<string, unknown>;
  const artistName = String(obj.artistName ?? '').trim();
  const albumTitle = String(obj.albumTitle ?? '').trim();

  if (!artistName || !albumTitle) {
    throw new Error(`Invalid item at index ${index}: artistName and albumTitle are required`);
  }

  return { artistName, albumTitle };
}

export async function readAlbumInputFile(path: string, format?: 'json' | 'jsonl'): Promise<AlbumInput[]> {
  const raw = await readFile(path, 'utf8');
  const inferred = format ?? (path.toLowerCase().endsWith('.jsonl') ? 'jsonl' : 'json');

  if (inferred === 'json') {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      throw new Error('JSON input must be an array');
    }
    return parsed.map((item, idx) => toAlbumInput(item, idx));
  }

  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  return lines.map((line, idx) => {
    const parsed = JSON.parse(line) as unknown;
    return toAlbumInput(parsed, idx);
  });
}
