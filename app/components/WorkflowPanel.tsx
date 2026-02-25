'use client';

import { useState } from 'react';
import UrlGoForm from './UrlGoForm';
import SpotifyAddForm from './SpotifyAddForm';

type ScrapedAlbum = {
  sourceUrl: string;
  albumTitle: string;
  artistName: string;
  coverImageUrl: string;
  scrapedAt: string;
};

function toSpotifyInputText(albums: ScrapedAlbum[]): string {
  const lines = albums.map((a) => `${a.artistName} | ${a.albumTitle}`);
  return lines.join('\n');
}

export default function WorkflowPanel() {
  const [spotifyInputText, setSpotifyInputText] = useState('Converge | Love Is Not Enough\nMol | Dreamcrush');

  return (
    <>
      <UrlGoForm
        onResultsChange={(albums) => {
          if (albums.length > 0) {
            setSpotifyInputText(toSpotifyInputText(albums));
          }
        }}
      />
      <SpotifyAddForm inputText={spotifyInputText} onInputTextChange={setSpotifyInputText} />
    </>
  );
}
