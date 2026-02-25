export type AlbumInput = {
  artistName: string;
  albumTitle: string;
};

export type SpotifyAlbum = {
  id: string;
  name: string;
  artists: Array<{ name: string }>;
  external_urls?: { spotify?: string };
};

export type SpotifySearchResponse = {
  albums?: {
    items: SpotifyAlbum[];
  };
};

export type AddedState = {
  version: 1;
  added: Record<
    string,
    {
      artistName: string;
      albumTitle: string;
      addedAt: string;
    }
  >;
};

export type ProcessResult = {
  input: AlbumInput;
  status: 'added' | 'skipped-already-added' | 'not-found' | 'failed' | 'dry-run-found';
  spotifyAlbumId?: string;
  score?: number;
  reason?: string;
};
