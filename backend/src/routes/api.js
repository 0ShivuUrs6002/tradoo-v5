import express from 'express';
import { config } from '../config.js';
import { authService } from '../services/authService.js';
import { pipelineOrchestrator } from '../pipeline/pipelineOrchestrator.js';
import { cryptoService } from '../services/cryptoService.js';
import { commodityService } from '../services/commodityService.js';
import { round, clamp } from '../utils/math.js';

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
      liquidity: 0, biasScore: 0, breakoutScore: 0, pcr: 1,
      _normalized: { momentum: 0, gex: 0, vwapDev: 0, liquidity: 0, volatility: 0 }
    },
    prediction: {
      predictionScore: 0, probability: 50, direction: 'NEUTRAL',
      timeframes: {
        m15: { score: 0, direction: 'FLAT', probability: 50 },
        m30: { score: 0, direction: 'FLAT', probability: 50 },
        h1:  { score: 0, direction: 'FLAT', probability: 50 }
      },
      signals: {
        emaCross: 0, rsi: 0, macd: 0, pcr: 0, writer: 0,
        ivSkew: 0, gex: 0, vwapDev: 0, momentum: 0,
        srProximity: 0, oiConcentration: 0, volumeSurge: 0, divergence: 0
      }
    },
    reversal: {
      probability: 0, isMajorReversal: false, direction: 'NONE', warnings: []
    },
    gap: {
      direction: 'FLAT', probability: 50, score: 0, signals: []
    },
    coherence: {
      coherentDirection: 'NEUTRAL', coherenceScore: 0,
      dominantSignal: 'ema', coherenceQuality: 0,
      signalBreakdown: { ema: 0, rsi: 0, macd: 0, price: 0, gex: 0, pcr: 0, momentum: 0, flow: 0 }
    },
    indicators: {
      rsi: 50, ema9: 0, ema21: 0,
      macd: { macdLine: 0, signalLine: 0, histogram: 0 },
      atr: 0, pcr: 1, ivSkew: 0, volumeSurge: 0,
      momentum1m: 0, momentum5m: 0, momentum15m: 0
    },
    stability: { confirmedCycles: 0, pendingCycles: 0, frozenUntil: 0, updated: false },
    meta: { snapshots: 0, smoothedRows: [], candles: [], spot: null, futures: null, cycleCount: 0 }
  };
}

// ─── Prediction Cache (60s stable) ───────────────────────────────────────────
const predictionCache = {};
const PRED_TTL = 60000;

function getCachedPrediction(key, computeFn) {
  const c = predictionCache[key];
  if (c && Date.now() - c.ts < PRED_TTL) return c.data;
  const pred = computeFn();
  predictionCache[key] = { data: pred, ts: Date.now() };
  return pred;
}

// ─── Crypto Dashboard Data ───────────────────────────────────────────────────

apiRouter.get('/crypto/:symbol', async (req, res) => {
  try {
    const symbol = (req.params.symbol || 'BTC').toUpperCase();
    const days = parseInt(req.query.days) || 1;
    const data = await cryptoService.getDashboardData(symbol, days);

    // Stable predictions — cached 60s so they don't flip on 5s refresh
    const prediction = getCachedPrediction(`crypto_${symbol}`, () => {
      const momScore = clamp((data.momentum || 0) * 500, -1, 1);
      const rsiScore = clamp((50 - (data.rsi || 50)) / 50, -1, 1);
      const emaScore = clamp((data.emaCross || 0), -1, 1);
      const toPercent = (s) => round(clamp((s + 1) / 2) * 100, 1);
      const formatDir = (s) => s > 0.15 ? 'BULLISH' : s < -0.15 ? 'BEARISH' : 'FLAT';
      const m15 = clamp(momScore * 0.6 + emaScore * 0.4);
      const m30 = clamp(momScore * 0.4 + rsiScore * 0.3 + emaScore * 0.3);
      const h1  = clamp(rsiScore * 0.4 + emaScore * 0.4 + momScore * 0.2);
      const avg = (m15 + m30 + h1) / 3;
      const dirs = [formatDir(m15), formatDir(m30), formatDir(h1)];
      const bullish = dirs.filter(d => d === 'BULLISH').length;
      const bearish = dirs.filter(d => d === 'BEARISH').length;
      return {
        probability: toPercent(avg),
        direction: bullish >= 2 ? 'BULLISH' : bearish >= 2 ? 'BEARISH' : 'MIXED',
        timeframes: {
          m15: { probability: toPercent(m15), direction: formatDir(m15), score: round(m15, 4) },
          m30: { probability: toPercent(m30), direction: formatDir(m30), score: round(m30, 4) },
          h1:  { probability: toPercent(h1),  direction: formatDir(h1),  score: round(h1, 4) }
        }
      };
    });

    res.json({
      ok: true,
      data: {
        name: data.name,
        symbol: data.symbol,
        spot: data.spot,
        volume24h: data.volume24h,
        change24h: data.change24h,
        high24h: data.high24h,
        low24h: data.low24h,
        momentum: data.momentum,
        biasScore: data.biasScore,
        rsi: data.rsi,
        ema9: data.ema9,
        ema21: data.ema21,
        sma50: data.sma50,
        sma200: data.sma200,
        support: data.support,
        resistance: data.resistance,
        chartData: data.chartData,
        reversalSignal: data.reversalSignal || null,
        prediction
      }
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ─── Commodity Dashboard Data ────────────────────────────────────────────────

apiRouter.get('/commodities/:symbol', async (req, res) => {
  try {
    const symbol = (req.params.symbol || 'GOLD').toUpperCase();
    const days = parseInt(req.query.days) || 1;
    const data = await commodityService.getDashboardData(symbol, days);

    // Stable predictions — cached 60s
    const prediction = getCachedPrediction(`commodity_${symbol}`, () => {
      const momScore = clamp((data.momentum || 0) * 500, -1, 1);
      const rsiScore = clamp((50 - (data.rsi || 50)) / 50, -1, 1);
      const toPercent = (s) => round(clamp((s + 1) / 2) * 100, 1);
      const formatDir = (s) => s > 0.15 ? 'BULLISH' : s < -0.15 ? 'BEARISH' : 'FLAT';
      const m15 = clamp(momScore * 0.7 + rsiScore * 0.3);
      const m30 = clamp(momScore * 0.5 + rsiScore * 0.5);
      const h1  = clamp(rsiScore * 0.6 + momScore * 0.4);
      const avg = (m15 + m30 + h1) / 3;
      const dirs = [formatDir(m15), formatDir(m30), formatDir(h1)];
      const bullish = dirs.filter(d => d === 'BULLISH').length;
      const bearish = dirs.filter(d => d === 'BEARISH').length;
      return {
        probability: toPercent(avg),
        direction: bullish >= 2 ? 'BULLISH' : bearish >= 2 ? 'BEARISH' : 'MIXED',
        timeframes: {
          m15: { probability: toPercent(m15), direction: formatDir(m15), score: round(m15, 4) },
          m30: { probability: toPercent(m30), direction: formatDir(m30), score: round(m30, 4) },
          h1:  { probability: toPercent(h1),  direction: formatDir(h1),  score: round(h1, 4) }
        }
      };
    });

    res.json({
      ok: true,
      data: {
        name: data.name,
        symbol: data.symbol,
        spot: data.spot,
        currency: data.currency || '₹',
        change24h: data.change24h,
        volume24h: data.volume24h,
        high24h: data.high24h,
        low24h: data.low24h,
        momentum: data.momentum,
        biasScore: data.biasScore,
        rsi: data.rsi,
        ema9: data.ema9,
        ema21: data.ema21,
        support: data.support,
        resistance: data.resistance,
        chartData: data.chartData,
        reversalSignal: data.reversalSignal || null,
        prediction
      }
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});
