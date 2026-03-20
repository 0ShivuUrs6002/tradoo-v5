# TRADOO Frontend

React dashboard with five tabs:

- Dashboard
- Signals
- Option Chain
- Analytics
- Prediction

Polls backend every ~6s and renders stable payloads only (no rapid flicker).

## Run

```bash
npm install
cp .env.example .env
npm run dev
```

Backend must run on `http://localhost:4000`.

## Permanent hosted link (recommended)

Deploy this `frontend/` directory once on Vercel or Netlify.

### Vercel

- Import repo/folder `frontend`
- Build command: `npm run build`
- Output directory: `dist`
- Keep `vercel.json` as provided for SPA fallback

### Netlify

- Import folder `frontend`
- Netlify uses `netlify.toml` in this folder

### Environment variable

For hosted frontend, set:

- `VITE_API_BASE=http://localhost:4000/api`

This means your hosted UI always talks to your own local backend on your machine.

## Fyers redirect URL (set once)

Set Fyers app redirect URI to your permanent hosted URL, e.g.:

- `https://your-tradoo-domain.vercel.app`

## Fyers auth

If backend reports auth required, click **Connect Fyers** in UI.
After Fyers login, callback query param is exchanged automatically and live data starts.
