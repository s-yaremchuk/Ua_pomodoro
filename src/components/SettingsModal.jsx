import React from 'react';
import { MODE } from './Timer';

export default function SettingsModal({
  isOpen,
  onClose,
  durations,
  onDurationChange,
  soundFocus,
  onSoundFocusChange,
  soundBreak,
  onSoundBreakChange,
  autoCycle,
  onAutoCycleChange,
}) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">НАЛАШТУВАННЯ</h2>
          <button
            onClick={onClose}
            className="btn-icon-close"
            aria-label="Закрити налаштування"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
              <path d="M1 1l12 12M13 1L1 13" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
        </div>

        <div className="modal-body">
          {/* Durations */}
          <div className="settings-group" style={{ marginBottom: 'var(--sp-4)' }}>
            <span className="settings-sublabel">ТРИВАЛІСТЬ (ХВ)</span>
            <div className="settings-grid">
              <div className="setting-item">
                <label htmlFor="input-focus">ФОКУС</label>
                <input
                  id="input-focus"
                  className="input-number"
                  type="number"
                  min="1"
                  max="99"
                  value={durations[MODE.FOCUS]}
                  onChange={(e) => onDurationChange(MODE.FOCUS, Number(e.target.value))}
                  aria-label="Тривалість фокус-сесії в хвилинах"
                />
              </div>
              <div className="setting-item">
                <label htmlFor="input-short">КОРОТКА</label>
                <input
                  id="input-short"
                  className="input-number"
                  type="number"
                  min="1"
                  max="99"
                  value={durations[MODE.SHORT]}
                  onChange={(e) => onDurationChange(MODE.SHORT, Number(e.target.value))}
                  aria-label="Тривалість короткої перерви в хвилинах"
                />
              </div>
              <div className="setting-item">
                <label htmlFor="input-long">ДОВГА</label>
                <input
                  id="input-long"
                  className="input-number"
                  type="number"
                  min="1"
                  max="99"
                  value={durations[MODE.LONG]}
                  onChange={(e) => onDurationChange(MODE.LONG, Number(e.target.value))}
                  aria-label="Тривалість довгої перерви в хвилинах"
                />
              </div>
            </div>
          </div>

          {/* Sound Selection - Focus */}
          <div className="settings-group" style={{ marginBottom: 'var(--sp-3)' }}>
            <label htmlFor="select-sound-focus" className="settings-sublabel">ЗВУК ЗАКІНЧЕННЯ ФОКУСУ</label>
            <div className="select-wrapper">
              <select
                id="select-sound-focus"
                className="input-select"
                value={soundFocus}
                onChange={(e) => onSoundFocusChange(e.target.value)}
              >
                <option value="bell">🔔 Дзвіночок</option>
                <option value="digital">📟 Цифровий</option>
                <option value="chime">🎸 Акустичний</option>
                <option value="synth">🎛 Синтезатор</option>
                <option value="coffee">☕️ Коломойський (Кофє)</option>
                <option value="mute">🔇 Без звуку</option>
              </select>
            </div>
          </div>

          {/* Sound Selection - Break */}
          <div className="settings-group" style={{ marginBottom: 'var(--sp-4)' }}>
            <label htmlFor="select-sound-break" className="settings-sublabel">ЗВУК ЗАКІНЧЕННЯ ПЕРЕРВИ</label>
            <div className="select-wrapper">
              <select
                id="select-sound-break"
                className="input-select"
                value={soundBreak}
                onChange={(e) => onSoundBreakChange(e.target.value)}
              >
                <option value="bell">🔔 Дзвіночок</option>
                <option value="digital">📟 Цифровий</option>
                <option value="chime">🎸 Акустичний</option>
                <option value="synth">🎛 Синтезатор</option>
                <option value="coffee">☕️ Коломойський (Кофє)</option>
                <option value="mute">🔇 Без звуку</option>
              </select>
            </div>
          </div>

          {/* Auto cycle toggle */}
          <div className="settings-group checkbox-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                id="check-auto-cycle"
                className="input-checkbox"
                checked={autoCycle}
                onChange={(e) => onAutoCycleChange(e.target.checked)}
              />
              <span className="checkbox-text">Автоматичний цикл</span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
