import { strict as assert } from 'node:assert';
import { fetchHtml, parseAlbumFromHtml, parseAlbumsFromHtml } from '../lib/scrape';

describe('parseAlbumFromHtml', () => {
  it('parses og meta fields', () => {
    const html = `<html><head><meta property="og:title" content="Test Artist - Test Album"><meta property="og:image" content="/cover.jpg"></head><body><h1>Ignore Me</h1></body></html>`;
    const parsed = parseAlbumFromHtml(html, 'https://example.com/album');
    assert.equal(parsed.albumTitle, 'Test Artist - Test Album');
    assert.equal(parsed.artistName, 'Test Artist');
    assert.equal(parsed.coverImageUrl, 'https://example.com/cover.jpg');
  });

  it('falls back to JSON-LD for album and artist', () => {
    const html = `<html><head><title>Site</title></head><body><script type="application/ld+json">{"@type":"MusicAlbum","name":"LD Album","image":"https://img/ld.jpg","byArtist":{"name":"LD Artist"}}</script></body></html>`;
    const parsed = parseAlbumFromHtml(html, 'https://example.org/a');
    assert.equal(parsed.albumTitle, 'LD Album');
    assert.equal(parsed.artistName, 'LD Artist');
    assert.equal(parsed.coverImageUrl, 'https://img/ld.jpg');
  });

  it('throws if no image can be found', () => {
    const html = `<html><head><title>Album by Artist</title></head><body><h1>Album</h1></body></html>`;
    assert.throws(() => parseAlbumFromHtml(html, 'https://example.org'));
  });

  it('parses Sputnikmusic bestnewmusic page structure robustly (integration)', async function () {
    this.timeout(20000);
    const sourceUrl = 'https://www.sputnikmusic.com/bestnewmusic';
    const html = await fetchHtml(sourceUrl, 15000);
    const parsed = parseAlbumsFromHtml(html, sourceUrl);

    assert.ok(parsed.length >= 5, 'should parse multiple albums from bestnewmusic listing');

    for (const album of parsed) {
      assert.ok(album.artistName.length > 0, 'artistName should not be empty');
      assert.ok(album.albumTitle.length > 0, 'albumTitle should not be empty');
      assert.ok(album.coverImageUrl.startsWith('http'), 'coverImageUrl should be absolute');
      assert.ok(album.sourceUrl.startsWith('http'), 'sourceUrl should be absolute');
    }
  });
});
