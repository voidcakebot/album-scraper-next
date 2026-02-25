export type SpotifyCredentials = {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
};

type TokenCache = {
  accessToken: string;
  expiresAtMs: number;
  credentialKey: string;
};

let cache: TokenCache | null = null;

function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env: ${name}`);
  }
  return value;
}

function resolveCredentials(credentials?: Partial<SpotifyCredentials>): SpotifyCredentials {
  return {
    clientId: credentials?.clientId?.trim() || getRequiredEnv('SPOTIFY_CLIENT_ID'),
    clientSecret: credentials?.clientSecret?.trim() || getRequiredEnv('SPOTIFY_CLIENT_SECRET'),
    refreshToken: credentials?.refreshToken?.trim() || getRequiredEnv('SPOTIFY_REFRESH_TOKEN')
  };
}

function getCredentialKey(credentials: SpotifyCredentials): string {
  return `${credentials.clientId}:${credentials.clientSecret}:${credentials.refreshToken}`;
}

export async function refreshAccessToken(timeoutMs = 15000, credentials?: Partial<SpotifyCredentials>): Promise<string> {
  const resolved = resolveCredentials(credentials);
  const clientId = resolved.clientId;
  const clientSecret = resolved.clientSecret;
  const refreshToken = resolved.refreshToken;

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
      expiresAtMs: Date.now() + expiresInSec * 1000 - 10_000,
      credentialKey: getCredentialKey(resolved)
    };

    return payload.access_token;
  } finally {
    clearTimeout(timer);
  }
}

export async function getAccessToken(timeoutMs = 15000, credentials?: Partial<SpotifyCredentials>): Promise<string> {
  const resolved = resolveCredentials(credentials);
  const credentialKey = getCredentialKey(resolved);

  if (cache && cache.credentialKey === credentialKey && Date.now() < cache.expiresAtMs) {
    return cache.accessToken;
  }
  return refreshAccessToken(timeoutMs, resolved);
}

export function clearAccessTokenCache(): void {
  cache = null;
}
