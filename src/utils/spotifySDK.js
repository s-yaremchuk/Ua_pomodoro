/**
 * spotifySDK.js — Spotify Web Playback SDK + PKCE OAuth2
 */

const CLIENT_ID = 'ccd9f766270e40abb1298f961888decf';
const REDIRECT_URI = window.location.origin + window.location.pathname;
const SCOPES = [
  'streaming',
  'user-read-email',
  'user-read-private',
  'user-read-playback-state',
  'user-modify-playback-state',
  'playlist-read-private',
  'playlist-read-collaborative',
].join(' ');

// Token Keys
const TOKEN_KEY    = 'sp_access_token';
const REFRESH_KEY  = 'sp_refresh_token';
const EXPIRY_KEY   = 'sp_token_expiry';
const VERIFIER_KEY = 'sp_code_verifier';

// Module-level references
let spotifyPlayer = null;
let deviceId      = null;

export const spotifyCallbacks = {
  onReady:        (_deviceId) => {},
  onStateChange:  (_state) => {},
  onError:        (_msg) => {},
};

// PKCE Utilities
function generateCodeVerifier(length = 128) {
  const chars  = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  const random = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(random).map(b => chars[b % chars.length]).join('');
}

async function generateCodeChallenge(verifier) {
  const encoded = new TextEncoder().encode(verifier);
  const digest  = await crypto.subtle.digest('SHA-256', encoded);
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

// Token Management
function saveTokens({ access_token, refresh_token, expires_in }) {
  localStorage.setItem(TOKEN_KEY,   access_token);
  localStorage.setItem(EXPIRY_KEY,  String(Date.now() + (expires_in - 60) * 1000));
  if (refresh_token) {
    localStorage.setItem(REFRESH_KEY, refresh_token);
  }
}

export function getAccessToken()  { return localStorage.getItem(TOKEN_KEY); }
export function getRefreshToken() { return localStorage.getItem(REFRESH_KEY); }
export function isTokenExpired()  {
  const expiry = localStorage.getItem(EXPIRY_KEY);
  return !expiry || Date.now() > Number(expiry);
}

export function clearTokens() {
  [TOKEN_KEY, REFRESH_KEY, EXPIRY_KEY, VERIFIER_KEY].forEach(k => localStorage.removeItem(k));
}

async function refreshAccessToken() {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;

  try {
    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type:    'refresh_token',
        refresh_token: refreshToken,
        client_id:     CLIENT_ID,
      }),
    });

    if (!response.ok) return false;
    const data = await response.json();
    saveTokens(data);
    return true;
  } catch (e) {
    console.error('[Spotify Token Refresh Error]', e);
    return false;
  }
}

export async function ensureValidToken() {
  if (getAccessToken() && !isTokenExpired()) return true;
  return await refreshAccessToken();
}

// Auth Flow
export async function initiateLogin() {
  const verifier   = generateCodeVerifier();
  const challenge  = await generateCodeChallenge(verifier);
  localStorage.setItem(VERIFIER_KEY, verifier);

  const params = new URLSearchParams({
    client_id:             CLIENT_ID,
    response_type:         'code',
    redirect_uri:          REDIRECT_URI,
    scope:                 SCOPES,
    code_challenge_method: 'S256',
    code_challenge:        challenge,
  });

  window.location.href = `https://accounts.spotify.com/authorize?${params}`;
}

export async function handleCallback() {
  const urlParams = new URLSearchParams(window.location.search);
  const code      = urlParams.get('code');
  const error     = urlParams.get('error');

  if (error || !code) return false;

  const verifier = localStorage.getItem(VERIFIER_KEY);
  if (!verifier) return false;

  try {
    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id:     CLIENT_ID,
        grant_type:    'authorization_code',
        code,
        redirect_uri:  REDIRECT_URI,
        code_verifier: verifier,
      }),
    });

    if (!response.ok) return false;

    const data = await response.json();
    saveTokens(data);
    localStorage.removeItem(VERIFIER_KEY);

    // Clean URL
    window.history.replaceState({}, document.title, window.location.pathname);
    return true;
  } catch (e) {
    console.error('[Spotify Callback Error]', e);
    return false;
  }
}

export function logout() {
  clearTokens();
  if (spotifyPlayer) {
    spotifyPlayer.disconnect();
    spotifyPlayer = null;
  }
  deviceId = null;
}

export function isAuthenticated() {
  return !!(getAccessToken() || getRefreshToken());
}

function loadSDKScript() {
  return new Promise((resolve) => {
    if (window.Spotify) { resolve(); return; }
    const script = document.createElement('script');
    script.src = 'https://sdk.scdn.co/spotify-player.js';
    script.async = true;
    document.head.appendChild(script);
    window.onSpotifyWebPlaybackSDKReady = resolve;
  });
}

export async function initPlayer(initialVolume = 0.7) {
  const valid = await ensureValidToken();
  if (!valid) {
    spotifyCallbacks.onError('Token invalid — please re-authenticate');
    return;
  }

  await loadSDKScript();

  if (spotifyPlayer) {
    spotifyPlayer.disconnect();
  }

  spotifyPlayer = new window.Spotify.Player({
    name: 'Ua Pomodoro',
    getOAuthToken: async (cb) => {
      await ensureValidToken();
      cb(getAccessToken());
    },
    volume: initialVolume,
  });

  // Listeners
  spotifyPlayer.addListener('ready', ({ device_id }) => {
    deviceId = device_id;
    spotifyCallbacks.onReady(device_id);
  });

  spotifyPlayer.addListener('not_ready', ({ device_id }) => {
    spotifyCallbacks.onError(`Player device went offline: ${device_id}`);
  });

  spotifyPlayer.addListener('player_state_changed', (state) => {
    spotifyCallbacks.onStateChange(state);
  });

  spotifyPlayer.addListener('initialization_error', ({ message }) => {
    spotifyCallbacks.onError(`Init error: ${message}`);
  });

  spotifyPlayer.addListener('authentication_error', ({ message }) => {
    spotifyCallbacks.onError(`Auth error: ${message}`);
    clearTokens();
  });

  spotifyPlayer.addListener('account_error', ({ message }) => {
    spotifyCallbacks.onError(`Account error (Premium required): ${message}`);
  });

  spotifyPlayer.connect();
}

// Transport Controls
export async function togglePlay() {
  if (!spotifyPlayer) return;
  await spotifyPlayer.togglePlay();
}

export async function nextTrack() {
  if (!spotifyPlayer) return;
  await spotifyPlayer.nextTrack();
}

export async function previousTrack() {
  if (!spotifyPlayer) return;
  await spotifyPlayer.previousTrack();
}

export async function setVolume(value) {
  if (!spotifyPlayer) return;
  try {
    await spotifyPlayer.setVolume(Math.max(0, Math.min(1, value)));
  } catch (e) {
    console.warn('[Spotify SDK] Failed to set volume:', e);
  }
}

export function parsePlaylistUri(input) {
  input = input.trim();
  if (input.startsWith('spotify:')) return input;

  const match = input.match(/playlist\/([A-Za-z0-9]+)/);
  if (match) return `spotify:playlist:${match[1]}`;

  return null;
}

export async function transferPlayback(dId) {
  const targetId = dId || deviceId;
  if (!targetId) return false;

  const valid = await ensureValidToken();
  if (!valid) return false;

  try {
    const response = await fetch('https://api.spotify.com/v1/me/player', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getAccessToken()}`,
      },
      body: JSON.stringify({
        device_ids: [targetId],
        play: false,
      }),
    });
    return response.ok || response.status === 204;
  } catch (e) {
    console.error('[Spotify SDK] Transfer playback error:', e);
    return false;
  }
}

export async function playContext(contextUri) {
  if (!deviceId) {
    spotifyCallbacks.onError('Player not ready yet');
    return;
  }

  const valid = await ensureValidToken();
  if (!valid) {
    spotifyCallbacks.onError('Token expired');
    return;
  }

  try {
    // Transfer playback to ensure device is active
    await transferPlayback(deviceId);

    const makeRequest = () => fetch(
      `https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`,
      {
        method: 'PUT',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${getAccessToken()}`,
        },
        body: JSON.stringify({ context_uri: contextUri }),
      }
    );

    let response = await makeRequest();

    // If it's 404 (Device not found), wait 1.5s and retry once
    if (response.status === 404) {
      console.warn('[Spotify SDK] Device not found, retrying in 1.5s...');
      await new Promise((resolve) => setTimeout(resolve, 1500));
      response = await makeRequest();
    }

    if (!response.ok && response.status !== 204) {
      const err = await response.json().catch(() => ({}));
      spotifyCallbacks.onError(err?.error?.message || `HTTP ${response.status}`);
    }
  } catch (e) {
    spotifyCallbacks.onError(`Failed to request playContext: ${e.message}`);
  }
}

export async function setShuffle(state) {
  if (!deviceId) {
    spotifyCallbacks.onError('Player not ready yet');
    return false;
  }

  const valid = await ensureValidToken();
  if (!valid) {
    spotifyCallbacks.onError('Token expired');
    return false;
  }

  try {
    // Transfer playback to ensure device is active
    await transferPlayback(deviceId);

    const response = await fetch(
      `https://api.spotify.com/v1/me/player/shuffle?state=${state}&device_id=${deviceId}`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${getAccessToken()}`,
        },
      }
    );

    if (!response.ok && response.status !== 204) {
      const err = await response.json().catch(() => ({}));
      spotifyCallbacks.onError(err?.error?.message || `HTTP ${response.status}`);
      return false;
    }
    return true;
  } catch (e) {
    spotifyCallbacks.onError(`Failed to set shuffle: ${e.message}`);
    return false;
  }
}

export function hasDeviceId() { return !!deviceId; }
