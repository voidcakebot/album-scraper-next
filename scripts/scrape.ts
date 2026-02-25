#!/usr/bin/env node
import { program } from 'commander';
import pLimit from 'p-limit';
import { fetchHtml, parseAlbumFromHtml } from '../lib/scrape';
import { saveResults } from '../lib/storage';
import type { Album, ScrapeError } from '../lib/types';

program.name('scrape').argument('<urls...>', 'Album page URLs to scrape').option('--out <path>', 'Output JSON file', 'data/albums.json').option('--concurrency <number>', 'Max parallel requests', '5').option('--timeout <ms>', 'Request timeout in milliseconds', '15000').action(async (urls: string[], options) => {
  const out: string = options.out; const concurrency = Number(options.concurrency); const timeout = Number(options.timeout);
  if (!Number.isFinite(concurrency) || concurrency <= 0) throw new Error('--concurrency must be a positive number.');
  if (!Number.isFinite(timeout) || timeout <= 0) throw new Error('--timeout must be a positive number in ms.');
  const limit = pLimit(concurrency); const albums: Album[] = []; const errors: ScrapeError[] = [];
  await Promise.all(urls.map((sourceUrl) => limit(async () => {
    console.log(`Fetching ${sourceUrl} ...`);
    try {
      const html = await fetchHtml(sourceUrl, timeout);
      const parsed = parseAlbumFromHtml(html, sourceUrl);
      albums.push({ ...parsed, scrapedAt: new Date().toISOString() });
      console.log(`Parsed ${sourceUrl} -> ${parsed.artistName} / ${parsed.albumTitle}`);
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      errors.push({ sourceUrl, reason });
      console.error(`Failed ${sourceUrl}: ${reason}`);
    }
  })));
  await saveResults(out, albums, errors);
  console.log(`\nSaved ${albums.length} albums to ${out}`);
  if (errors.length > 0) {
    console.log(`Encountered ${errors.length} errors.`);
    errors.forEach((err) => console.log(`- ${err.sourceUrl}: ${err.reason}`));
    process.exitCode = 1;
  }
});
program.parseAsync(process.argv).catch((error: unknown) => { console.error(`Fatal: ${error instanceof Error ? error.message : String(error)}`); process.exit(1); });
