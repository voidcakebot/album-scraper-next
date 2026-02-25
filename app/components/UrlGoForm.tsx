'use client';

import { FormEvent, useState } from 'react';

export default function UrlGoForm() {
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      const parsed = new URL(url);
      setError('');
      window.open(parsed.toString(), '_blank', 'noopener,noreferrer');
    } catch {
      setError('Bitte gib eine gültige URL ein (inkl. http/https).');
    }
  }

  return (
    <form className="urlForm" onSubmit={onSubmit}>
      <label htmlFor="album-url" className="label">
        Album-URL testen
      </label>
      <div className="inputRow">
        <input
          id="album-url"
          type="url"
          placeholder="https://example.com/album"
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          className="urlInput"
          required
        />
        <button type="submit" className="goButton">
          Go
        </button>
      </div>
      {error ? <p className="errorText">{error}</p> : <p className="hintText">Öffnet die URL in einem neuen Tab.</p>}
    </form>
  );
}
