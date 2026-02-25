import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import type { Album, ScrapeError } from './types';

export async function saveResults(outFile: string, albums: Album[], errors: ScrapeError[]): Promise<void> {
  await mkdir(dirname(outFile), { recursive: true });
  await writeFile(outFile, JSON.stringify(albums, null, 2), 'utf8');
  if (errors.length > 0) {
    const errFile = outFile.replace(/\.json$/i, '.errors.json');
    await writeFile(errFile, JSON.stringify(errors, null, 2), 'utf8');
  }
}
