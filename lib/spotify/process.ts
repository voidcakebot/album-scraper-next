import pLimit from 'p-limit';
import { getAccessToken, refreshAccessToken } from './auth';
import { addAlbumsToLibrary } from './library';
import { searchBestAlbumMatch } from './search';
import type { AddedState, AlbumInput, ProcessResult } from './types';
import { hasAlbumId, hasInputAlreadyAdded, markAdded } from '../state';

type ProcessOptions = {
  inputs: AlbumInput[];
  state: AddedState;
  concurrency: number;
  timeoutMs: number;
  dryRun?: boolean;
  onLog?: (line: string, payload?: object) => void;
};

export async function processAlbums(options: ProcessOptions): Promise<ProcessResult[]> {
  const limit = pLimit(options.concurrency);
  const results: ProcessResult[] = [];

  let accessToken = await getAccessToken(options.timeoutMs);

  const tasks = options.inputs.map((input) =>
    limit(async () => {
      options.onLog?.('started', input);

      if (hasInputAlreadyAdded(options.state, input)) {
        const result: ProcessResult = { input, status: 'skipped-already-added' };
        options.onLog?.('skipped already-added', input);
        results.push(result);
        return;
      }

      try {
        const best = await searchBestAlbumMatch({
          input,
          accessToken,
          timeoutMs: options.timeoutMs
        });

        if (!best) {
          const result: ProcessResult = { input, status: 'not-found' };
          options.onLog?.('not found', input);
          results.push(result);
          return;
        }

        options.onLog?.('found', {
          ...input,
          spotifyAlbumId: best.album.id,
          score: best.score
        });

        if (hasAlbumId(options.state, best.album.id)) {
          const result: ProcessResult = {
            input,
            status: 'skipped-already-added',
            spotifyAlbumId: best.album.id,
            score: best.score
          };
          options.onLog?.('skipped already-added', result);
          results.push(result);
          return;
        }

        if (options.dryRun) {
          const result: ProcessResult = {
            input,
            status: 'dry-run-found',
            spotifyAlbumId: best.album.id,
            score: best.score
          };
          results.push(result);
          options.onLog?.('dry-run found', result);
          return;
        }

        await addAlbumsToLibrary({
          albumIds: [best.album.id],
          accessToken,
          timeoutMs: options.timeoutMs,
          onUnauthorized: async () => {
            accessToken = await refreshAccessToken(options.timeoutMs);
            return accessToken;
          }
        });

        markAdded(options.state, best.album.id, input);

        const result: ProcessResult = {
          input,
          status: 'added',
          spotifyAlbumId: best.album.id,
          score: best.score
        };
        options.onLog?.('added ok', result);
        results.push(result);
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        const result: ProcessResult = { input, status: 'failed', reason };
        options.onLog?.('failed', { ...input, reason });
        results.push(result);
      }
    })
  );

  await Promise.all(tasks);
  return results;
}
