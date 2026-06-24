/**
 * Звуковий сигнал завершення — Web Audio API oscillator (без аудіофайлів).
 * Підтримує різні приємні звуки на вибір.
 */
export function playCompletionSound(soundType = 'bell') {
  if (soundType === 'mute') return;

  if (soundType === 'coffee') {
    try {
      const audio = new Audio('/coffee.mp3');
      audio.play().catch(e => console.warn('[Audio Play Error]', e));
    } catch (e) {
      console.warn('[Audio Error]', e);
    }
    return;
  }

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
