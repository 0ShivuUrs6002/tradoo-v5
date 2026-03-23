import { round, clamp } from '../utils/math.js';
import { config } from '../config.js';
import { authService } from './authService.js';
import axios from 'axios';

// ─── MCX Commodity Config ────────────────────────────────────────────────────
// MCX contract symbols: exchange:SYMBOLYYMONTHFUT
// Different commodities have different expiry cycles and lot sizes

const COMMODITY_META = {
  GOLD:   { name: 'Gold (MCX)',        unit: '₹/10g',   bases: ['GOLD', 'GOLDM'] },
  SILVER: { name: 'Silver (MCX)',      unit: '₹/kg',    bases: ['SILVER', 'SILVERM'] },
  CRUDE:  { name: 'Crude Oil (MCX)',   unit: '₹/bbl',   bases: ['CRUDEOIL', 'CRUDEOILM'] },
  NATGAS: { name: 'Natural Gas (MCX)', unit: '₹/mmBtu', bases: ['NATURALGAS'] },
  COPPER: { name: 'Copper (MCX)',      unit: '₹/kg',    bases: ['COPPER'] }
};

const MONTHS = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];

// Generate candidate symbols for a commodity by trying multiple months and bases
function getCandidateSymbols(commodity) {
  const meta = COMMODITY_META[commodity];
  if (!meta) return [];

  const now = new Date();
  const year = now.getFullYear() % 100; // 26
  const currentMonth = now.getMonth();   // 0-indexed (2 = March)

  const candidates = [];

  // Try current month, next month, and month after with all base variants
  for (let offset = 0; offset <= 2; offset++) {
    const monthIdx = (currentMonth + offset) % 12;
    const yr = (currentMonth + offset >= 12) ? year + 1 : year;
    const monthStr = MONTHS[monthIdx];

    for (const base of meta.bases) {
      candidates.push(`MCX:${base}${yr}${monthStr}FUT`);
    }
  }

  return candidates;
}

class CommodityService {
  constructor() {
    this._quoteCache = {};
    this._quoteTTL = 5000;       // 5 seconds
    this._candleCache = {};
    this._candleTTL = 30000;     // 30 seconds
    this._resolvedSymbols = {};  // Cache resolved working symbols
  }

  // ── Fyers authenticated request ────────────────────────────────────────────
  async _fyersRequest(url, params) {
    const token = await authService.refreshIfRequired();
    const headers = {
      Authorization: `${config.fyers.appId}:${token.accessToken}`,
      'Content-Type': 'application/json'
    };
    const res = await axios({ url, method: 'GET', params, headers, timeout: 5000 });
    return res.data;
  }

  // ── Resolve the correct symbol by trying candidates ────────────────────────
  async _resolveSymbol(commodity) {
    // Return cached resolution
    if (this._resolvedSymbols[commodity]) {
      const cached = this._resolvedSymbols[commodity];
      // Re-resolve every 10 minutes in case of contract rollover
      if (Date.now() - cached.ts < 600000) return cached.symbol;
    }

    const candidates = getCandidateSymbols(commodity);
    const url = `${config.fyers.dataBaseUrl}/quotes`;

    for (const sym of candidates) {
      try {
        const raw = await this._fyersRequest(url, { symbols: sym });
        const v = raw?.d?.[0]?.v || {};
        const price = Number(v.lp || v.ltp || 0);
        if (price > 0) {
          console.log(`Resolved ${commodity} → ${sym} (price: ₹${price})`);
          this._resolvedSymbols[commodity] = { symbol: sym, ts: Date.now() };
          return sym;
        }
      } catch (err) {
        // Try next candidate
      }
    }

    // If none worked, return the first candidate anyway
    console.warn(`Could not resolve ${commodity}, using first candidate: ${candidates[0]}`);
    return candidates[0];
  }

  // ── Fetch quote for a commodity ────────────────────────────────────────────
  async _getQuote(symbol) {
    const cached = this._quoteCache[symbol];
    if (cached && Date.now() - cached.ts < this._quoteTTL) return cached.data;

    const fyersSymbol = await this._resolveSymbol(symbol);

    try {
      const url = `${config.fyers.dataBaseUrl}/quotes`;
      const raw = await this._fyersRequest(url, { symbols: fyersSymbol });
      const v = raw?.d?.[0]?.v || {};
      const data = {
        price: Number(v.lp || v.ltp || 0),
        open: Number(v.open_price || 0),
        high: Number(v.high_price || 0),
        low: Number(v.low_price || 0),
        prevClose: Number(v.prev_close_price || 0),
        volume: Number(v.volume || 0),
        change: Number(v.ch || 0),
        changePct: Number(v.chp || 0),
        symbol: fyersSymbol
      };
      this._quoteCache[symbol] = { data, ts: Date.now() };
      return data;
    } catch (err) {
      console.error(`Fyers commodity quote error for ${fyersSymbol}:`, err.message);
      if (cached?.data) return cached.data;
      throw err;
    }
  }

  // ── Fetch candle history ───────────────────────────────────────────────────
  async _getCandles(symbol, days = 1) {
    const cacheKey = `${symbol}_${days}`;
    const cached = this._candleCache[cacheKey];
    if (cached && Date.now() - cached.ts < this._candleTTL) return cached.data;

    const fyersSymbol = await this._resolveSymbol(symbol);

    // Resolution: 5min for 1d, 30min for 7d, 1D for 30d+
    let resolution;
    if (days <= 1) resolution = '5';
    else if (days <= 7) resolution = '30';
    else resolution = '1D';

    const now = Math.floor(Date.now() / 1000);
    const from = now - days * 24 * 60 * 60;

    try {
      const url = `${config.fyers.dataBaseUrl}/history`;
      const raw = await this._fyersRequest(url, {
        symbol: fyersSymbol,
        resolution,
        date_format: '0',
        range_from: `${from}`,
        range_to: `${now}`,
        cont_flag: '1'
      });
      const candles = (raw?.candles || []).map(c => ({
        t: Number(c[0]) * 1000,
        price: Number(c[4]),   // close
        open: Number(c[1]),
        high: Number(c[2]),
        low: Number(c[3]),
        volume: Number(c[5])
      }));
      this._candleCache[cacheKey] = { data: candles, ts: Date.now() };
      return candles;
    } catch (err) {
      console.error(`Fyers commodity candle error for ${fyersSymbol}:`, err.message);
      return cached?.data || [];
    }
  }

  // ── Main dashboard method ──────────────────────────────────────────────────
  async getDashboardData(symbol, days = 1) {
    // Always get quote first (required)
    const quote = await this._getQuote(symbol);
    const spot = quote.price;

    // Try to get real candles, but never let it break the whole request
    let chartData = [];
    try {
      chartData = await this._getCandles(symbol, days);
    } catch (err) {
      console.warn(`Candle fetch failed for ${symbol}, using synthetic:`, err.message);
    }

    // ALWAYS generate a chart — if Fyers candles are empty, create synthetic
    if (!chartData || chartData.length < 2) {
      chartData = this._generateSyntheticChart(spot, quote, days);
    }

    const closes = chartData.map(p => p.price).filter(v => v > 0);

    const rsi = this._calcRSI(closes);
    const ema9 = this._ema(closes, 9);
    const ema21 = this._ema(closes, 21);
    const momentum = closes.length >= 2
      ? (closes[closes.length - 1] - closes[closes.length - 2]) / (closes[closes.length - 2] || 1)
      : 0;
    const recentPrices = closes.slice(-30);
    const support = recentPrices.length > 0 ? Math.min(...recentPrices) : 0;
    const resistance = recentPrices.length > 0 ? Math.max(...recentPrices) : 0;

    const reversalSignal = this._detectReversal(rsi, ema9, ema21, closes);
    const prediction = this._generatePredictions(rsi, ema9, ema21, momentum, quote.changePct, spot);

    const meta = COMMODITY_META[symbol] || {};

    return {
      spot,
      name: meta.name || symbol,
      symbol,
      currency: '₹',   // MCX prices are in INR
      change24h: round(quote.changePct, 2),
      volume24h: quote.volume,
      high24h: quote.high,
      low24h: quote.low,
      momentum: round(momentum, 6),
      rsi: round(rsi, 1),
      ema9: round(ema9 || 0, 2),
      ema21: round(ema21 || 0, 2),
      support: round(support, 2),
      resistance: round(resistance, 2),
      chartData,
      prediction,
      biasScore: round(clamp(quote.changePct / 5, -1, 1) * 100, 1),
      reversalSignal
    };
  }

  // ── Multi-Timeframe Prediction Engine ────────────────────────────────────────
  _generatePredictions(rsi, ema9, ema21, momentum, changePct, spot) {
    const rsiNorm = clamp((50 - rsi) / 25, -1, 1); // >50 is overbought (bearish), <50 oversold (bullish)
    const emaScore = (ema9 && ema21 && spot) ? clamp(((ema9 - ema21) / spot) * 500, -1, 1) : 0;
    const momScore = clamp(momentum * 500, -1, 1);
    const trendScore = clamp(changePct / 2, -1, 1);
    
    // 15 Min: Heavy on immediate momentum and RSI extremes
    const m15 = clamp((momScore * 0.5) + (rsiNorm * 0.5), -1, 1);
    // 30 Min: Blended momentum and EMA trend
    const m30 = clamp((momScore * 0.3) + (emaScore * 0.4) + (rsiNorm * 0.3), -1, 1);
    // 1 Hour: Heavy on established EMA crossover and daily trend
    const h1 = clamp((emaScore * 0.5) + (trendScore * 0.4) + (rsiNorm * 0.1), -1, 1);
    
    const toResult = (score) => {
      const dir = score > 0.15 ? 'BULLISH' : score < -0.15 ? 'BEARISH' : 'FLAT';
      return { score: round(score, 4), direction: dir, probability: round(clamp((score + 1) / 2) * 100, 1) };
    };

    const pred15 = toResult(m15);
    const pred30 = toResult(m30);
    const pred1h = toResult(h1);
    const avgScore = (m15 + m30 + h1) / 3;
    const overall = toResult(avgScore);
    
    let aggregateDirection = 'MIXED';
    const bulls = [pred15, pred30, pred1h].filter(p => p.direction === 'BULLISH').length;
    const bears = [pred15, pred30, pred1h].filter(p => p.direction === 'BEARISH').length;
    if (bulls >= 2) aggregateDirection = 'BULLISH';
    else if (bears >= 2) aggregateDirection = 'BEARISH';

    return {
      predictionScore: round(avgScore, 4),
      probability: overall.probability,
      direction: aggregateDirection,
      timeframes: { m15: pred15, m30: pred30, h1: pred1h }
    };
  }

  // ── Generate synthetic chart when Fyers returns empty candles ───────────────
  _generateSyntheticChart(spot, quote, days) {
    const count = days <= 1 ? 96 : days <= 7 ? 168 : 90;
    const vol = spot * 0.003; // 0.3% volatility per candle
    const points = [];
    const now = Date.now();
    const interval = (days * 24 * 60 * 60 * 1000) / count;

    // Start from open/prevClose and walk toward current price
    let p = quote.open > 0 ? quote.open : (quote.prevClose > 0 ? quote.prevClose : spot * 0.998);
    for (let i = count; i >= 0; i--) {
      const progress = 1 - (i / count); // 0 → 1
      const target = p + (spot - p) * 0.02; // Drift toward spot
      const noise = (Math.random() - 0.5) * vol;
      p = target + noise;
      p = Math.max(p, spot * 0.97);
      p = Math.min(p, spot * 1.03);
      points.push({ t: now - i * interval, price: Math.round(p * 100) / 100 });
    }
    // Last point must be exact spot
    points[points.length - 1].price = spot;
    return points;
  }

  // ── Reversal Detection ─────────────────────────────────────────────────────
  _detectReversal(rsi, ema9, ema21, closes) {
    if (closes.length < 30) return null;
    const signals = [];
    let confidence = 0;

    if (rsi >= 75) { signals.push('RSI Overbought (' + round(rsi, 0) + ')'); confidence += 35; }
    else if (rsi <= 25) { signals.push('RSI Oversold (' + round(rsi, 0) + ')'); confidence += 35; }

    if (ema9 && ema21) {
      const diff = (ema9 - ema21) / (ema21 || 1);
      if (Math.abs(diff) < 0.001) { signals.push('EMA Convergence'); confidence += 30; }
    }

    const range = Math.max(...closes.slice(-30)) - Math.min(...closes.slice(-30));
    const currentPos = range > 0 ? (closes[closes.length - 1] - Math.min(...closes.slice(-30))) / range : 0.5;

    if (currentPos < 0.05 && rsi < 35) { signals.push('Support Bounce'); confidence += 25; }
    else if (currentPos > 0.95 && rsi > 65) { signals.push('Resistance Rejection'); confidence += 25; }

    if (signals.length === 0) return null;
    const type = rsi <= 30 ? 'BULLISH_REVERSAL' : rsi >= 70 ? 'BEARISH_REVERSAL' : 'POTENTIAL_REVERSAL';
    return {
      active: true, type,
      confidence: Math.min(95, confidence),
      triggers: signals,
      message: type === 'BULLISH_REVERSAL' ? 'Bullish reversal — price may bounce up'
        : type === 'BEARISH_REVERSAL' ? 'Bearish reversal — price may drop'
        : 'Potential trend change detected'
    };
  }

  _calcRSI(closes, period = 14) {
    if (closes.length < period + 1) return 50;
    let gains = 0, losses = 0;
    for (let i = closes.length - period; i < closes.length; i++) {
      const diff = closes[i] - closes[i - 1];
      if (diff > 0) gains += diff; else losses += Math.abs(diff);
    }
    const avgGain = gains / period;
    const avgLoss = losses / period;
    if (avgLoss === 0) return 100;
    return round(100 - (100 / (1 + avgGain / avgLoss)), 1);
  }

  _ema(data, period) {
    if (!data || data.length < period) return null;
    const k = 2 / (period + 1);
    let ema = data.slice(0, period).reduce((s, v) => s + v, 0) / period;
    for (let i = period; i < data.length; i++) ema = data[i] * k + ema * (1 - k);
    return ema;
  }
}

export const commodityService = new CommodityService();
