const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000/api';

const parseJson = async (response) => {
  const payload = await response.json();
  return payload;
};

export const fetchDashboard = async () => {
  const response = await fetch(`${API_BASE}/dashboard`, { method: 'GET' });
  const payload = await parseJson(response);
  if (!response.ok || !payload?.ok) {
    const error = new Error(payload?.message || payload?.error || 'Dashboard fetch failed');
    error.payload = payload;
    throw error;
  }
  return payload.data;
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
    throw new Error(payload?.message || payload?.error || 'Failed to generate Fyers login URL');
  }
  return payload.data;
};

export const validateAuthCode = async (authCode) => {
  const response = await fetch(`${API_BASE}/auth/validate-authcode`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ authCode })
  });

  const payload = await parseJson(response);
  if (!response.ok || !payload?.ok) {
    throw new Error(payload?.message || payload?.error || 'Auth code validation failed');
  }
  return payload.data;
};
