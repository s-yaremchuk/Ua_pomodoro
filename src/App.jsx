import React, { useState, useEffect, useCallback, useRef } from 'react';
import Header from './components/Header';
import Timer, { MODE, MODE_LABELS } from './components/Timer';
import SpotifyPlayer from './components/SpotifyPlayer';
import SettingsModal from './components/SettingsModal';
import { playCompletionSound } from './utils/audio';
import {
  initPlayer,
  initiateLogin,
  handleCallback,
  logout,
  isAuthenticated,
  togglePlay,
  nextTrack,
  previousTrack,
  setVolume,
  playContext,
  setShuffle,
  spotifyCallbacks,
} from './utils/spotifySDK';

const SETTINGS_KEY = 'pomodoro_settings';

function loadSettings() {
  try {
    const data = localStorage.getItem(SETTINGS_KEY);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

export default function App() {
  // Load settings or set defaults
  const [durations, setDurations] = useState(() => {
    const saved = loadSettings() || {};
    return {
      [MODE.FOCUS]: saved.focus ?? 25,
      [MODE.SHORT]: saved.short ?? 5,
      [MODE.LONG]: saved.long ?? 15,
    };
  });
  const [soundFocus, setSoundFocus] = useState(() => {
    const saved = loadSettings() || {};
    return saved.soundFocus ?? saved.sound ?? 'bell';
  });
  const [soundBreak, setSoundBreak] = useState(() => {
    const saved = loadSettings() || {};
    return saved.soundBreak ?? saved.sound ?? 'chime';
  });
  const [autoCycle, setAutoCycle] = useState(() => {
    const saved = loadSettings() || {};
    return saved.autoCycle ?? false;
  });

  // App States
  const [mode, setMode] = useState(MODE.FOCUS);
  const [isRunning, setIsRunning] = useState(false);
  const [sessionsCount, setSessionsCount] = useState(0);
  const [remainingMs, setRemainingMs] = useState(() => durations[MODE.FOCUS] * 60 * 1000);
  const [isCompleteFlash, setIsCompleteFlash] = useState(false);

  // Settings Modal State
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Fullscreen State
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Spotify Player State
  const [isSpotifyConnected, setIsSpotifyConnected] = useState(isAuthenticated());
  const [isSpotifyPlaying, setIsSpotifyPlaying] = useState(false);
  const [isSpotifyShuffled, setIsSpotifyShuffled] = useState(false);
  const [spotifyTrack, setSpotifyTrack] = useState(null);
  const [volume, setVolumeState] = useState(() => Number(localStorage.getItem('sp_volume') ?? '70'));

  // Toast Notification State
  const [toastMessage, setToastMessage] = useState(null);
  const toastTimeoutRef = useRef(null);

  const showToast = useCallback((message, duration = 2800) => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    setToastMessage(message);
    toastTimeoutRef.current = setTimeout(() => {
      setToastMessage(null);
    }, duration);
  }, []);

  // Save settings helper
  const saveSettings = (newDurations, sf, sb, newAutoCycle) => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({
      focus: newDurations[MODE.FOCUS],
      short: newDurations[MODE.SHORT],
      long: newDurations[MODE.LONG],
      soundFocus: sf,
      soundBreak: sb,
      autoCycle: newAutoCycle,
    }));
  };

  // Fullscreen toggle helpers
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement && !document.webkitFullscreenElement) {
      const el = document.documentElement;
      const request = el.requestFullscreen || el.webkitRequestFullscreen;
      if (request) request.call(el);
    } else {
      const exit = document.exitFullscreen || document.webkitExitFullscreen;
      if (exit) exit.call(document);
    }
  }, []);

  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(!!(document.fullscreenElement || document.webkitFullscreenElement));
    };
    document.addEventListener('fullscreenchange', onFullscreenChange);
    document.addEventListener('webkitfullscreenchange', onFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', onFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', onFullscreenChange);
    };
  }, []);

  // Dynamic document title update
  useEffect(() => {
    const mins = Math.floor(remainingMs / 60000);
    const secs = Math.floor((remainingMs % 60000) / 1000);
    const pad = (n) => String(n).padStart(2, '0');
    document.title = `${pad(mins)}:${pad(secs)} — ${MODE_LABELS[mode]} · Pomodoro`;
  }, [remainingMs, mode]);

  // Handle mode transitions
  const handleModeChange = useCallback((newMode) => {
    setIsRunning(false);
    setMode(newMode);
    setRemainingMs(durations[newMode] * 60 * 1000);
  }, [durations]);

  // Reset timer
  const handleReset = useCallback(() => {
    setIsRunning(false);
    setRemainingMs(durations[mode] * 60 * 1000);
    showToast('Таймер скинуто');
  }, [durations, mode, showToast]);

  // Complete session handler
  const handleTimerComplete = useCallback(() => {
    // 1. Sound
    const activeSound = mode === MODE.FOCUS ? soundFocus : soundBreak;
    playCompletionSound(activeSound);

    // 2. Stop running
    setIsRunning(false);

    // 3. Complete Flash
    setIsCompleteFlash(true);
    setTimeout(() => setIsCompleteFlash(false), 600);

    // 4. Update sessions & transition mode
    let completedMode = mode;
    let nextCount = sessionsCount;
    if (completedMode === MODE.FOCUS) {
      nextCount = sessionsCount + 1;
      setSessionsCount(nextCount);
    }

    let nextMode;
    if (completedMode === MODE.FOCUS) {
      nextMode = (nextCount % 4 === 0) ? MODE.LONG : MODE.SHORT;
    } else {
      nextMode = MODE.FOCUS;
    }

    setMode(nextMode);
    setRemainingMs(durations[nextMode] * 60 * 1000);

    const msg = completedMode === MODE.FOCUS
      ? `🍅 Сесія завершена! (${nextCount} сьогодні)`
      : '☕ Перерва закінчилась — повертайся до роботи!';
    showToast(msg, 4000);

    if (autoCycle) {
      setTimeout(() => setIsRunning(true), 300);
    }
  }, [mode, sessionsCount, durations, soundFocus, soundBreak, autoCycle, showToast]);

  // Timer loop effect
  useEffect(() => {
    if (!isRunning) return;

    let startedAt = performance.now();
    const intervalId = setInterval(() => {
      const now = performance.now();
      const elapsed = now - startedAt;
      startedAt = now;

      setRemainingMs((prev) => {
        const next = prev - elapsed;
        if (next <= 0) {
          clearInterval(intervalId);
          handleTimerComplete();
          return 0;
        }
        return next;
      });
    }, 100);

    return () => clearInterval(intervalId);
  }, [isRunning, handleTimerComplete]);

  // Settings modification handlers
  const handleDurationChange = (targetMode, mins) => {
    const cleanMins = Math.max(1, Math.min(99, Number(mins) || 1));
    const nextDurations = { ...durations, [targetMode]: cleanMins };
    setDurations(nextDurations);
    saveSettings(nextDurations, soundFocus, soundBreak, autoCycle);

    if (targetMode === mode) {
      setIsRunning(false);
      setRemainingMs(cleanMins * 60 * 1000);
    }
  };

  const handleSoundFocusChange = (newSound) => {
    setSoundFocus(newSound);
    saveSettings(durations, newSound, soundBreak, autoCycle);
    playCompletionSound(newSound);
  };

  const handleSoundBreakChange = (newSound) => {
    setSoundBreak(newSound);
    saveSettings(durations, soundFocus, newSound, autoCycle);
    playCompletionSound(newSound);
  };

  const handleAutoCycleChange = (newAutoCycle) => {
    setAutoCycle(newAutoCycle);
    saveSettings(durations, soundFocus, soundBreak, newAutoCycle);
    showToast(newAutoCycle ? '🔁 Автоматичний цикл увімкнено' : '⏹ Автоматичний цикл вимкнено');
  };

  // Keyboard shortcuts listeners
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;

      switch (e.code) {
        case 'Space':
          e.preventDefault();
          setIsRunning(prev => !prev);
          break;
        case 'KeyR':
          handleReset();
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
        default:
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleReset, toggleFullscreen]);

  const volumeRef = useRef(volume);
  useEffect(() => {
    volumeRef.current = volume;
  }, [volume]);

  // Spotify SDK Integration
  useEffect(() => {
    // Register callbacks
    spotifyCallbacks.onReady = async (dId) => {
      setIsSpotifyConnected(true);
      showToast('✅ Spotify підключено');
      setTimeout(async () => {
        await playContext('spotify:playlist:1w74rN3jQ2J2a3uMBH6p37');
      }, 1000);
    };

    spotifyCallbacks.onStateChange = (state) => {
      if (!state) return;
      setIsSpotifyPlaying(!state.paused);
      setIsSpotifyShuffled(state.shuffle);
      const track = state.track_window?.current_track;
      if (track) {
        setSpotifyTrack({
          name: track.name,
          artist: track.artists.map(a => a.name).join(', '),
          image: track.album?.images?.[0]?.url || '',
        });
      }
    };

    spotifyCallbacks.onError = (msg) => {
      console.error('[Spotify]', msg);
      showToast(`Spotify: ${msg}`, 4000);
      if (msg.includes('Auth error') || msg.includes('token')) {
        setIsSpotifyConnected(false);
      }
    };

    // Check for callback params
    const urlParams = new URLSearchParams(window.location.search);
    const hasCode = urlParams.has('code') || urlParams.has('error');

    const handleAuth = async () => {
      if (hasCode) {
        const success = await handleCallback();
        if (success) {
          showToast('⏳ Підключення до Spotify...');
          await initPlayer(volumeRef.current / 100);
        } else {
          showToast('❌ Помилка авторизації Spotify');
          setIsSpotifyConnected(false);
        }
      } else if (isAuthenticated()) {
        await initPlayer(volumeRef.current / 100);
      }
    };

    handleAuth();
  }, [showToast]);

  const handleSpotifyConnect = async () => {
    await initiateLogin();
  };

  const handleToggleShuffle = async () => {
    const nextState = !isSpotifyShuffled;
    const success = await setShuffle(nextState);
    if (success) {
      setIsSpotifyShuffled(nextState);
      showToast(nextState ? '🔀 Режим перемішування увімкнено' : '➡️ Послідовне відтворення');
    }
  };

  const handleSpotifyDisconnect = () => {
    logout();
    setIsSpotifyConnected(false);
    setSpotifyTrack(null);
    setIsSpotifyPlaying(false);
    showToast("Від'єднано від Spotify");
  };

  const handleVolumeChange = (val) => {
    setVolumeState(val);
    localStorage.setItem('sp_volume', String(val));
    setVolume(val / 100);
  };

  const totalMs = durations[mode] * 60 * 1000;

  return (
    <>
      {/* Background overlays */}
      <div className="bg-overlay" aria-hidden="true" />
      <div className="vignette" aria-hidden="true" />

      <div className="app-wrapper">
        <Header
          onOpenSettings={() => setIsSettingsOpen(true)}
          isFullscreen={isFullscreen}
          onToggleFullscreen={toggleFullscreen}
        />

        <main className="main-content" role="main">
          {/* Left panel: Timer */}
          <Timer
            mode={mode}
            remainingMs={remainingMs}
            totalMs={totalMs}
            isRunning={isRunning}
            sessionsCount={sessionsCount}
            onModeChange={handleModeChange}
            onTogglePlay={() => setIsRunning(prev => !prev)}
            onReset={handleReset}
            isCompleteFlash={isCompleteFlash}
          />

          {/* Right panel: Spotify */}
          <aside className="right-panel fade-in" style={{ animationDelay: '0.1s' }} aria-label="Spotify та налаштування">
            <SpotifyPlayer
              isConnected={isSpotifyConnected}
              isPlaying={isSpotifyPlaying}
              isShuffled={isSpotifyShuffled}
              track={spotifyTrack}
              volume={volume}
              onConnect={handleSpotifyConnect}
              onDisconnect={handleSpotifyDisconnect}
              onTogglePlay={togglePlay}
              onNext={nextTrack}
              onPrev={previousTrack}
              onVolumeChange={handleVolumeChange}
              onToggleShuffle={handleToggleShuffle}
            />
          </aside>
        </main>

        <footer className="site-footer" role="contentinfo">
          <span className="footer-info">UA POMODORO · 2026</span>
          <div className="footer-shortcuts" aria-hidden="true">
            <span className="footer-shortcut"><kbd>ПРОБІЛ</kbd> старт/пауза</span>
            <span className="footer-shortcut"><kbd>R</kbd> скинути</span>
            <span className="footer-shortcut"><kbd>F</kbd> fullscreen</span>
          </div>
        </footer>
      </div>

      {/* Toast notifications */}
      <div className={`toast ${toastMessage ? 'show' : ''}`} role="alert" aria-live="assertive" aria-atomic="true">
        {toastMessage}
      </div>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        durations={durations}
        onDurationChange={handleDurationChange}
        soundFocus={soundFocus}
        onSoundFocusChange={handleSoundFocusChange}
        soundBreak={soundBreak}
        onSoundBreakChange={handleSoundBreakChange}
        autoCycle={autoCycle}
        onAutoCycleChange={handleAutoCycleChange}
      />
    </>
  );
}
