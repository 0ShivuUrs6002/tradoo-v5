import axios from 'axios';
import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import { config } from '../config.js';
import { readToken, writeToken } from './tokenStore.js';
import { logger } from '../utils/logger.js';

const TOKEN_REFRESH_BUFFER_MS = 2 * 60 * 1000;
const REFRESH_RETRIES = 2;
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

class AuthService {
  constructor() {
    this.currentToken = null;
  }

  isAuthCodeJwt(tokenValue) {
    try {
      const token = `${tokenValue || ''}`.trim();
      const parts = token.split('.');
      if (parts.length !== 3) return false;
      const payloadRaw = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const padded = payloadRaw + '='.repeat((4 - (payloadRaw.length % 4)) % 4);
      const decoded = Buffer.from(padded, 'base64').toString('utf-8');
      const payload = JSON.parse(decoded);
      return payload?.sub === 'auth_code';
    } catch {
      return false;
    }
  }

  async init() {
    const stored = await readToken();
    this.currentToken = stored || null;
  }

  getAuthHeader() {
    if (!this.currentToken?.accessToken) return '';
    return `${config.fyers.appId}:${this.currentToken.accessToken}`;
  }

  async generateAuthCode(payload) {
    const state = payload?.state || 'TRADO_V5';
    const url = `${config.fyers.loginBaseUrl}/generate-authcode`;
    const params = {
      client_id: config.fyers.appId,
      redirect_uri: config.fyers.redirectUri,
      response_type: 'code',
      state
    };
    const directUrl = `${url}?${new URLSearchParams(params).toString()}`;

    return {
      raw: null,
      state,
      authCodeUrl: directUrl
    };
  }

  hasValidToken() {
    return Boolean(this.currentToken?.accessToken);
  }

  getTokenStatus() {
    const expiresAt = this.currentToken?.expiresAt || null;
    return {
      connected: Boolean(this.currentToken?.accessToken),
      expiresAt,
      expiresInMs: expiresAt ? Math.max(0, expiresAt - Date.now()) : null
    };
  }

  async setManualToken({ accessToken, refreshToken, expiresInSeconds }) {
    if (!accessToken) {
      throw new Error('accessToken is required');
    }

    if (this.isAuthCodeJwt(accessToken)) {
      throw new Error('Received FYERS auth_code JWT, not access token. Complete callback exchange instead of manual token set.');
    }

    const tokenPayload = {
      accessToken: `${accessToken}`.trim(),
      refreshToken: `${refreshToken || ''}`.trim(),
      expiresAt: Date.now() + ((Number(expiresInSeconds) || 12 * 60 * 60) * 1000)
    };

    this.currentToken = tokenPayload;
    await writeToken(tokenPayload);
    return tokenPayload;
  }

  async clearToken() {
    this.currentToken = null;
    const tokenPath = path.resolve(process.cwd(), '.secure', 'token.json');
    try {
      await fs.unlink(tokenPath);
    } catch {
      return;
    }
  }

  async exchangeAuthCode(authCode) {
    const urls = [
      `${config.fyers.authBaseUrl}/validate-authcode`,
      'https://api.fyers.in/api/v3/validate-authcode',
      'https://api-t1.fyers.in/api/v3/validate-authcode'
    ];
    const appIdWithoutSuffix = config.fyers.appId.replace(/-\d+$/, '');
    const hashFull = crypto.createHash('sha256').update(`${config.fyers.appId}:${config.fyers.secret}`).digest('hex');
    const hashTrimmed = crypto.createHash('sha256').update(`${appIdWithoutSuffix}:${config.fyers.secret}`).digest('hex');
    const candidateHashes = [
      config.fyers.appIdHash,
      hashFull,
      hashFull.toUpperCase(),
      hashTrimmed,
      hashTrimmed.toUpperCase()
    ].filter(Boolean);
    const bodyVariants = (appIdHash) => ([
      {
        grant_type: 'authorization_code',
        appIdHash,
        code: authCode
      },
      {
        grant_type: 'authorization_code',
        appIdHash,
        code: authCode,
        secret_key: config.fyers.secret
      },
      {
        grant_type: 'authorization_code',
        appIdHash,
        code: authCode,
        client_id: config.fyers.appId,
        secret_key: config.fyers.secret
      },
      {
        grant_type: 'authorization_code',
        appIdHash,
        code: authCode,
        client_id: appIdWithoutSuffix,
        secret_key: config.fyers.secret
      }
    ]);

    let response = null;
    let lastError = null;
    for (const url of urls) {
      for (const appIdHash of candidateHashes) {
        for (const body of bodyVariants(appIdHash)) {
          try {
            response = await axios.post(url, body, { timeout: 3500 });
            break;
          } catch (error) {
            lastError = error;
            const message = `${error?.response?.data?.message || ''}`.toLowerCase();
            const providerCode = error?.response?.data?.code;
            const shouldContinue = message.includes('invalid app id hash') || providerCode === -5;
            if (!shouldContinue) {
              throw error;
            }
          }
        }

        if (response) break;
      }

      if (response) break;
    }

    if (!response) {
      const providerCode = lastError?.response?.data?.code;
      const providerMessage = lastError?.response?.data?.message;
      if (providerCode === -5 || `${providerMessage || ''}`.toLowerCase().includes('invalid app id hash')) {
        const hardError = new Error('FYERS auth rejected app hash. Verify you are using Secret Key (not Secret ID) and correct App ID format.');
        hardError.response = {
          status: lastError?.response?.status || 400,
          data: {
            code: -5,
            message: 'invalid app id hash'
          }
        };
        throw hardError;
      }

      throw lastError || new Error('Failed to validate auth code with available appId hash strategies.');
    }

    const data = response.data || {};
    const tokenPayload = {
      accessToken: data.access_token || '',
      refreshToken: data.refresh_token || config.fyers.refreshToken || '',
      expiresAt: Date.now() + ((data.expires_in || 3600) * 1000)
    };

    this.currentToken = tokenPayload;
    await writeToken(tokenPayload);
    return tokenPayload;
  }

  async refreshWithRetry(attempt = 0) {
    const url = `${config.fyers.authBaseUrl}/validate-refresh-token`;
    try {
      const response = await axios.post(url, {
        grant_type: 'refresh_token',
        refresh_token: this.currentToken.refreshToken,
        client_id: config.fyers.appId,
        secret_key: config.fyers.secret
      }, { timeout: 3000 });

      const data = response.data || {};
      this.currentToken = {
        accessToken: data.access_token || this.currentToken.accessToken,
        refreshToken: data.refresh_token || this.currentToken.refreshToken,
        expiresAt: Date.now() + ((data.expires_in || 3600) * 1000)
      };

      await writeToken(this.currentToken);
      return this.currentToken;
    } catch (error) {
      if (attempt < REFRESH_RETRIES) {
        await wait(250 * (attempt + 1));
        return this.refreshWithRetry(attempt + 1);
      }
      throw error;
    }
  }

  async refreshIfRequired() {
    if (!this.currentToken?.accessToken) {
      await this.init();
    }

    if (!this.currentToken?.accessToken && config.fyers.accessToken) {
      this.currentToken = {
        accessToken: config.fyers.accessToken,
        refreshToken: config.fyers.refreshToken,
        expiresAt: Date.now() + 15 * 60 * 1000
      };
      await writeToken(this.currentToken);
    }

    if (!this.currentToken?.accessToken) {
      throw new Error('Missing Fyers access token. Complete auth flow.');
    }

    if (Date.now() < ((this.currentToken.expiresAt || 0) - TOKEN_REFRESH_BUFFER_MS)) {
      return this.currentToken;
    }

    if (!this.currentToken.refreshToken) {
      logger.warn('Refresh token unavailable; continuing with current access token.');
      return this.currentToken;
    }

    try {
      return await this.refreshWithRetry();
    } catch (error) {
      logger.error('Token refresh failed', error.message);
      return this.currentToken;
    }
  }
}

export const authService = new AuthService();
