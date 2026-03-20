# TRADO Backend

## Features

- Fyers API v3 auth (`generate-authcode`, `validate-authcode`, `validate-refresh-token`)
- Secure token storage in `.secure/token.json`
- Auto-refresh before token expiry
- Request lock + timeout (3s) + retry (2 attempts)
- Snapshot buffer (last 20 immutable snapshots)
- EMA smoothing (`0.7 * current + 0.3 * previous`)
- Support/resistance, VWAP, momentum, volatility, GEX, bias, breakout, prediction
- Coherence override and stability confirmation (3 cycles + 5s UI freeze)

## Setup

1. Copy `.env.example` to `.env`
2. Fill Fyers credentials
3. Run:

```bash
npm install
npm run dev
```

## Auth header format

`Authorization: appId:accessToken`

## API

- `GET /api/health`
- `GET /api/auth/status`
- `GET /api/auth/login-url`
- `POST /api/auth/generate-authcode`
- `POST /api/auth/validate-authcode`
- `GET /api/dashboard`

## Live auth flow

1. Ensure `FYERS_REDIRECT_URI=http://localhost:5173` in backend `.env`
2. Start backend and frontend
3. Open app and click **Connect Fyers**
4. Complete Fyers login and allow redirect back to frontend
5. Frontend auto-calls `POST /api/auth/validate-authcode`
6. Token is saved in `.secure/token.json`, polling starts automatically
