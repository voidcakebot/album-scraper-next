# album-scraper-next

CLI + Next.js Web-UI zum Scrapen und Verarbeiten von Albumdaten.

## Features
- CLI: `pnpm scrape <url1> <url2> ...`
- Scraping mit `fetch` + `cheerio`
- Robuste Heuristiken für Cover, Albumtitel und Artist (inkl. Sputnik bestnewmusic multi-album)
- Next.js Web-UI: URL eingeben + Go -> serverseitiger Live-Scrape über `/api/scrape`
- Spotify Add-Albums CLI mit OAuth Refresh-Token (kein Passwort-Login)
- Idempotenz-Statefile: `data/spotify-added-albums.json`
- Tests: Mocha (Scraper) + Vitest/Nock (Spotify, offline)

## Quickstart
```bash
corepack pnpm install
corepack pnpm test
corepack pnpm dev
```

## Spotify ENV
```bash
export SPOTIFY_CLIENT_ID="..."
export SPOTIFY_CLIENT_SECRET="..."
export SPOTIFY_REFRESH_TOKEN="..."
```

## Spotify CLI
```bash
corepack pnpm spotify:add-albums -- --in data/input-albums.json --state data/spotify-added-albums.json
# optional:
# --format json|jsonl --dry-run --concurrency 3 --timeout 15000 --log-json
```

### Input Beispiele
JSON (`data/input-albums.json`):
```json
[
  { "artistName": "Radiohead", "albumTitle": "OK Computer" },
  { "artistName": "Björk", "albumTitle": "Homogenic" }
]
```

JSONL (`data/input-albums.jsonl`):
```jsonl
{"artistName":"Radiohead","albumTitle":"OK Computer"}
{"artistName":"Björk","albumTitle":"Homogenic"}
```

## Web tester on Vercel
- Seite enthält jetzt zusätzlich einen **Spotify Add-Albums Tester**.
- Eingabeformat pro Zeile: `Artist | Album`
- Endpoint: `POST /api/spotify/add-albums`
- Für produktive Nutzung in Vercel die 3 Spotify ENV-Variablen im Projekt setzen.

## Scripts
- `pnpm dev`
- `pnpm build`
- `pnpm start`
- `pnpm scrape -- <urls...>`
- `pnpm spotify:add-albums -- --in <path>`
- `pnpm test` (Mocha + Vitest)
