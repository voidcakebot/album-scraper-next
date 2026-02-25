import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { Album } from './types';
const DATA_FILE = join(process.cwd(), 'data', 'albums.json');
export async function loadAlbums(): Promise<Album[]> {
  try { const raw = await readFile(DATA_FILE, 'utf8'); const parsed = JSON.parse(raw) as Album[]; return Array.isArray(parsed) ? parsed : []; }
  catch { return []; }
}
