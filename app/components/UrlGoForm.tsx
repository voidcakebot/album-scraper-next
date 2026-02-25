'use client';

import Image from 'next/image';
import { FormEvent, useState } from 'react';

type Album = {
  sourceUrl: string;
  albumTitle: string;
  artistName: string;
  coverImageUrl: string;
  scrapedAt: string;
};

export default function UrlGoForm() {
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<Album[]>([]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setResults([]);
    setIsLoading(true);

    try {
      const response = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ url, timeout: 15000 })
      });

      const payload = (await response.json()) as { albums?: Album[]; error?: string };

      if (!response.ok || !payload.albums || payload.albums.length === 0) {
        throw new Error(payload.error ?? 'Scraping failed.');
      }

      setResults(payload.albums);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unbekannter Fehler.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="urlFormWrap">
      <form className="urlForm" onSubmit={onSubmit}>
        <label htmlFor="album-url" className="label">
          Album-URL live scrapen
        </label>
        <div className="inputRow">
          <input
            id="album-url"
            type="url"
            placeholder="https://example.com/album"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            className="urlInput"
            required
          />
          <button type="submit" className="goButton" disabled={isLoading}>
            {isLoading ? '…' : 'Go'}
          </button>
        </div>
        {error ? (
          <p className="errorText">{error}</p>
        ) : (
          <p className="hintText">Extrahiert Cover, Albumtitel und Artist serverseitig.</p>
        )}
      </form>

      {results.length > 0 ? (
        <>
          <p className="muted">Gefundene Alben: {results.length}</p>
          <section className="resultGrid">
            {results.map((result, idx) => (
              <article className="resultCard" key={`${result.sourceUrl}-${idx}`}>
                <Image
                  src={result.coverImageUrl}
                  alt={`${result.albumTitle} Cover`}
                  width={420}
                  height={420}
                  style={{ width: '100%', height: 'auto' }}
                />
                <div className="cardBody">
                  <h3>{result.albumTitle}</h3>
                  <p className="muted">{result.artistName}</p>
                  <p>
                    <a href={result.sourceUrl} target="_blank" rel="noreferrer noopener">
                      Quelle öffnen ↗
                    </a>
                  </p>
                </div>
              </article>
            ))}
          </section>
        </>
      ) : null}
    </div>
  );
}
