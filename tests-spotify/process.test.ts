import { beforeEach, afterEach, describe, expect, it } from 'vitest';
import nock from 'nock';
import { processAlbums } from '../lib/spotify/process';
import type { AddedState } from '../lib/spotify/types';
import { clearAccessTokenCache } from '../lib/spotify/auth';

function emptyState(): AddedState {
  return { version: 1, added: {} };
}

describe('spotify process flow', () => {
  beforeEach(() => {
    process.env.SPOTIFY_CLIENT_ID = 'cid';
    process.env.SPOTIFY_CLIENT_SECRET = 'secret';
    process.env.SPOTIFY_REFRESH_TOKEN = 'refresh';
    nock.disableNetConnect();
    clearAccessTokenCache();
  });

  afterEach(() => {
    nock.cleanAll();
    nock.enableNetConnect();
  });

  it('found -> add ok -> state updated', async () => {
    const state = emptyState();

    nock('https://accounts.spotify.com').post('/api/token').reply(200, { access_token: 'tok', expires_in: 3600 });
    nock('https://api.spotify.com')
      .get('/v1/search')
      .query(true)
      .reply(200, { albums: { items: [{ id: 'id1', name: 'OK Computer', artists: [{ name: 'Radiohead' }] }] } });
    nock('https://api.spotify.com').put('/v1/me/albums').query(true).reply(200);

    const res = await processAlbums({
      inputs: [{ artistName: 'Radiohead', albumTitle: 'OK Computer' }],
      state,
      concurrency: 1,
      timeoutMs: 5000
    });

    expect(res[0].status).toBe('added');
    expect(state.added.id1).toBeDefined();
  });

  it('not found -> no state update', async () => {
    const state = emptyState();

    nock('https://accounts.spotify.com').post('/api/token').reply(200, { access_token: 'tok', expires_in: 3600 });
    nock('https://api.spotify.com').get('/v1/search').query(true).reply(200, { albums: { items: [] } });

    const res = await processAlbums({
      inputs: [{ artistName: 'A', albumTitle: 'B' }],
      state,
      concurrency: 1,
      timeoutMs: 5000
    });

    expect(res[0].status).toBe('not-found');
    expect(Object.keys(state.added)).toHaveLength(0);
  });

  it('already in state -> skip without add call', async () => {
    const state = emptyState();
    state.added.id0 = { artistName: 'Converge', albumTitle: 'Love Is Not Enough', addedAt: new Date().toISOString() };

    nock('https://accounts.spotify.com').post('/api/token').reply(200, { access_token: 'tok', expires_in: 3600 });

    const res = await processAlbums({
      inputs: [{ artistName: 'Converge', albumTitle: 'Love Is Not Enough' }],
      state,
      concurrency: 1,
      timeoutMs: 5000
    });

    expect(res[0].status).toBe('skipped-already-added');
  });

  it('401 on add -> refresh -> retry success', async () => {
    const state = emptyState();

    nock('https://accounts.spotify.com')
      .post('/api/token')
      .reply(200, { access_token: 'tok1', expires_in: 1 })
      .post('/api/token')
      .reply(200, { access_token: 'tok2', expires_in: 3600 });

    nock('https://api.spotify.com')
      .get('/v1/search')
      .query(true)
      .reply(200, { albums: { items: [{ id: 'id2', name: 'Dreamcrush', artists: [{ name: 'Mol' }] }] } });

    nock('https://api.spotify.com').put('/v1/me/albums').query(true).reply(401, { error: 'expired' });
    nock('https://api.spotify.com').put('/v1/me/albums').query(true).reply(200);

    const res = await processAlbums({
      inputs: [{ artistName: 'Mol', albumTitle: 'Dreamcrush' }],
      state,
      concurrency: 1,
      timeoutMs: 5000
    });

    expect(res[0].status).toBe('added');
    expect(state.added.id2).toBeDefined();
  });

  it('429 on add -> retry-after respected -> success', async () => {
    const state = emptyState();

    nock('https://accounts.spotify.com').post('/api/token').reply(200, { access_token: 'tok', expires_in: 3600 });
    nock('https://api.spotify.com')
      .get('/v1/search')
      .query(true)
      .reply(200, { albums: { items: [{ id: 'id3', name: 'Album', artists: [{ name: 'Artist' }] }] } });

    nock('https://api.spotify.com').put('/v1/me/albums').query(true).reply(429, '', { 'Retry-After': '0' });
    nock('https://api.spotify.com').put('/v1/me/albums').query(true).reply(200);

    const res = await processAlbums({
      inputs: [{ artistName: 'Artist', albumTitle: 'Album' }],
      state,
      concurrency: 1,
      timeoutMs: 5000
    });

    expect(res[0].status).toBe('added');
  });

  it('dry-run does not add or mutate state', async () => {
    const state = emptyState();

    nock('https://accounts.spotify.com').post('/api/token').reply(200, { access_token: 'tok', expires_in: 3600 });
    nock('https://api.spotify.com')
      .get('/v1/search')
      .query(true)
      .reply(200, { albums: { items: [{ id: 'id4', name: 'OK Computer', artists: [{ name: 'Radiohead' }] }] } });

    const res = await processAlbums({
      inputs: [{ artistName: 'Radiohead', albumTitle: 'OK Computer' }],
      state,
      concurrency: 1,
      timeoutMs: 5000,
      dryRun: true
    });

    expect(res[0].status).toBe('dry-run-found');
    expect(Object.keys(state.added)).toHaveLength(0);
  });
});
