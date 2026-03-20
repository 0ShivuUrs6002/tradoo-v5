import axios from 'axios';
import crypto from 'crypto';
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
    const url = `${config.fyers.authBaseUrl}/generate-authcode`;
    const params = {
      client_id: config.fyers.appId,
      redirect_uri: config.fyers.redirectUri,
      response_type: 'code',
      state
    };

    const queryUrl = `${url}?${new URLSearchParams(params).toString()}`;
    let data = {};

    try {
      const response = await axios.get(queryUrl, { timeout: 3000 });
      data = response.data || {};
    } catch {
      const response = await axios.post(url, {
        ...params,
        secret_key: config.fyers.secret
      }, { timeout: 3000 });
      data = response.data || {};
    }

    const directUrl = data?.Url || data?.url || data?.auth_code_url || '';
    return {
      raw: data,
      state,
      authCodeUrl: directUrl || queryUrl
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

  async exchangeAuthCode(authCode) {
    const url = `${config.fyers.authBaseUrl}/validate-authcode`;
    const appIdHash = crypto
      .createHash('sha256')
      .update(`${config.fyers.appId}:${config.fyers.secret}`)
      .digest('hex');

    const response = await axios.post(url, {
      grant_type: 'authorization_code',
      appIdHash,
      code: authCode,
      secret_key: config.fyers.secret
    }, { timeout: 3000 });

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
