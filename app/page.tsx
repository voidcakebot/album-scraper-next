import UrlGoForm from './components/UrlGoForm';
import SpotifyAddForm from './components/SpotifyAddForm';

export default function HomePage() {
  return (
    <main className="container">
      <section className="hero">
        <div>
          <p className="eyebrow">Album Scraper</p>
          <h1>Spotify Album Intake</h1>
          <p className="muted heroText">
            Gib eine URL ein und ich extrahiere Cover, Albumtitel und Artist direkt serverseitig.
            Die Ergebnisse werden nur temporär angezeigt und nicht dauerhaft gespeichert.
          </p>
        </div>
        <UrlGoForm />
      </section>

      <section className="emptyState">
        <h2>Nächster Schritt</h2>
        <p className="muted">
          Ziel: Aus den gesammelten Alben eine Liste bauen, die wir in Spotify-Alben überführen können.
        </p>
      </section>

      <SpotifyAddForm />
    </main>
  );
}
