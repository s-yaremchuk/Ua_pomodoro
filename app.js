/**
 * app.js — Main Application Controller
 *
 * Wires together:
 *  - PomodoroTimer (timer.js)
 *  - Spotify SDK (spotify.js)
 *  - DOM UI updates
 *  - Fullscreen API
 *  - Keyboard shortcuts (Space, R, F, →, ←)
 *  - localStorage persistence (settings + auth state)
 */

import { PomodoroTimer, MODE, MODE_LABELS, playCompletionSound } from './timer.js';
import {
  initiateLogin, handleCallback, initPlayer,
  togglePlay, nextTrack, previousTrack, setVolume,
  parsePlaylistUri, playContext,
  spotify, isAuthenticated, logout,
} from './spotify.js';

// ─────────────────────────────────────────────────────────────────
// SETTINGS — localStorage persistence
// ─────────────────────────────────────────────────────────────────

const SETTINGS_KEY = 'pomodoro_settings';

function loadSettings() {
  try {
    return JSON.parse(localStorage.getItem(SETTINGS_KEY)) ?? {};
  } catch {
    return {};
  }
}

function saveSettings(timer) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify({
    focus: timer.durations[MODE.FOCUS],
    short: timer.durations[MODE.SHORT],
    long:  timer.durations[MODE.LONG],
  }));
}

// ─────────────────────────────────────────────────────────────────
// DOM REFS
// ─────────────────────────────────────────────────────────────────

const $ = id => document.getElementById(id);

const els = {
  timerDisplay:     $('timer-display'),
  timerLabel:       $('timer-label'),
  progressLine:     $('progress-line'),
  progressRing:     $('progress-ring-circle'),

  btnStartPause:    $('btn-start-pause'),
  btnStartLabel:    $('btn-start-label'),
  btnReset:         $('btn-reset'),
  btnFullscreen:    $('btn-fullscreen'),

  modeTabs:         document.querySelectorAll('.mode-tab'),

  sessionPips:      document.querySelectorAll('.pip'),
  sessionCount:     $('session-count'),

  // Spotify
  spotifySection:   $('spotify-section'),
  loginCard:        $('spotify-login-card'),
  playerUI:         $('spotify-player-ui'),
  btnConnect:       $('btn-spotify-connect'),
  btnLogout:        $('btn-spotify-logout'),
  btnPlayPause:     $('btn-sp-playpause'),
  btnNext:          $('btn-sp-next'),
  btnPrev:          $('btn-sp-prev'),
  trackName:        $('track-name'),
  trackArtist:      $('track-artist'),
  trackStatus:      $('track-status'),
  trackArt:         $('track-art'),



  // Settings inputs
  inputFocus:       $('input-focus'),
  inputShort:       $('input-short'),
  inputLong:        $('input-long'),

  toast:            $('toast'),
};

// ─────────────────────────────────────────────────────────────────
// TOAST
// ─────────────────────────────────────────────────────────────────

let toastTimeout = null;

function showToast(msg, duration = 2800) {
  if (!els.toast) return;
  els.toast.textContent = msg;
  els.toast.classList.add('show');
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => els.toast.classList.remove('show'), duration);
}

// ─────────────────────────────────────────────────────────────────
// TIMER UI
// ─────────────────────────────────────────────────────────────────

function pad(n) { return String(n).padStart(2, '0'); }

function updateTimerDisplay(remainingMs, totalMs) {
  const timer = appState.timer;
  const { minutes, seconds } = timer.time;

  if (els.timerDisplay) {
    els.timerDisplay.textContent = `${pad(minutes)}:${pad(seconds)}`;
    els.timerDisplay.classList.toggle('running', timer.isRunning);
    els.timerDisplay.classList.remove('complete');
    els.timerDisplay.classList.toggle('break-mode',
      timer.mode === MODE.SHORT || timer.mode === MODE.LONG);
  }

  // Progress bar (amber line below timer)
  const progress = totalMs > 0 ? 1 - (remainingMs / totalMs) : 0;
  if (els.progressLine) {
    els.progressLine.style.transform = `scaleX(${1 - progress})`;
  }

  // SVG ring (small one top-right)
  if (els.progressRing) {
    const circumference = 75.4;
    els.progressRing.style.strokeDashoffset = circumference - (progress * circumference);
  }

  // Page title
  document.title = `${pad(minutes)}:${pad(seconds)} — ${MODE_LABELS[timer.mode]} · Pomodoro`;
}

function updateModeUI(mode) {
  // Tabs
  els.modeTabs.forEach(tab => {
    tab.classList.toggle('active', tab.dataset.mode === mode);
  });

  // Label
  if (els.timerLabel) els.timerLabel.textContent = MODE_LABELS[mode];

  // Start button label
  if (els.btnStartLabel) els.btnStartLabel.textContent = 'СТАРТ';
}

function updateSessionPips(count) {
  const pips = els.sessionPips;
  if (!pips.length) return;

  pips.forEach((pip, i) => {
    pip.classList.toggle('done', i < (count % 4));
  });

  if (els.sessionCount) {
    els.sessionCount.textContent = count;
  }
}

function updateStartButton(isRunning) {
  if (!els.btnStartPause || !els.btnStartLabel) return;

  if (isRunning) {
    els.btnStartLabel.textContent = 'ПАУЗА';
    els.btnStartPause.setAttribute('aria-label', 'Пауза таймера');
    els.btnStartPause.querySelector('.icon-play').style.display  = 'none';
    els.btnStartPause.querySelector('.icon-pause').style.display = 'block';
  } else {
    els.btnStartLabel.textContent = 'СТАРТ';
    els.btnStartPause.setAttribute('aria-label', 'Запустити таймер');
    els.btnStartPause.querySelector('.icon-play').style.display  = 'block';
    els.btnStartPause.querySelector('.icon-pause').style.display = 'none';
  }
}

// ─────────────────────────────────────────────────────────────────
// FULLSCREEN
// ─────────────────────────────────────────────────────────────────

function toggleFullscreen() {
  if (!document.fullscreenElement && !document.webkitFullscreenElement) {
    const el = document.documentElement;
    (el.requestFullscreen || el.webkitRequestFullscreen).call(el);
  } else {
    (document.exitFullscreen || document.webkitExitFullscreen).call(document);
  }
}

function updateFullscreenButton() {
  const isFull = !!(document.fullscreenElement || document.webkitFullscreenElement);
  if (!els.btnFullscreen) return;

  els.btnFullscreen.title       = isFull ? 'Вийти з повного екрану (F)' : 'Повний екран (F)';
  els.btnFullscreen.setAttribute('aria-label', isFull ? 'Вийти з повного екрану' : 'Повний екран');
  els.btnFullscreen.querySelector('.icon-fullscreen-enter').style.display = isFull ? 'none' : 'block';
  els.btnFullscreen.querySelector('.icon-fullscreen-exit').style.display  = isFull ? 'block' : 'none';
}

// ─────────────────────────────────────────────────────────────────
// SPOTIFY UI
// ─────────────────────────────────────────────────────────────────

let isSpotifyPlaying = false;

function showSpotifyLoginCard() {
  if (els.loginCard)  els.loginCard.style.display  = 'flex';
  if (els.playerUI)   els.playerUI.style.display    = 'none';
}

function showSpotifyPlayer() {
  if (els.loginCard)  els.loginCard.style.display  = 'none';
  if (els.playerUI)   els.playerUI.style.display    = 'flex';
  if (els.playerUI)   els.playerUI.classList.add('visible');
}

function updateSpotifyState(state) {
  if (!state) return;

  const track = state.track_window?.current_track;
  isSpotifyPlaying = !state.paused;

  // Play/pause icon
  if (els.btnPlayPause) {
    els.btnPlayPause.querySelector('.icon-play').style.display  = state.paused ? 'block' : 'none';
    els.btnPlayPause.querySelector('.icon-pause').style.display = state.paused ? 'none'  : 'block';
    els.btnPlayPause.setAttribute('aria-label', state.paused ? 'Відтворити' : 'Пауза');
  }

  if (!track) return;

  if (els.trackName)   els.trackName.textContent   = track.name;
  if (els.trackArtist) els.trackArtist.textContent = track.artists.map(a => a.name).join(', ');
  if (els.trackStatus) els.trackStatus.textContent = state.paused ? '⏸ ПАУЗА' : '▶ ГРАЄ';

  const imgUrl = track.album?.images?.[0]?.url;
  if (els.trackArt && imgUrl) {
    els.trackArt.src = imgUrl;
    els.trackArt.alt = `${track.name} — обкладинка`;
    els.trackArt.style.display = 'block';
    els.trackArt.nextElementSibling?.style && (els.trackArt.nextElementSibling.style.display = 'none');
  }
}

// ─────────────────────────────────────────────────────────────────
// APPLICATION STATE
// ─────────────────────────────────────────────────────────────────

const appState = {
  timer: new PomodoroTimer(),
};

// ─────────────────────────────────────────────────────────────────
// INIT
// ─────────────────────────────────────────────────────────────────

async function init() {
  const timer    = appState.timer;
  const settings = loadSettings();

  // Apply saved duration settings
  if (settings.focus) timer.setDuration(MODE.FOCUS, settings.focus);
  if (settings.short) timer.setDuration(MODE.SHORT, settings.short);
  if (settings.long)  timer.setDuration(MODE.LONG,  settings.long);

  // Sync settings inputs
  if (els.inputFocus) els.inputFocus.value = timer.durations[MODE.FOCUS];
  if (els.inputShort) els.inputShort.value = timer.durations[MODE.SHORT];
  if (els.inputLong)  els.inputLong.value  = timer.durations[MODE.LONG];

  // ── Timer callbacks ─────────────────────────────────────────

  timer.onTick = (remainingMs, totalMs) => {
    updateTimerDisplay(remainingMs, totalMs);
    updateStartButton(timer.isRunning);
  };

  timer.onModeChange = (mode) => {
    updateModeUI(mode);
    updateTimerDisplay(timer.remainingMs, timer.totalMs);
    updateSessionPips(timer.sessions);
  };

  timer.onComplete = (mode) => {
    playCompletionSound();
    updateStartButton(false);
    // Flash effect
    if (els.timerDisplay) {
      els.timerDisplay.classList.add('complete');
      setTimeout(() => els.timerDisplay?.classList.remove('complete'), 600);
    }
    const msg = mode === MODE.FOCUS
      ? `🍅 Сесія завершена! (${timer.sessions} сьогодні)`
      : '☕ Перерва закінчилась — повертайся до роботи!';
    showToast(msg, 4000);
  };

  // ── UI Event Listeners ──────────────────────────────────────

  // Start / Pause
  els.btnStartPause?.addEventListener('click', () => {
    timer.togglePlay();
    updateStartButton(timer.isRunning);
  });

  // Reset
  els.btnReset?.addEventListener('click', () => {
    timer.reset();
    updateStartButton(false);
    showToast('Таймер скинуто');
  });

  // Fullscreen
  els.btnFullscreen?.addEventListener('click', toggleFullscreen);
  document.addEventListener('fullscreenchange', updateFullscreenButton);
  document.addEventListener('webkitfullscreenchange', updateFullscreenButton);

  // Mode tabs
  els.modeTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      timer.setMode(tab.dataset.mode);
    });
  });

  // Settings inputs
  els.inputFocus?.addEventListener('change', () => {
    timer.setDuration(MODE.FOCUS, els.inputFocus.value);
    saveSettings(timer);
  });
  els.inputShort?.addEventListener('change', () => {
    timer.setDuration(MODE.SHORT, els.inputShort.value);
    saveSettings(timer);
  });
  els.inputLong?.addEventListener('change', () => {
    timer.setDuration(MODE.LONG, els.inputLong.value);
    saveSettings(timer);
  });

  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    // Ignore when typing in inputs
    if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;

    switch (e.code) {
      case 'Space':
        e.preventDefault();
        timer.togglePlay();
        updateStartButton(timer.isRunning);
        break;
      case 'KeyR':
        timer.reset();
        updateStartButton(false);
        showToast('Таймер скинуто (R)');
        break;
      case 'KeyF':
        toggleFullscreen();
        break;
      case 'ArrowRight':
        nextTrack();
        break;
      case 'ArrowLeft':
        previousTrack();
        break;
    }
  });

  // ── Spotify ─────────────────────────────────────────────────

  // Connect button
  els.btnConnect?.addEventListener('click', async () => {
    await initiateLogin();
  });

  // Logout
  els.btnLogout?.addEventListener('click', () => {
    logout();
    showSpotifyLoginCard();
    showToast('Від\'єднано від Spotify');
  });

  // Transport controls
  els.btnPlayPause?.addEventListener('click', () => togglePlay());
  els.btnNext?.addEventListener('click',      () => nextTrack());
  els.btnPrev?.addEventListener('click',      () => previousTrack());



  // Spotify SDK callbacks
  spotify.onReady = async (dId) => {
    console.info('[Spotify] Player ready, device:', dId);
    showSpotifyPlayer();
    showToast('✅ Spotify підключено');

    // Автоматично запускаємо статичний плейлист (lofi girl)
    await playContext('spotify:playlist:0vvXsWCC9xrXsKd4BgS8ML');
  };

  spotify.onStateChange = (state) => {
    updateSpotifyState(state);
  };

  spotify.onError = (msg) => {
    console.error('[Spotify]', msg);
    showToast(`Spotify: ${msg}`, 4000);
  };

  // ── Handle OAuth callback ───────────────────────────────────

  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.has('code') || urlParams.has('error')) {
    const success = await handleCallback();
    if (success) {
      showToast('⏳ Підключення до Spotify...');
      await initPlayer();
    } else {
      showToast('❌ Помилка авторизації Spotify');
    }
  } else if (isAuthenticated()) {
    // Returning user with stored tokens
    await initPlayer();
  } else {
    showSpotifyLoginCard();
  }

  // ── Initial UI render ───────────────────────────────────────

  updateModeUI(timer.mode);
  updateTimerDisplay(timer.remainingMs, timer.totalMs);
  updateStartButton(false);
  updateSessionPips(0);
  updateFullscreenButton();
}

// Boot
document.addEventListener('DOMContentLoaded', init);
