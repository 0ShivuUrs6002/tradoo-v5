# TRADOO v5

Production-grade trading analytics platform with Fyers API v3 integration.

## Structure

- `backend/` Node.js + Express API with auth, data pipeline, snapshot and analytics engines
- `frontend/` React UI with stable non-flickering refresh behavior

## Quick start

1. Configure env files from examples
2. Start backend
3. Start frontend

See folder-level READMEs for details.

## Permanent frontend link + localhost backend

Deploy `frontend/` once to Vercel or Netlify and keep the same URL forever for Fyers redirect.

- Frontend URL example: `https://your-tradoo-domain.vercel.app`
- Backend stays local: `http://localhost:4000`
- Set `FYERS_REDIRECT_URI` to your permanent frontend URL
- Set backend `CORS_ORIGINS` to include your frontend URL and localhost

This setup works for your own machine/browser where localhost backend is running.
