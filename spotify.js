/**
 * spotify.js — Spotify Web Playback SDK + PKCE OAuth2
 *
 * Flow:
 *  1. User clicks "Connect Spotify" → PKCE authorize redirect
 *  2. Spotify redirects back to /callback?code=...
 *  3. We exchange code for tokens → init SDK player
 *  4. Transport controls: play/pause, next, prev
 *  5. State listener → update UI (track name, artist, art)
 *
 * Requirements:
 *  - Spotify Premium account
 *  - Redirect URI registered in Spotify Developer Dashboard
 *
 * CONFIG: Replace CLIENT_ID below with your actual Spotify Client ID.
 */

// ─────────────────────────────────────────────────────────────────
// CONFIGURATION — set your Client ID here
// Redirect URI must be registered in your Spotify App settings
// ─────────────────────────────────────────────────────────────────
const CLIENT_ID   = 'ccd9f766270e40abb1298f961888decf'; // ← замінити на ваш Client ID
const REDIRECT_URI = window.location.origin + '/callback';
const SCOPES = [
  'streaming',
  'user-read-email',
  'user-read-private',
  'user-read-playback-state',
  'user-modify-playback-state',
  'playlist-read-private',
  'playlist-read-collaborative',
].join(' ');

// ─────────────────────────────────────────────────────────────────
// PKCE Utilities
// ─────────────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────────
// Token Management (localStorage)
// ─────────────────────────────────────────────────────────────────

const TOKEN_KEY    = 'sp_access_token';
const REFRESH_KEY  = 'sp_refresh_token';
const EXPIRY_KEY   = 'sp_token_expiry';
const VERIFIER_KEY = 'sp_code_verifier';

function saveTokens({ access_token, refresh_token, expires_in }) {
  localStorage.setItem(TOKEN_KEY,   access_token);
  localStorage.setItem(EXPIRY_KEY,  Date.now() + (expires_in - 60) * 1000);
  if (refresh_token) {
    localStorage.setItem(REFRESH_KEY, refresh_token);
  }
}

function getAccessToken()  { return localStorage.getItem(TOKEN_KEY); }
function getRefreshToken() { return localStorage.getItem(REFRESH_KEY); }
function isTokenExpired()  {
  const expiry = localStorage.getItem(EXPIRY_KEY);
  return !expiry || Date.now() > Number(expiry);
}

function clearTokens() {
  [TOKEN_KEY, REFRESH_KEY, EXPIRY_KEY, VERIFIER_KEY].forEach(k => localStorage.removeItem(k));
}

async function refreshAccessToken() {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;

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
}

async function ensureValidToken() {
  if (getAccessToken() && !isTokenExpired()) return true;
  return await refreshAccessToken();
}

// ─────────────────────────────────────────────────────────────────
// Auth Flow
// ─────────────────────────────────────────────────────────────────

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

  // Clean URL (remove code from history)
  window.history.replaceState({}, document.title, window.location.pathname);
  return true;
}

export function logout() {
  clearTokens();
  if (spotifyPlayer) {
    spotifyPlayer.disconnect();
    spotifyPlayer = null;
  }
}

export function isAuthenticated() {
  return !!(getAccessToken() || getRefreshToken());
}

// ─────────────────────────────────────────────────────────────────
// Spotify Web Playback SDK
// ─────────────────────────────────────────────────────────────────

let spotifyPlayer = null;
let deviceId      = null;

/** Callbacks — set by app.js */
export const spotify = {
  onReady:        (_deviceId) => {},
  onStateChange:  (_state) => {},
  onError:        (_msg) => {},
};

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

export async function initPlayer() {
  const valid = await ensureValidToken();
  if (!valid) { spotify.onError('Token invalid — please re-authenticate'); return; }

  await loadSDKScript();

  spotifyPlayer = new window.Spotify.Player({
    name: 'Ua Pomodoro',
    getOAuthToken: async (cb) => {
      await ensureValidToken();
      cb(getAccessToken());
    },
    volume: 0.7,
  });

  // ── Listeners ──────────────────────────────────────────────

  spotifyPlayer.addListener('ready', ({ device_id }) => {
    deviceId = device_id;
    spotify.onReady(device_id);
  });

  spotifyPlayer.addListener('not_ready', ({ device_id }) => {
    spotify.onError(`Player device went offline: ${device_id}`);
  });

  spotifyPlayer.addListener('player_state_changed', (state) => {
    spotify.onStateChange(state);
  });

  spotifyPlayer.addListener('initialization_error', ({ message }) => {
    spotify.onError(`Init error: ${message}`);
  });

  spotifyPlayer.addListener('authentication_error', ({ message }) => {
    spotify.onError(`Auth error: ${message}`);
    clearTokens();
  });

  spotifyPlayer.addListener('account_error', ({ message }) => {
    spotify.onError(`Account error (Premium required): ${message}`);
  });

  spotifyPlayer.connect();
}

// ─────────────────────────────────────────────────────────────────
// Transport Controls
// ─────────────────────────────────────────────────────────────────

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
  await spotifyPlayer.setVolume(Math.max(0, Math.min(1, value)));
}

// ─────────────────────────────────────────────────────────────────
// Play Playlist / Context URI
// ─────────────────────────────────────────────────────────────────

/**
 * Parses Spotify playlist URL or URI → context_uri
 * e.g. https://open.spotify.com/playlist/37i9dQZF → spotify:playlist:37i9dQZF
 *      spotify:playlist:37i9dQZF → unchanged
 */
export function parsePlaylistUri(input) {
  input = input.trim();
  if (input.startsWith('spotify:')) return input;

  const match = input.match(/playlist\/([A-Za-z0-9]+)/);
  if (match) return `spotify:playlist:${match[1]}`;

  return null;
}

export async function playContext(contextUri) {
  if (!deviceId) { spotify.onError('Player not ready yet'); return; }

  const valid = await ensureValidToken();
  if (!valid) { spotify.onError('Token expired'); return; }

  const response = await fetch(
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

  if (!response.ok && response.status !== 204) {
    const err = await response.json().catch(() => ({}));
    spotify.onError(err?.error?.message || `HTTP ${response.status}`);
  }
}

export function hasDeviceId() { return !!deviceId; }
