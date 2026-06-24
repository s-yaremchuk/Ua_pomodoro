import React from 'react';

export const MODE = {
  FOCUS: 'FOCUS',
  SHORT: 'SHORT',
  LONG: 'LONG',
};

export const MODE_LABELS = {
  [MODE.FOCUS]: 'ФОКУС',
  [MODE.SHORT]: 'КОРОТКА ПАУЗА',
  [MODE.LONG]: 'ДОВГА ПАУЗА',
};

export default function Timer({
  mode,
  remainingMs,
  totalMs,
  isRunning,
  sessionsCount,
  onModeChange,
  onTogglePlay,
  onReset,
  isCompleteFlash,
}) {
  const minutes = Math.floor(remainingMs / 60000);
  const seconds = Math.floor((remainingMs % 60000) / 1000);
  const pad = (n) => String(n).padStart(2, '0');

  const progress = totalMs > 0 ? 1 - remainingMs / totalMs : 0;
  const scaleX = 1 - progress;

  // SVG ring circumference = 75.4
  const circumference = 75.4;
  const strokeDashoffset = circumference - progress * circumference;

  const isBreak = mode === MODE.SHORT || mode === MODE.LONG;

  return (
    <section className="timer-section fade-in" aria-label="Pomodoro таймер">
      {/* Mode tabs */}
      <nav className="mode-tabs" role="tablist" aria-label="Режими таймера">
        <button
          className={`mode-tab ${mode === MODE.FOCUS ? 'active' : ''}`}
          role="tab"
          aria-selected={mode === MODE.FOCUS}
          onClick={() => onModeChange(MODE.FOCUS)}
        >
          ФОКУС
        </button>
        <button
          className={`mode-tab ${mode === MODE.SHORT ? 'active' : ''}`}
          role="tab"
          aria-selected={mode === MODE.SHORT}
          onClick={() => onModeChange(MODE.SHORT)}
        >
          КОРОТКА
        </button>
        <button
          className={`mode-tab ${mode === MODE.LONG ? 'active' : ''}`}
          role="tab"
          aria-selected={mode === MODE.LONG}
          onClick={() => onModeChange(MODE.LONG)}
        >
          ДОВГА
        </button>
      </nav>

      {/* Timer display */}
      <div className="timer-display-wrapper">
        <div className="timer-label" aria-live="polite">
          {MODE_LABELS[mode]}
        </div>

        <div className="timer-ring-wrapper">
          <div
            className={`timer-display ${isRunning ? 'running' : ''} ${isBreak ? 'break-mode' : ''} ${isCompleteFlash ? 'complete' : ''}`}
            role="timer"
            aria-live="off"
            aria-label="Залишилось часу"
          >
            {pad(minutes)}:{pad(seconds)}
          </div>

          {/* Small SVG progress ring */}
          <svg className="progress-ring" aria-hidden="true" viewBox="0 0 28 28">
            <circle
              cx="14"
              cy="14"
              r="12"
              style={{ strokeDashoffset }}
            />
          </svg>
        </div>

        {/* Progress bar (amber line) */}
        <div
          style={{
            width: '100%',
            height: '4px',
            background: 'var(--amber)',
            marginTop: 'var(--sp-3)',
            transformOrigin: 'left',
            transform: `scaleX(${scaleX})`,
            transition: isRunning ? 'transform 0.25s linear' : 'transform 0.25s ease-out',
          }}
          aria-hidden="true"
        />
      </div>



      {/* Controls */}
      <div className="timer-controls">
        <button
          onClick={onTogglePlay}
          className="btn-primary"
          aria-label={isRunning ? 'Пауза таймера' : 'Запустити таймер'}
        >
          {isRunning ? (
            <>
              <svg className="icon-pause" width="14" height="14" viewBox="0 0 14 14" fill="currentColor" aria-hidden="true">
                <rect x="2" y="1.5" width="4" height="11" rx="1" />
                <rect x="8" y="1.5" width="4" height="11" rx="1" />
              </svg>
              <span>ПАУЗА</span>
            </>
          ) : (
            <>
              <svg className="icon-play" width="14" height="14" viewBox="0 0 14 14" fill="currentColor" aria-hidden="true">
                <path d="M3 1.5l9 5.5-9 5.5V1.5z" />
              </svg>
              <span>СТАРТ</span>
            </>
          )}
        </button>

        <button
          onClick={onReset}
          className="btn-ghost"
          aria-label="Скинути таймер"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <path
              d="M1 7a6 6 0 106-6H4M4 1L1 4l3 3"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
          &nbsp;СКИНУТИ
        </button>
      </div>

      {/* Keyboard hints */}
      <div className="shortcut-hint" aria-hidden="true">
        <kbd>ПРОБІЛ</kbd> старт/пауза &nbsp;&nbsp;
        <kbd>R</kbd> скинути &nbsp;&nbsp;
        <kbd>F</kbd> повний екран &nbsp;&nbsp;
        <kbd>←</kbd>
        <kbd>→</kbd> трек
      </div>
    </section>
  );
}
