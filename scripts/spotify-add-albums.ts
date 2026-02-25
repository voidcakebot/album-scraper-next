#!/usr/bin/env node
import { program } from 'commander';
import { readAlbumInputFile } from '../lib/input';
import { readState, writeStateAtomic } from '../lib/state';
import { processAlbums } from '../lib/spotify/process';

program
  .name('spotify:add-albums')
  .requiredOption('--in <path>', 'Input file (JSON or JSONL)')
  .option('--format <format>', 'Input format: json|jsonl')
  .option('--state <path>', 'State file path', 'data/spotify-added-albums.json')
  .option('--dry-run', 'Search only, do not add to library', false)
  .option('--concurrency <n>', 'Concurrency', '3')
  .option('--timeout <ms>', 'Timeout in ms', '15000')
  .option('--log-json', 'Emit JSON logs', false)
  .action(async (opts) => {
    const format = opts.format as 'json' | 'jsonl' | undefined;
    const concurrency = Number(opts.concurrency);
    const timeoutMs = Number(opts.timeout);

    if (!Number.isFinite(concurrency) || concurrency <= 0) {
      throw new Error('--concurrency must be a positive number');
    }
    if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
      throw new Error('--timeout must be a positive number');
    }

    const input = await readAlbumInputFile(opts.in, format);
    const state = await readState(opts.state);

    const log = (line: string, payload?: object) => {
      if (opts.logJson) {
        console.log(JSON.stringify({ line, payload }));
        return;
      }
      if (payload) {
        console.log(`${line}: ${JSON.stringify(payload)}`);
      } else {
        console.log(line);
      }
    };

    const results = await processAlbums({
      inputs: input,
      state,
      concurrency,
      timeoutMs,
      dryRun: Boolean(opts.dryRun),
      onLog: log
    });

    if (!opts.dryRun) {
      await writeStateAtomic(opts.state, state);
    }

    const summary = {
      totalInput: input.length,
      skippedAlreadyAdded: results.filter((r) => r.status === 'skipped-already-added').length,
      notFound: results.filter((r) => r.status === 'not-found').length,
      addedNewly: results.filter((r) => r.status === 'added').length,
      failed: results.filter((r) => r.status === 'failed').length
    };

    const newlyAdded = results
      .filter((r) => r.status === 'added')
      .map((r) => ({
        artistName: r.input.artistName,
        albumTitle: r.input.albumTitle,
        spotifyAlbumId: r.spotifyAlbumId
      }));

    console.log('\nSummary');
    console.table(summary);

    if (newlyAdded.length > 0) {
      console.log('Newly added albums:');
      console.table(newlyAdded);
    } else {
      console.log('No new albums added in this run.');
    }

    if (summary.failed > 0) {
      process.exitCode = 1;
    }
  });

program.parseAsync(process.argv).catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Fatal: ${message}`);
  process.exit(1);
});
