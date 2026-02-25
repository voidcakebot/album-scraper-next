import { NextResponse } from 'next/server';

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env: ${name}`);
  return value;
}

export async function GET() {
  try {
    const clientId = required('SPOTIFY_CLIENT_ID');
    const redirectUri = required('SPOTIFY_REDIRECT_URI');

    const url = new URL('https://accounts.spotify.com/authorize');
    url.searchParams.set('client_id', clientId);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('redirect_uri', redirectUri);
    url.searchParams.set('scope', 'user-library-modify');

    return NextResponse.json({ authorizeUrl: url.toString() });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
