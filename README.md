# album-scraper-next

CLI + Next.js Web-UI zum Scrapen und Anzeigen von Albumdaten.

## Features
- CLI: `pnpm scrape <url1> <url2> ...`
- Scraping mit `fetch` + `cheerio`
- Robuste Heuristiken für Cover, Albumtitel und Artist
- Speichert Ergebnisse nach `data/albums.json`
- Next.js (App Router, TypeScript) zeigt Daten als Grid + Detailseite
- Tests mit Mocha
- CI + GitHub Pages Deploy Workflows enthalten

## Quickstart
```bash
pnpm install
pnpm test
pnpm scrape -- --out data/albums.json --concurrency 5 --timeout 15000 https://example.com/album1 https://example.com/album2
pnpm dev
```

## Scripts
- `pnpm dev`
- `pnpm build`
- `pnpm start`
- `pnpm scrape -- <urls...>`
- `pnpm test`

## Demo URLs (Platzhalter)
- https://example.com/demo-album-1
- https://example.com/demo-album-2
