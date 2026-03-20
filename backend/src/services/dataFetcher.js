import axios from 'axios';
import { config } from '../config.js';
import { authService } from './authService.js';
import { logger } from '../utils/logger.js';

const RETRIES = 1;
const TIMEOUT_MS = 3000;

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export class DataFetcher {
  constructor() {
    this.requestInProgress = false;
    this.lastSnapshot = null;
  }

  async requestWithRetry({ url, method = 'POST', body = undefined, params = undefined }, attempt = 0) {
    const token = await authService.refreshIfRequired();
    const headers = {
      Authorization: `${config.fyers.appId}:${token.accessToken}`,
      'Content-Type': 'application/json'
    };

    try {
      const response = await axios({
        url,
        method,
        data: body,
        params,
        timeout: TIMEOUT_MS,
        headers
      });
      return response.data;
    } catch (error) {
      if (error?.response?.status === 401) {
        await authService.clearToken();
      }
      if (attempt < RETRIES) {
        const delay = error?.response?.status === 429 ? 1200 * (attempt + 1) : 250 * (attempt + 1);
        await wait(delay);
        return this.requestWithRetry({ url, method, body, params }, attempt + 1);
      }
      throw error;
    }
  }

  parseOptionChain(raw) {
    const chain = raw?.data?.optionsChain || raw?.optionsChain || [];
    if (chain.length && chain[0]?.option_type) {
      const byStrike = new Map();
      for (const row of chain) {
        const strike = Number(row.strike_price || row.strike || 0);
        if (!strike) continue;
        const current = byStrike.get(strike) || {
          strike,
          callOI: 0,
          putOI: 0,
          callOIChange: 0,
          putOIChange: 0,
          callVolume: 0,
          putVolume: 0,
          callLtp: 0,
          putLtp: 0
        };

        const optionType = `${row.option_type || ''}`.toUpperCase();
        if (optionType === 'CE') {
          current.callOI = Number(row.oi || 0);
          current.callOIChange = Number(row.oich || row.oi_change || 0);
          current.callVolume = Number(row.volume || 0);
          current.callLtp = Number(row.ltp || 0);
        } else if (optionType === 'PE') {
          current.putOI = Number(row.oi || 0);
          current.putOIChange = Number(row.oich || row.oi_change || 0);
          current.putVolume = Number(row.volume || 0);
          current.putLtp = Number(row.ltp || 0);
        }

        byStrike.set(strike, current);
      }

      return Array.from(byStrike.values()).sort((a, b) => a.strike - b.strike);
    }

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

  parseQuoteBySymbol(raw, symbol, fallbackSymbol = config.symbol) {
    const entries = raw?.d || raw?.data || [];
    const normalizedTarget = `${symbol || ''}`.trim().toUpperCase();
    const hit = entries.find((entry) => {
      const providedSymbol = `${entry?.n || entry?.symbol || entry?.v?.symbol || ''}`.trim().toUpperCase();
      return providedSymbol === normalizedTarget;
    });

    if (hit?.v) {
      return {
        symbol: hit.v.short_name || hit.v.symbol || symbol || fallbackSymbol,
        ltp: Number(hit.v.lp || hit.v.ltp || 0),
        volume: Number(hit.v.volume || 0)
      };
    }

    return {
      symbol: symbol || fallbackSymbol,
      ltp: 0,
      volume: 0
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
      const optionChainUrl = `${config.fyers.dataBaseUrl}/options-chain`;
      const quotesUrl = `${config.fyers.dataBaseUrl}/quotes`;
      const candlesUrl = `${config.fyers.dataBaseUrl}/history`;

      const safeRequest = async (requestLabel, requestFn, fallbackValue = null) => {
        try {
          return await requestFn();
        } catch (error) {
          const status = error?.response?.status;
          const providerMessage = error?.response?.data?.message || error.message;
          logger.warn(`${requestLabel} request failed`, `status=${status || 'NA'} message=${providerMessage}`);
          return fallbackValue;
        }
      };

      const quoteSymbols = config.futuresSymbol && config.futuresSymbol !== config.symbol
        ? `${config.symbol},${config.futuresSymbol}`
        : `${config.symbol}`;

      const [optionChainRaw, quotesRaw, candlesRaw] = await Promise.all([
        safeRequest('Option chain', () => this.requestWithRetry({
          url: optionChainUrl,
          method: 'GET',
          params: { symbol: config.symbol }
        }), { data: { optionsChain: [] } }),
        safeRequest('Quotes', () => this.requestWithRetry({
          url: quotesUrl,
          method: 'GET',
          params: { symbols: quoteSymbols }
        }), { d: [] }),
        safeRequest('Candles', () => this.requestWithRetry({
          url: candlesUrl,
          method: 'GET',
          params: {
            symbol: config.symbol,
            resolution: config.candlesResolution,
            date_format: '0',
            range_from: `${Math.floor((Date.now() - 6 * 60 * 1000) / 1000)}`,
            range_to: `${Math.floor(Date.now() / 1000)}`,
            cont_flag: '1'
          }
        }), { candles: [] })
      ]);

      const spot = this.parseQuoteBySymbol(quotesRaw, config.symbol, config.symbol);
      const futures = this.parseQuoteBySymbol(quotesRaw, config.futuresSymbol, config.symbol);

      const snapshot = {
        optionChain: this.parseOptionChain(optionChainRaw),
        spot,
        futures,
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
