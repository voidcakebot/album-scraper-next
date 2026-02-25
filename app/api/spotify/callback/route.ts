import { NextRequest, NextResponse } from 'next/server';

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env: ${name}`);
  return value;
}

export async function GET(request: NextRequest) {
  try {
    const code = request.nextUrl.searchParams.get('code');
    if (!code) {
      return new NextResponse('Missing OAuth code', { status: 400 });
    }

    const clientId = required('SPOTIFY_CLIENT_ID');
    const clientSecret = required('SPOTIFY_CLIENT_SECRET');
    const redirectUri = required('SPOTIFY_REDIRECT_URI');

    const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri
    });

    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${basic}`,
        'content-type': 'application/x-www-form-urlencoded'
      },
      body
    });

    const payload = (await response.json()) as {
      access_token?: string;
      refresh_token?: string;
      error?: string;
      error_description?: string;
    };

    if (!response.ok || !payload.refresh_token) {
      return new NextResponse(
        `Spotify token exchange failed (${response.status}): ${payload.error ?? ''} ${payload.error_description ?? ''}`,
        { status: 500 }
      );
    }

    const html = `<!doctype html>
<html><head><meta charset="utf-8"><title>Spotify OAuth Success</title>
<style>body{font-family:system-ui;background:#0b1020;color:#eaf0ff;padding:24px}code,textarea{width:100%;background:#111a33;color:#eaf0ff;border:1px solid #334;padding:10px;border-radius:8px}textarea{height:120px} .ok{color:#7ef0c1}</style>
</head><body>
<h2 class="ok">Spotify verbunden ✅</h2>
<p>Kopiere diesen Wert in Vercel als <b>SPOTIFY_REFRESH_TOKEN</b>:</p>
<textarea readonly>${payload.refresh_token}</textarea>
<p>Danach neu deployen oder kurz warten und dann den Spotify-Tester erneut ausführen.</p>
</body></html>`;

    return new NextResponse(html, { headers: { 'content-type': 'text/html; charset=utf-8' } });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new NextResponse(message, { status: 500 });
  }
}
