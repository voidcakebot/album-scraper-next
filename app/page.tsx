import WorkflowPanel from './components/WorkflowPanel';

export default function HomePage() {
  const defaultSpotifyClientId = process.env.SPOTIFY_CLIENT_ID ?? '';
  const defaultSpotifyClientSecret = process.env.SPOTIFY_CLIENT_SECRET ?? '';
  const defaultSpotifyRefreshToken = process.env.SPOTIFY_REFRESH_TOKEN ?? '';

  return (
    <main className="container">
      <section className="hero">
        <div>
          <p className="eyebrow">Album Scraper</p>
          <h1>Spotify Album Intake</h1>
          <p className="muted heroText">
            Gib eine URL ein und ich extrahiere Cover, Albumtitel und Artist direkt serverseitig.
            Danach übernehme ich die Treffer automatisch in das Spotify-Inputfeld darunter.
          </p>
        </div>
      </section>

      <section className="emptyState">
        <h2>Nächster Schritt</h2>
        <p className="muted">
          Ziel: Aus den gesammelten Alben eine Liste bauen, die wir in Spotify-Alben überführen können.
        </p>
      </section>

      <WorkflowPanel
        defaultSpotifyClientId={defaultSpotifyClientId}
        defaultSpotifyClientSecret={defaultSpotifyClientSecret}
        defaultSpotifyRefreshToken={defaultSpotifyRefreshToken}
      />
    </main>
  );
}
