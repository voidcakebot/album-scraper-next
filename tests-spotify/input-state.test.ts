import { describe, it, expect } from 'vitest';
import { mkdtemp, writeFile, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readAlbumInputFile } from '../lib/input';
import { readState, writeStateAtomic, markAdded, hasInputAlreadyAdded } from '../lib/state';

describe('input + state helpers', () => {
  it('parses JSON and JSONL inputs', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'spotify-input-'));
    const jsonPath = join(dir, 'in.json');
    const jsonlPath = join(dir, 'in.jsonl');

    await writeFile(
      jsonPath,
      JSON.stringify([
        { artistName: 'Radiohead', albumTitle: 'OK Computer' },
        { artistName: 'Bjork', albumTitle: 'Homogenic' }
      ])
    );

    await writeFile(
      jsonlPath,
      '{"artistName":"Radiohead","albumTitle":"OK Computer"}\n\n {"artistName":"Bjork","albumTitle":"Homogenic"}\n'
    );

    const a = await readAlbumInputFile(jsonPath);
    const b = await readAlbumInputFile(jsonlPath);

    expect(a).toHaveLength(2);
    expect(b).toHaveLength(2);
  });

  it('writes state atomically and supports already-added checks', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'spotify-state-'));
    const statePath = join(dir, 'spotify-added-albums.json');

    const state = await readState(statePath);
    markAdded(state, 'abc123', { artistName: 'Converge', albumTitle: 'Love Is Not Enough' });
    await writeStateAtomic(statePath, state);

    const raw = await readFile(statePath, 'utf8');
    const reread = await readState(statePath);

    expect(raw).toContain('abc123');
    expect(hasInputAlreadyAdded(reread, { artistName: 'Converge', albumTitle: 'Love Is Not Enough' })).toBe(true);
  });
});
