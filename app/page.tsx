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
          <p className="heroText">
            Gib eine URL ein und ich extrahiere Cover, Albumtitel und Artist direkt serverseitig.
            Die Ergebnisse werden automatisch ins Spotify-Inputfeld übernommen.
          </p>
        </div>
      </section>

      <WorkflowPanel
        defaultSpotifyClientId={defaultSpotifyClientId}
        defaultSpotifyClientSecret={defaultSpotifyClientSecret}
        defaultSpotifyRefreshToken={defaultSpotifyRefreshToken}
      />
    </main>
  );
}
