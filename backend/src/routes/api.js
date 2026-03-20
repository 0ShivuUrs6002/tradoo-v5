import express from 'express';
import { config } from '../config.js';
import { authService } from '../services/authService.js';
import { pipelineOrchestrator } from '../pipeline/pipelineOrchestrator.js';

export const apiRouter = express.Router();

// ─── Health ──────────────────────────────────────────────────────────────────

apiRouter.get('/health', (_req, res) => {
  res.json({ ok: true, ts: Date.now(), version: 'TRADO v5' });
});

// ─── Auth Status & Debug ──────────────────────────────────────────────────────

apiRouter.get('/auth/status', (_req, res) => {
  res.json({ ok: true, data: authService.getTokenStatus() });
});

apiRouter.get('/auth/debug', (_req, res) => {
  res.json({
    ok: true,
    data: {
      appId: config.fyers.appId,
      secretLength: (config.fyers.secret || '').length,
      hasExplicitAppIdHash: Boolean(config.fyers.appIdHash),
      redirectUri: config.fyers.redirectUri,
      loginBaseUrl: config.fyers.loginBaseUrl,
      authBaseUrl: config.fyers.authBaseUrl,
      symbol: config.symbol,
      futuresSymbol: config.futuresSymbol,
      fetchIntervalMs: config.fetchIntervalMs
    }
  });
});

// ─── Connection Guide ─────────────────────────────────────────────────────────

apiRouter.get('/auth/connection-guide', (_req, res) => {
  const appId = config.fyers.appId || 'YOUR_APP_ID';
  const redirectUri = config.fyers.redirectUri || 'https://yourapp.com';

  res.json({
    ok: true,
    data: {
      steps: [
        {
          step: 1,
          title: 'Click "Connect Fyers"',
          description: 'Opens the Fyers login page for your app. Log in with your Fyers account.'
        },
        {
          step: 2,
          title: 'Authorize the App',
          description: `Allow TRADO to access your Fyers account. You will be redirected back to ${redirectUri}.`
        },
        {
          step: 3,
          title: 'Auto-Connect or Paste Token',
          description: 'TRADO auto-reads the auth code from the URL. If it fails, copy your access token from Fyers and paste it in the manual field.'
        }
      ],
      appId,
      redirectUri,
      manualTokenNote: 'You can also paste an access token directly if you have one from the Fyers API dashboard.'
    }
  });
});

// ─── Auth: Login URL ──────────────────────────────────────────────────────────

apiRouter.get('/auth/login-url', async (req, res) => {
  try {
    const state = req.query?.state || 'TRADO_V5';
    const result = await authService.generateAuthCode({ state });
    if (!result.authCodeUrl) {
      return res.status(502).json({
        ok: false,
        error: 'Fyers auth URL missing. Check FYERS_APP_ID and FYERS_REDIRECT_URI in backend .env'
      });
    }
    return res.json({ ok: true, data: { authCodeUrl: result.authCodeUrl, state: result.state } });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error?.response?.data?.message || error.message
    });
  }
});

// ─── Auth: Exchange Auth Code ─────────────────────────────────────────────────

apiRouter.post('/auth/validate-authcode', async (req, res) => {
  try {
    const authCode = req.body?.authCode;
    if (!authCode) return res.status(400).json({ ok: false, error: 'authCode is required' });

    const result = await authService.exchangeAuthCode(authCode);
    return res.json({
      ok: true,
      data: { expiresAt: result.expiresAt, connected: true }
    });
  } catch (error) {
    const providerCode = error?.response?.data?.code || null;
    const providerStatus = error?.response?.status || null;
    const message = error?.response?.data?.message || error.message;
    const secretLen = (config.fyers.secret || '').length;
    const hint = providerCode === -5
      ? `FYERS rejected the app hash. Secret length=${secretLen}. Make sure you are using the Secret Key (not Secret ID) from the Fyers API panel. Or set FYERS_APP_ID_HASH explicitly in your .env.`
      : message.includes('expired') || message.includes('invalid')
        ? 'Auth code may have expired. Please restart the login flow.'
        : null;

    return res.status(500).json({ ok: false, error: message, providerCode, providerStatus, hint });
  }
});

// ─── Auth: Set Token Manually ─────────────────────────────────────────────────

apiRouter.post('/auth/set-token', async (req, res) => {
  try {
    const { accessToken, refreshToken = '', expiresInSeconds } = req.body || {};
    if (!accessToken) return res.status(400).json({ ok: false, error: 'accessToken is required' });

    const result = await authService.setManualToken({ accessToken, refreshToken, expiresInSeconds });
    return res.json({ ok: true, data: { connected: true, expiresAt: result.expiresAt } });
  } catch (error) {
    return res.status(400).json({ ok: false, error: error.message });
  }
});

// ─── Auth: Logout ─────────────────────────────────────────────────────────────

apiRouter.post('/auth/logout', async (_req, res) => {
  await authService.clearToken();
  return res.json({ ok: true, data: { connected: false } });
});

// ─── Dashboard Data ───────────────────────────────────────────────────────────

apiRouter.get('/dashboard', (_req, res) => {
  const authStatus = authService.getTokenStatus();
  if (!authStatus.connected) {
    return res.status(401).json({
      ok: false,
      authRequired: true,
      message: 'Fyers authentication required. Please connect via the auth flow.',
      authStatus
    });
  }

  const output = pipelineOrchestrator.getOutput();
  if (!output) {
    return res.json({
      ok: true,
      warming: true,
      data: _emptyDashboard()
    });
  }

  return res.json({ ok: true, data: output });
});

function _emptyDashboard() {
  return {
    timestamp: Date.now(),
    analytics: {
      spot: 0, futures: 0, support: null, resistance: null,
      momentum: 0, shortMomentum: 0, vwap: 0, volatility: 0,
      gex: 0, writer: 0, writerRelation: 'BALANCED', buyerSeller: 'BALANCED',
      liquidity: 0, biasScore: 0, breakoutScore: 0
    },
    prediction: {
      predictionScore: 0, direction: 'NEUTRAL', confidence: 0,
      confidenceLabel: 'LOW',
      inputs: { bias: 0, momentum: 0, gex: 0, liquidity: 0, volatility: 0, vwapDeviation: 0 }
    },
    coherence: {
      coherentDirection: 'NEUTRAL', coherenceScore: 0,
      dominantSignal: 'price',
      signalBreakdown: { price: 0, gex: 0, momentum: 0, flow: 0 }
    },
    stability: { confirmedCycles: 0, pendingCycles: 0, frozenUntil: 0, updated: false },
    meta: { snapshots: 0, smoothedRows: [], candles: [], spot: null, futures: null, cycleCount: 0 }
  };
}
