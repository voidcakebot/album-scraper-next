import { NextRequest, NextResponse } from 'next/server';
import { fetchHtml, parseAlbumsFromHtml } from '../../../lib/scrape';

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { url?: string; timeout?: number };
    const sourceUrl = body.url?.trim();

    if (!sourceUrl) {
      return NextResponse.json({ error: 'Missing field: url' }, { status: 400 });
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(sourceUrl);
    } catch {
      return NextResponse.json({ error: 'Invalid URL. Please provide a valid http/https URL.' }, { status: 400 });
    }

    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return NextResponse.json({ error: 'Only http/https URLs are allowed.' }, { status: 400 });
    }

    const timeout = Number(body.timeout ?? 15000);
    const html = await fetchHtml(parsedUrl.toString(), timeout);
    const albums = parseAlbumsFromHtml(html, parsedUrl.toString()).map((album) => ({
      ...album,
      scrapedAt: new Date().toISOString()
    }));

    return NextResponse.json({ albums });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown scrape error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
