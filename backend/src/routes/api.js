import express from 'express';
import { authService } from '../services/authService.js';
import { pipelineOrchestrator } from '../pipeline/pipelineOrchestrator.js';

export const apiRouter = express.Router();

apiRouter.get('/health', (_req, res) => {
  res.json({ ok: true, ts: Date.now() });
});

apiRouter.get('/auth/status', (_req, res) => {
  res.json({ ok: true, data: authService.getTokenStatus() });
});

apiRouter.get('/auth/login-url', async (req, res) => {
  try {
    const state = req.query?.state || 'TRADO_V5';
    const result = await authService.generateAuthCode({ state });
    if (!result.authCodeUrl) {
      return res.status(502).json({ ok: false, error: 'Fyers auth URL missing in response', raw: result.raw });
    }
    return res.json({ ok: true, data: { authCodeUrl: result.authCodeUrl, state: result.state } });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
});

apiRouter.post('/auth/generate-authcode', async (req, res) => {
  try {
    const result = await authService.generateAuthCode(req.body || {});
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

apiRouter.post('/auth/validate-authcode', async (req, res) => {
  try {
    const authCode = req.body?.authCode;
    if (!authCode) return res.status(400).json({ error: 'authCode is required' });
    const result = await authService.exchangeAuthCode(authCode);
    res.json({
      ok: true,
      data: {
        expiresAt: result.expiresAt,
        connected: true
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

apiRouter.get('/dashboard', (_req, res) => {
  const authStatus = authService.getTokenStatus();
  if (!authStatus.connected) {
    return res.status(401).json({
      ok: false,
      authRequired: true,
      message: 'Fyers authentication required',
      authStatus
    });
  }

  const output = pipelineOrchestrator.getOutput();
  if (!output) {
    return res.status(503).json({
      ok: false,
      message: 'Pipeline warming up',
      ts: Date.now()
    });
  }
  return res.json({ ok: true, data: output });
});
