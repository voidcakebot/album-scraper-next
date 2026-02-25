type AddAlbumsParams = {
  albumIds: string[];
  accessToken: string;
  timeoutMs: number;
  onUnauthorized: () => Promise<string>;
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function addAlbumsToLibrary(params: AddAlbumsParams): Promise<void> {
  let { accessToken } = params;
  const ids = params.albumIds.join(',');
  const baseUrl = `https://api.spotify.com/v1/me/albums?ids=${encodeURIComponent(ids)}`;

  let unauthorizedRetried = false;
  let rateLimitRetries = 0;

  while (true) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), params.timeoutMs);

    try {
      const response = await fetch(baseUrl, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'content-type': 'application/json'
        },
        signal: controller.signal
      });

      if (response.ok) return;

      if (response.status === 401 && !unauthorizedRetried) {
        unauthorizedRetried = true;
        accessToken = await params.onUnauthorized();
        continue;
      }

      if (response.status === 429 && rateLimitRetries < 2) {
        rateLimitRetries += 1;
        const retryAfterSec = Number(response.headers.get('retry-after') ?? '1');
        await sleep(Math.max(1, retryAfterSec) * 1000);
        continue;
      }

      const text = await response.text();
      throw new Error(`Spotify add-to-library failed (${response.status}): ${text}`);
    } finally {
      clearTimeout(timer);
    }
  }
}
