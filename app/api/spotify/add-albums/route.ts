import { NextRequest, NextResponse } from 'next/server';
import { processAlbums } from '../../../../lib/spotify/process';
import { readState, writeStateAtomic } from '../../../../lib/state';
import type { AlbumInput } from '../../../../lib/spotify/types';

function resolveStatePath(inputPath?: string): string {
  if (!inputPath || inputPath.trim() === '') {
    return '/tmp/spotify-added-albums.json';
  }

  const trimmed = inputPath.trim();
  if (trimmed.startsWith('/')) return trimmed;

  // On Vercel/serverless, relative project paths are often read-only.
  // Keep relative paths in /tmp to ensure write access.
  return `/tmp/${trimmed.replace(/^\.?\/?/, '')}`;
}

function parseInputText(text: string): AlbumInput[] {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const result: AlbumInput[] = [];
  for (const line of lines) {
    const [artistName, albumTitle] = line.split('|').map((v) => v.trim());
    if (!artistName || !albumTitle) {
      throw new Error('Invalid line format. Use: Artist | Album');
    }
    result.push({ artistName, albumTitle });
  }

  return result;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      inputText?: string;
      dryRun?: boolean;
      statePath?: string;
      timeoutMs?: number;
      concurrency?: number;
      spotifyClientId?: string;
      spotifyClientSecret?: string;
      spotifyRefreshToken?: string;
    };

    const inputText = body.inputText?.trim() ?? '';
    if (!inputText) {
      return NextResponse.json({ error: 'Missing inputText' }, { status: 400 });
    }

    const inputs = parseInputText(inputText);
    const statePath = resolveStatePath(body.statePath);
    const state = await readState(statePath);

    const results = await processAlbums({
      inputs,
      state,
      concurrency: Number(body.concurrency ?? 3),
      timeoutMs: Number(body.timeoutMs ?? 15000),
      dryRun: Boolean(body.dryRun),
      spotifyCredentials: {
        clientId: body.spotifyClientId,
        clientSecret: body.spotifyClientSecret,
        refreshToken: body.spotifyRefreshToken
      }
    });

    if (!body.dryRun) {
      await writeStateAtomic(statePath, state);
    }

    return NextResponse.json({
      summary: {
        totalInput: inputs.length,
        skippedAlreadyAdded: results.filter((r) => r.status === 'skipped-already-added').length,
        notFound: results.filter((r) => r.status === 'not-found').length,
        addedNewly: results.filter((r) => r.status === 'added').length,
        failed: results.filter((r) => r.status === 'failed').length
      },
      statePath,
      results
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
