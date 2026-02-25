import Image from 'next/image';
import { loadAlbums } from '../lib/albums';
import UrlGoForm from './components/UrlGoForm';

export default async function HomePage() {
  const albums = await loadAlbums();

  return (
    <main className="container">
      <section className="hero">
        <div>
          <p className="eyebrow">Album Scraper</p>
          <h1>Modern Album Dashboard</h1>
          <p className="muted heroText">
            Scrape deine Albumseiten per CLI und browse die Ergebnisse hier. Unten kannst du direkt eine URL
            eingeben und mit <strong>Go</strong> öffnen.
          </p>
        </div>
        <UrlGoForm />
      </section>

      <section>
        <h2>Gesammelte Alben</h2>
        <p className="muted">
          Quelle: <code>data/albums.json</code>
        </p>

        {albums.length === 0 ? (
          <div className="emptyState">
            <p>Noch keine Daten gefunden.</p>
            <p>
              Führe zuerst <code>pnpm scrape &lt;url1&gt; &lt;url2&gt; ...</code> aus.
            </p>
          </div>
        ) : (
          <section className="grid">
            {albums.map((album, index) => (
              <article className="card" key={`${album.sourceUrl}-${index}`}>
                <Image
                  src={album.coverImageUrl}
                  alt={`${album.albumTitle} Cover`}
                  width={500}
                  height={500}
                  style={{ width: '100%', height: 'auto' }}
                />
                <div className="cardBody">
                  <h3>{album.albumTitle}</h3>
                  <p className="muted">{album.artistName}</p>
                  <p>
                    <a href={album.sourceUrl} target="_blank" rel="noreferrer noopener">
                      Quelle öffnen ↗
                    </a>
                  </p>
                </div>
              </article>
            ))}
          </section>
        )}
      </section>
    </main>
  );
}
