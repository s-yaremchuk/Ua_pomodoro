import React from 'react';

export default function Header({ onOpenSettings, isFullscreen, onToggleFullscreen }) {
  return (
    <header className="site-header" role="banner">
      <div className="logo" aria-label="UA Pomodoro SY.">
        <span className="logo-text">Ua pomodoro</span>
        <span className="logo-badge">SY.</span>
      </div>

      <div className="header-actions">
        {/* Settings toggle */}
        <button
          onClick={onOpenSettings}
          className="btn-icon"
          title="Налаштування"
          aria-label="Відкрити налаштування"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
          </svg>
        </button>

        {/* Fullscreen toggle */}
        <button
          onClick={onToggleFullscreen}
          className="btn-icon"
          title={isFullscreen ? 'Вийти з повного екрану (F)' : 'Повний екран (F)'}
          aria-label={isFullscreen ? 'Вийти з повного екрану' : 'Повний екран'}
        >
          {isFullscreen ? (
            <svg className="icon-fullscreen-exit" width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M6 1v5H1M15 6h-5V1M10 15v-5h5M1 10h5v5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          ) : (
            <svg className="icon-fullscreen-enter" width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M1 6V1h5M10 1h5v5M15 10v5h-5M6 15H1v-5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          )}
        </button>
      </div>
    </header>
  );
}
