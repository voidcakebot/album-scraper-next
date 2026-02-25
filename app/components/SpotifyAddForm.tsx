'use client';

import { useState } from 'react';

type ApiResult = {
  summary: {
    totalInput: number;
    skippedAlreadyAdded: number;
    notFound: number;
    addedNewly: number;
    failed: number;
  };
  results: Array<{
    input: { artistName: string; albumTitle: string };
    status: string;
    spotifyAlbumId?: string;
    reason?: string;
  }>;
};

const EXAMPLE = `Converge | Love Is Not Enough\nMol | Dreamcrush`;

export default function SpotifyAddForm() {
  const [inputText, setInputText] = useState(EXAMPLE);
  const [dryRun, setDryRun] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<ApiResult | null>(null);

  async function run() {
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const response = await fetch('/api/spotify/add-albums', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ inputText, dryRun, concurrency: 3, timeoutMs: 15000 })
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? 'Request failed');
      setResult(payload as ApiResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="urlForm" style={{ marginTop: 16 }}>
      <h3 style={{ marginTop: 0 }}>Spotify Add-Albums Tester</h3>
      <p className="hintText">Format pro Zeile: <code>Artist | Album</code></p>
      <textarea
        value={inputText}
        onChange={(e) => setInputText(e.target.value)}
        className="urlInput"
        rows={6}
        style={{ width: '100%', marginBottom: 10 }}
      />
      <label className="hintText" style={{ display: 'block', marginBottom: 10 }}>
        <input type="checkbox" checked={dryRun} onChange={(e) => setDryRun(e.target.checked)} /> Dry-run (nicht hinzufügen)
      </label>
      <button className="goButton" onClick={run} disabled={loading}>
        {loading ? 'Running…' : 'Run Spotify Add'}
      </button>

      {error ? <p className="errorText">{error}</p> : null}

      {result ? (
        <div style={{ marginTop: 14 }}>
          <pre className="hintText" style={{ whiteSpace: 'pre-wrap' }}>{JSON.stringify(result.summary, null, 2)}</pre>
          <div className="resultGrid">
            {result.results.map((r, idx) => (
              <article className="resultCard" key={idx}>
                <div className="cardBody">
                  <strong>{r.input.artistName} — {r.input.albumTitle}</strong>
                  <p className="muted">Status: {r.status}</p>
                  {r.spotifyAlbumId ? <p className="muted">ID: {r.spotifyAlbumId}</p> : null}
                  {r.reason ? <p className="errorText">{r.reason}</p> : null}
                </div>
              </article>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
