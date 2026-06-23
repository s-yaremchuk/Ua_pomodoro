/**
 * timer.js — Pomodoro Timer Logic
 *
 * Modes:
 *   FOCUS      — 25 min (configurable)
 *   SHORT      — 5 min  (configurable)
 *   LONG       — 15 min (configurable)
 *
 * After every 4 FOCUS sessions → auto-suggest LONG break.
 * Fires events via callbacks: onTick, onComplete, onModeChange.
 */

export const MODE = Object.freeze({
  FOCUS: 'FOCUS',
  SHORT: 'SHORT',
  LONG:  'LONG',
});

export const MODE_LABELS = {
  [MODE.FOCUS]: 'ФОКУС',
  [MODE.SHORT]: 'КОРОТКА ПАУЗА',
  [MODE.LONG]:  'ДОВГА ПАУЗА',
};

export class PomodoroTimer {
  #intervalId    = null;
  #remainingMs   = 0;
  #startedAt     = null;   // performance.now() snapshot
  #mode          = MODE.FOCUS;
  #sessionsCount = 0;       // completed FOCUS sessions

  autoCycle = false; // автоматичний цикл запуску наступної сесії

  /** Durations in minutes (mutable by user) */
  durations = {
    [MODE.FOCUS]: 25,
    [MODE.SHORT]: 5,
    [MODE.LONG]:  15,
  };

  /** Callbacks — assign externally */
  onTick        = (_remainingMs, _totalMs) => {};
  onComplete    = (_mode) => {};
  onModeChange  = (_mode) => {};

  get mode()          { return this.#mode; }
  get isRunning()     { return this.#intervalId !== null; }
  get sessions()      { return this.#sessionsCount; }
  get remainingMs()   { return this.#remainingMs; }

  get totalMs() {
    return this.durations[this.#mode] * 60 * 1000;
  }

  /** Returns { minutes, seconds } */
  get time() {
    const total = Math.max(0, this.#remainingMs);
    return {
      minutes: Math.floor(total / 60000),
      seconds: Math.floor((total % 60000) / 1000),
    };
  }

  /** 0–1 progress (0 = just started, 1 = done) */
  get progress() {
    if (this.totalMs === 0) return 0;
    return 1 - (this.#remainingMs / this.totalMs);
  }

  constructor() {
    this.#reset(MODE.FOCUS, false);
  }

  /** Switch mode and reset timer (does not start) */
  setMode(mode) {
    if (!Object.values(MODE).includes(mode)) return;
    this.#stop();
    this.#mode = mode;
    this.#reset(mode, false);
    this.onModeChange(mode);
    this.onTick(this.#remainingMs, this.totalMs);
  }

  /** Update duration and reset if this is the current mode */
  setDuration(mode, minutes) {
    minutes = Math.max(1, Math.min(99, Number(minutes)));
    this.durations[mode] = minutes;
    if (mode === this.#mode) {
      this.#stop();
      this.#reset(mode, false);
      this.onTick(this.#remainingMs, this.totalMs);
    }
  }

  start() {
    if (this.isRunning) return;
    if (this.#remainingMs <= 0) this.#reset(this.#mode, false);

    this.#startedAt = performance.now();
    this.#intervalId = setInterval(() => this.#tick(), 250);
    this.onTick(this.#remainingMs, this.totalMs);
  }

  pause() {
    if (!this.isRunning) return;
    this.#stop();
    this.onTick(this.#remainingMs, this.totalMs);
  }

  togglePlay() {
    this.isRunning ? this.pause() : this.start();
  }

  reset() {
    this.#stop();
    this.#reset(this.#mode, false);
    this.onTick(this.#remainingMs, this.totalMs);
  }

  // ── Private ─────────────────────────────────────────────

  #reset(mode, _running) {
    this.#remainingMs = this.durations[mode] * 60 * 1000;
    this.#startedAt   = null;
  }

  #stop() {
    if (this.#intervalId) {
      clearInterval(this.#intervalId);
      this.#intervalId = null;
    }
  }

  #tick() {
    const now     = performance.now();
    const elapsed = now - this.#startedAt;
    this.#startedAt = now;

    this.#remainingMs = Math.max(0, this.#remainingMs - elapsed);
    this.onTick(this.#remainingMs, this.totalMs);

    if (this.#remainingMs <= 0) {
      this.#stop();
      this.#handleComplete();
    }
  }

  #handleComplete() {
    const completedMode = this.#mode;

    if (completedMode === MODE.FOCUS) {
      this.#sessionsCount++;
    }

    this.onComplete(completedMode);

    // Auto-suggest next mode
    if (completedMode === MODE.FOCUS) {
      const nextMode = (this.#sessionsCount % 4 === 0) ? MODE.LONG : MODE.SHORT;
      this.#mode = nextMode;
      this.#reset(nextMode, false);
      this.onModeChange(nextMode);
    } else {
      // After any break → back to focus
      this.#mode = MODE.FOCUS;
      this.#reset(MODE.FOCUS, false);
      this.onModeChange(MODE.FOCUS);
    }

    this.onTick(this.#remainingMs, this.totalMs);

    if (this.autoCycle) {
      setTimeout(() => this.start(), 300);
    }
  }
}

/**
 * Звуковий сигнал завершення — Web Audio API oscillator (без аудіофайлів).
 * Підтримує різні приємні звуки на вибір.
 */
export function playCompletionSound(soundType = 'bell') {
  if (soundType === 'mute') return;

  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const t = ctx.currentTime;

    function tone(freq, startTime, duration, gain = 0.3, type = 'sine') {
      const osc      = ctx.createOscillator();
      const gainNode = ctx.createGain();
      osc.connect(gainNode);
      gainNode.connect(ctx.destination);
      osc.type = type;
      osc.frequency.setValueAtTime(freq, startTime);
      gainNode.gain.setValueAtTime(gain, startTime);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
      osc.start(startTime);
      osc.stop(startTime + duration);
    }

    if (soundType === 'bell') {
      // Кришталевий дзвіночок
      tone(880, t,        0.8, 0.25, 'sine');
      tone(1320, t + 0.05, 0.7, 0.15, 'sine');
      tone(1760, t + 0.1,  0.6, 0.1,  'sine');
    } else if (soundType === 'digital') {
      // Цифровий будильник (beep-beep)
      tone(987.77, t,        0.08, 0.2, 'square');
      tone(987.77, t + 0.12, 0.08, 0.2, 'square');
      tone(987.77, t + 0.24, 0.16, 0.2, 'square');
    } else if (soundType === 'chime') {
      // Теплий гітарний акорд
      tone(261.63, t,        1.5, 0.3, 'sine'); // C4
      tone(329.63, t + 0.06, 1.4, 0.2, 'sine'); // E4
      tone(392.00, t + 0.12, 1.3, 0.2, 'sine'); // G4
      tone(523.25, t + 0.18, 1.2, 0.15, 'sine'); // C5
    } else if (soundType === 'synth') {
      // Глибокий синтезаторний імпульс
      tone(220, t, 1.0, 0.25, 'sawtooth');
      tone(440, t + 0.08, 0.8, 0.15, 'sine');
    }
  } catch (e) {
    console.warn('[AudioContext Error]', e);
  }
}
