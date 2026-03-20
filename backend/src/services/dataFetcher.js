import axios from 'axios';
import { config } from '../config.js';
import { authService } from './authService.js';
import { logger } from '../utils/logger.js';

const RETRIES = 2;
const TIMEOUT_MS = 3000;

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export class DataFetcher {
  constructor() {
    this.requestInProgress = false;
    this.lastSnapshot = null;
  }

  async requestWithRetry(url, body, attempt = 0) {
    const token = await authService.refreshIfRequired();
    const headers = {
      Authorization: `${config.fyers.appId}:${token.accessToken}`,
      'Content-Type': 'application/json'
    };

    try {
      const response = await axios.post(url, body, { timeout: TIMEOUT_MS, headers });
      return response.data;
    } catch (error) {
      if (attempt < RETRIES) {
        await wait(250 * (attempt + 1));
        return this.requestWithRetry(url, body, attempt + 1);
      }
      throw error;
    }
  }

  parseOptionChain(raw) {
    const chain = raw?.data?.optionsChain || raw?.optionsChain || [];
    return chain.map((item) => ({
      strike: Number(item.strike_price || item.strike || 0),
      callOI: Number(item.ce_oi || item.call_oi || 0),
      putOI: Number(item.pe_oi || item.put_oi || 0),
      callOIChange: Number(item.ce_oi_change || item.call_oi_change || 0),
      putOIChange: Number(item.pe_oi_change || item.put_oi_change || 0),
      callVolume: Number(item.ce_volume || item.call_volume || 0),
      putVolume: Number(item.pe_volume || item.put_volume || 0),
      callLtp: Number(item.ce_ltp || item.call_ltp || 0),
      putLtp: Number(item.pe_ltp || item.put_ltp || 0)
    }));
  }

  parseQuotes(raw) {
    const quote = raw?.d?.[0]?.v || raw?.data?.[0]?.v || raw?.quote || {};
    return {
      symbol: quote.short_name || quote.symbol || config.symbol,
      ltp: Number(quote.lp || quote.ltp || 0),
      volume: Number(quote.volume || 0)
    };
  }

  parseCandles(raw) {
    const candles = raw?.candles || raw?.data?.candles || [];
    return candles.map((c) => ({
      t: Number(c[0] || 0),
      o: Number(c[1] || 0),
      h: Number(c[2] || 0),
      l: Number(c[3] || 0),
      c: Number(c[4] || 0),
      v: Number(c[5] || 0)
    }));
  }

  async fetchSnapshot() {
    if (this.requestInProgress) {
      return this.lastSnapshot;
    }

    this.requestInProgress = true;

    try {
      const optionChainUrl = `${config.fyers.dataBaseUrl}/optionchain`;
      const quotesUrl = `${config.fyers.dataBaseUrl}/quotes`;
      const candlesUrl = `${config.fyers.dataBaseUrl}/history`;

      const [optionChainRaw, spotRaw, futuresRaw, candlesRaw] = await Promise.all([
        this.requestWithRetry(optionChainUrl, { symbol: config.symbol }),
        this.requestWithRetry(quotesUrl, { symbols: config.symbol }),
        this.requestWithRetry(quotesUrl, { symbols: config.futuresSymbol }),
        this.requestWithRetry(candlesUrl, {
          symbol: config.symbol,
          resolution: config.candlesResolution,
          date_format: '0',
          range_from: `${Math.floor((Date.now() - 6 * 60 * 1000) / 1000)}`,
          range_to: `${Math.floor(Date.now() / 1000)}`,
          cont_flag: '1'
        })
      ]);

      const snapshot = {
        optionChain: this.parseOptionChain(optionChainRaw),
        spot: this.parseQuotes(spotRaw),
        futures: this.parseQuotes(futuresRaw),
        candles: this.parseCandles(candlesRaw)
      };

      this.lastSnapshot = snapshot;
      return snapshot;
    } catch (error) {
      logger.error('Data fetch failed', error.message);
      if (this.lastSnapshot) return this.lastSnapshot;
      throw error;
    } finally {
      this.requestInProgress = false;
    }
  }
}

export const dataFetcher = new DataFetcher();
