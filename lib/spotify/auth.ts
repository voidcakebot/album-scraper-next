type TokenCache = {
  accessToken: string;
  expiresAtMs: number;
};

let cache: TokenCache | null = null;

function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env: ${name}`);
  }
  return value;
}

export async function refreshAccessToken(timeoutMs = 15000): Promise<string> {
  const clientId = getRequiredEnv('SPOTIFY_CLIENT_ID');
  const clientSecret = getRequiredEnv('SPOTIFY_CLIENT_SECRET');
  const refreshToken = getRequiredEnv('SPOTIFY_REFRESH_TOKEN');

  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken
  });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${basic}`,
        'content-type': 'application/x-www-form-urlencoded'
      },
      body,
      signal: controller.signal
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Spotify token refresh failed (${response.status}): ${text}`);
    }

    const payload = (await response.json()) as {
      access_token: string;
      expires_in?: number;
    };

    const expiresInSec = payload.expires_in ?? 3600;
    cache = {
      accessToken: payload.access_token,
      expiresAtMs: Date.now() + expiresInSec * 1000 - 10_000
    };

    return payload.access_token;
  } finally {
    clearTimeout(timer);
  }
}

export async function getAccessToken(timeoutMs = 15000): Promise<string> {
  if (cache && Date.now() < cache.expiresAtMs) {
    return cache.accessToken;
  }
  return refreshAccessToken(timeoutMs);
}

export function clearAccessTokenCache(): void {
  cache = null;
}
