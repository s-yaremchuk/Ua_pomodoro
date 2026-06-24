import React, { useState, useEffect, useRef } from 'react';

export default function SpotifyPlayer({
  isConnected,
  isPlaying,
  isShuffled,
  track,
  volume,
  onConnect,
  onDisconnect,
  onTogglePlay,
  onNext,
  onPrev,
  onVolumeChange,
  onToggleShuffle,
}) {
  const [localVolume, setLocalVolume] = useState(volume);
  const lastValRef = useRef(volume);
  const throttleTimerRef = useRef(null);

  // Sync with prop if changed externally
  useEffect(() => {
    setLocalVolume(volume);
    lastValRef.current = volume;
  }, [volume]);

  const handleVolumeChangeLocal = (e) => {
    const val = Number(e.target.value);
    setLocalVolume(val);
    lastValRef.current = val;

    if (!throttleTimerRef.current) {
      throttleTimerRef.current = setTimeout(() => {
        onVolumeChange(lastValRef.current);
        throttleTimerRef.current = null;
      }, 150);
    }
  };

  useEffect(() => {
    return () => {
      if (throttleTimerRef.current) {
        clearTimeout(throttleTimerRef.current);
      }
    };
  }, []);

  return (
    <section className="panel-section" id="spotify-section" aria-label="Spotify плеєр">
      <h2 className="panel-label">SPOTIFY</h2>

      {!isConnected ? (
        /* Login card (shown when not authenticated) */
        <div id="spotify-login-card" className="spotify-login-card">
          <p>Підключіть Spotify Premium-акаунт щоб слухати музику прямо в таймері.</p>
          <button
            onClick={onConnect}
            id="btn-spotify-connect"
            className="btn-spotify"
            aria-label="Увійти через Spotify"
          >
            {/* Spotify logo mark */}
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
            </svg>
            ПІДКЛЮЧИТИ SPOTIFY
          </button>
        </div>
      ) : (
        /* Player UI (shown after auth) */
        <div id="spotify-player-ui" className="spotify-player visible" style={{ display: 'flex' }}>
          <div className="spotify-player-main">
            {/* Now playing */}
            <div className="now-playing" aria-live="polite" aria-atomic="true">
              {track?.image ? (
                <img
                  id="track-art"
                  className="track-art"
                  src={track.image}
                  alt={`${track.name || ''} — обкладинка`}
                  style={{ display: 'block' }}
                />
              ) : (
                <div className="track-art-placeholder" id="track-art-placeholder" aria-hidden="true">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="var(--grey-dim)" stroke-width="1.5"/>
                    <circle cx="12" cy="12" r="3" fill="var(--grey-dim)"/>
                    <path d="M12 2a10 10 0 010 20" stroke="var(--grey-dim)" stroke-width="1.5" stroke-dasharray="3 3"/>
                  </svg>
                </div>
              )}

              <div className="track-info">
                <div id="track-name" className="track-name">
                  {track?.name || 'Очікування...'}
                </div>
                <div id="track-artist" className="track-artist">
                  {track?.artist || '—'}
                </div>
                <div id="track-status" className="track-status">
                  {isPlaying ? '▶ ГРАЄ' : '⏸ ПАУЗА'}
                </div>
              </div>

              <button
                onClick={onDisconnect}
                id="btn-spotify-logout"
                className="btn-icon"
                title="Від'єднати Spotify"
                aria-label="Вийти зі Spotify"
                style={{ flexShrink: 0 }}
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                  <path d="M5 7h8M10 4l3 3-3 3M5 1H2a1 1 0 00-1 1v10a1 1 0 001 1h3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </button>
            </div>

            {/* Transport controls */}
            <div className="transport-controls" role="group" aria-label="Управління відтворенням">
              {/* Shuffle button */}
              <button
                onClick={onToggleShuffle}
                className={`btn-transport-secondary ${isShuffled ? 'active' : ''}`}
                title="Перемішати"
                aria-label={isShuffled ? "Вимкнути перемішування" : "Увімкнути перемішування"}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="16 3 21 3 21 8"/>
                  <line x1="4" y1="20" x2="21" y2="3"/>
                  <polyline points="21 16 21 21 16 21"/>
                  <line x1="15" y1="15" x2="21" y2="21"/>
                  <line x1="4" y1="4" x2="9" y2="9"/>
                </svg>
              </button>

              <button
                onClick={onPrev}
                id="btn-sp-prev"
                className="btn-transport"
                aria-label="Попередній трек"
              >
                <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor" aria-hidden="true">
                  <path d="M3 3v12M15 3L7 9l8 6V3z"/>
                </svg>
              </button>

              <button
                onClick={onTogglePlay}
                id="btn-sp-playpause"
                className="btn-transport play-pause"
                aria-label={isPlaying ? 'Пауза' : 'Відтворити'}
              >
                {isPlaying ? (
                  <svg className="icon-pause" width="20" height="20" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <rect x="4" y="3" width="5" height="14" rx="1"/>
                    <rect x="11" y="3" width="5" height="14" rx="1"/>
                  </svg>
                ) : (
                  <svg className="icon-play" width="20" height="20" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path d="M5 3l12 7-12 7V3z"/>
                  </svg>
                )}
              </button>

              <button
                onClick={onNext}
                id="btn-sp-next"
                className="btn-transport"
                aria-label="Наступний трек"
              >
                <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor" aria-hidden="true">
                  <path d="M15 3v12M3 3l8 6-8 6V3z"/>
                </svg>
              </button>
            </div>
          </div>

          {/* Volume control — Vertical column */}
          <div className="volume-control-vertical">
            <input
              type="range"
              id="slider-volume"
              min="0"
              max="100"
              orient="vertical"
              value={localVolume}
              onChange={handleVolumeChangeLocal}
              className="input-range-vertical"
              aria-label="Гучність"
            />
            <svg className="icon-volume" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
              <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
            </svg>
          </div>
        </div>
      )}
    </section>
  );
}
