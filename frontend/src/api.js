// We use relative paths because vite.config.js now proxies all /api requests directly to localhost:4000
const API_BASE = import.meta.env.VITE_API_BASE || '/api';

const FYERS_APP_ID = import.meta.env.VITE_FYERS_APP_ID || 'UO02TNC3AU-100';
const FYERS_LOGIN_BASE = import.meta.env.VITE_FYERS_LOGIN_BASE_URL || 'https://api-t1.fyers.in/api/v3';

// Dynamically determine redirect URI to perfectly support Ngrok tunneling!
const getRedirectUri = () => {
  if (import.meta.env.VITE_FYERS_REDIRECT_URI) return import.meta.env.VITE_FYERS_REDIRECT_URI;
  if (typeof window !== 'undefined') {
    // Automatically adapts to whatever ngrok URL the user is currently on!
    return window.location.origin;
  }
  return 'http://localhost:5173';
};

const FYERS_REDIRECT_URI = getRedirectUri();

export const needsLocalBridge = () => false;

export const buildDirectLoginUrl = (state = `TRADO_${Date.now()}`) => {
  const url = `${FYERS_LOGIN_BASE}/generate-authcode?${new URLSearchParams({
    client_id: FYERS_APP_ID,
    redirect_uri: FYERS_REDIRECT_URI,
    response_type: 'code',
    state
  }).toString()}`;

  return { authCodeUrl: url, state };
};

export const redirectToLocalTerminal = () => {
  if (typeof window === 'undefined') return;
  const query = window.location.search || '';
  const hash = window.location.hash || '';
  window.location.href = `http://localhost:5173/${query}${hash}`;
};

const parseJson = async (response) => {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch (e) {
    if (text.startsWith('<')) {
      throw new Error(`API Configuration Missing: Vercel is returning an HTML page instead of API data. You must deploy the backend and configure VITE_API_BASE in the Vercel dashboard to point to it.`);
    }
    throw new Error(`Invalid JSON Response: ${text.slice(0, 50)}`);
  }
};

export const fetchDashboard = async () => {
  const response = await fetch(`${API_BASE}/dashboard`, { method: 'GET' });
  const payload = await parseJson(response);
  if (!response.ok || !payload?.ok) {
    const error = new Error(payload?.message || payload?.error || 'Pipeline fetch failed');
    error.payload = payload;
    throw error;
  }
  return {
    ...payload.data,
    __warming: Boolean(payload?.warming)
  };
};

export const getAuthStatus = async () => {
  const response = await fetch(`${API_BASE}/auth/status`, { method: 'GET' });
  const payload = await parseJson(response);
  if (!response.ok || !payload?.ok) {
    throw new Error(payload?.message || payload?.error || 'Auth status failed');
  }
  return payload.data;
};

export const getLoginUrl = async () => {
  const state = `TRADO_${Date.now()}`;
  const response = await fetch(`${API_BASE}/auth/login-url?state=${encodeURIComponent(state)}`, { method: 'GET' });
  const payload = await parseJson(response);
  if (!response.ok || !payload?.ok) {
    throw new Error(payload?.message || payload?.error || 'Failed to initialize Fyers OAuth gateway');
  }
  return payload.data;
};

export const validateAuthCode = async (authCode) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(`${API_BASE}/auth/validate-authcode`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ authCode }),
      signal: controller.signal
    });

    const payload = await parseJson(response);
    if (!response.ok || !payload?.ok) {
      const base = payload?.message || payload?.error || 'Auth validation rejected';
      throw new Error(base);
    }
    return payload.data;
  } finally {
    clearTimeout(timer);
  }
};

export const setManualToken = async ({ accessToken, refreshToken, expiresInSeconds }) => {
  const response = await fetch(`${API_BASE}/auth/set-token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ accessToken, refreshToken, expiresInSeconds })
  });

  const payload = await parseJson(response);
  if (!response.ok || !payload?.ok) {
    throw new Error(payload?.message || payload?.error || 'Token injection failed');
  }
  return payload.data;
};

export const logoutAuth = async () => {
  const response = await fetch(`${API_BASE}/auth/logout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });
  const payload = await parseJson(response);
  if (!response.ok || !payload?.ok) {
    throw new Error(payload?.message || payload?.error || 'Session termination failed');
  }
  return payload.data;
};

// ─── World Data Fetching ─────────────────────────────────────────────────────

export const fetchWorldData = async (worldType, symbol, days = 1) => {
  const endpoint = worldType === 'crypto' ? 'crypto' : 'commodities';
  const response = await fetch(`${API_BASE}/${endpoint}/${symbol}?days=${days}`);
  const payload = await parseJson(response);
  if (!response.ok || !payload?.ok) {
    throw new Error(payload?.error || `Failed to fetch ${worldType} data`);
  }
  return payload.data;
};
