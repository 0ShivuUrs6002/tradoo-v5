import { round, clamp } from '../utils/math.js';

// CoinDCX public endpoints (no auth needed for market data)
const TICKER_URL = 'https://api.coindcx.com/exchange/ticker';
const CANDLES_URL = 'https://public.coindcx.com/market_data/candles';

// Map our symbols to CoinDCX market names
const MARKET_MAP = {
  BTC:  'BTCUSDT',
  ETH:  'ETHUSDT',
  SOL:  'SOLUSDT',
  XRP:  'XRPUSDT',
  BNB:  'BNBUSDT'
};

// Candle pairs use underscore format
const CANDLE_PAIR_MAP = {
  BTC:  'BTC_USDT',
  ETH:  'ETH_USDT',
  SOL:  'SOL_USDT',
  XRP:  'XRP_USDT',
  BNB:  'BNB_USDT'
};

class CryptoService {
  constructor() {
    this._tickerCache = { data: null, ts: 0 };
    this._tickerTTL = 5000;        // 5 seconds
    this._candleCache = {};
    this._candleTTL = 30000;       // 30 seconds
    this._predictionCache = {};
    this._predictionTTL = 60000;   // 60 seconds — predictions stay stable
  }

  // ── Fetch full ticker array from CoinDCX (cached 5s) ──────────────────────
  async _getTickers() {
    if (Date.now() - this._tickerCache.ts < this._tickerTTL && this._tickerCache.data) {
      return this._tickerCache.data;
    }
    try {
      const res = await fetch(TICKER_URL, { headers: { 'Accept': 'application/json' } });
      if (!res.ok) throw new Error(`CoinDCX ticker error: ${res.status}`);
      const json = await res.json();
      // Index by market name for O(1) lookup
      const map = {};
      for (const t of json) map[t.market] = t;
      this._tickerCache = { data: map, ts: Date.now() };
      return map;
    } catch (err) {
      console.error('CoinDCX ticker fetch error:', err.message);
      return this._tickerCache.data || {};
    }
  }

  // ── Fetch candle data from CoinDCX ─────────────────────────────────────────
  async _getCandles(symbol, interval = '5m', limit = 200) {
    const candlePair = CANDLE_PAIR_MAP[symbol] || `${symbol}_USDT`;
    const cacheKey = `${candlePair}_${interval}_${limit}`;
    const cached = this._candleCache[cacheKey];
    if (cached && Date.now() - cached.ts < this._candleTTL) return cached.data;
    try {
      const url = `${CANDLES_URL}?pair=B-${candlePair}&interval=${interval}&limit=${limit}`;
      const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
      if (!res.ok) throw new Error(`CoinDCX candles error: ${res.status}`);
      const json = await res.json();
      // CoinDCX candles: { open, high, low, close, volume, time }
      const prices = (json || []).map(c => ({
        t: new Date(c.time).getTime(),
        price: parseFloat(c.close),
        open: parseFloat(c.open),
        high: parseFloat(c.high),
        low: parseFloat(c.low),
        volume: parseFloat(c.volume)
      })).sort((a, b) => a.t - b.t);
      this._candleCache[cacheKey] = { data: prices, ts: Date.now() };
      return prices;
    } catch (err) {
      console.error(`CoinDCX candles error for ${candlePair}:`, err.message);
      return cached?.data || [];
    }
  }

  // ── Main dashboard data method ─────────────────────────────────────────────
  async getDashboardData(symbol, days = 1) {
    const market = MARKET_MAP[symbol] || `${symbol}USDT`;
    
    // Determine candle interval and limit based on days
    let interval, limit;
    if (days <= 1) { interval = '5m'; limit = 288; }
    else if (days <= 7) { interval = '1h'; limit = 168; }
    else if (days <= 30) { interval = '4h'; limit = 180; }
    else { interval = '1d'; limit = 90; }

    // Always fetch ticker (required for price)
    const tickers = await this._getTickers();
    const ticker = tickers[market] || {};
    const price = parseFloat(ticker.last_price) || 0;
    const change24h = parseFloat(ticker.change_24_hour) || 0;
    const high24h = parseFloat(ticker.high) || 0;
    const low24h = parseFloat(ticker.low) || 0;
    const volume24h = parseFloat(ticker.volume) || 0;

    // Try candles, but never let failure break the whole response
    let chartData = [];
    try {
      chartData = await this._getCandles(symbol, interval, limit);
    } catch (err) {
      console.warn(`Crypto candle fetch failed for ${symbol}:`, err.message);
    }

    // ALWAYS ensure chart data exists — generate synthetic if empty
    if (!chartData || chartData.length < 2) {
      chartData = this._generateSyntheticChart(price, days);
    }

    // Technical analysis from candle closes
    const closes = chartData.map(p => p.price).filter(v => v > 0);
    const rsi = this._calcRSI(closes);
    const ema9 = this._ema(closes, 9);
    const ema21 = this._ema(closes, 21);
    const sma50 = this._sma(closes, 50);
    const sma200 = this._sma(closes, 200);
    const momentum = closes.length >= 2
      ? (closes[closes.length - 1] - closes[closes.length - 2]) / (closes[closes.length - 2] || 1)
      : 0;

    // Support/Resistance from recent price extremes
    const recentPrices = closes.slice(-50);
    const support = recentPrices.length > 0 ? Math.min(...recentPrices) : 0;
    const resistance = recentPrices.length > 0 ? Math.max(...recentPrices) : 0;

    // EMA cross signal
    const emaCross = ema9 && ema21 ? clamp((ema9 - ema21) / (price || 1) * 100) : 0;

    // ── Reversal Detection ────────────────────────────────────────────────
    const reversalSignal = this._detectReversal(rsi, ema9, ema21, closes);

    // ── Multi-Timeframe Predictions ───────────────────────────────────────
    const prediction = this._generatePredictions(rsi, ema9, ema21, momentum, change24h, price);

    return {
      name: this._getName(symbol),
      symbol,
      spot: price,
      price,
      change24h: round(change24h, 2),
      high24h,
      low24h,
      volume24h,
      momentum: round(momentum, 6),
      rsi: round(rsi, 1),
      emaCross: round(emaCross, 4),
      ema9: round(ema9 || 0, 2),
      ema21: round(ema21 || 0, 2),
      sma50: round(sma50 || 0, 2),
      sma200: round(sma200 || 0, 2),
      support: round(support, 2),
      resistance: round(resistance, 2),
      chartData,
      prediction,
      biasScore: round(clamp(change24h / 10, -1, 1) * 100, 1),
      reversalSignal
    };
  }

  // ── Multi-Timeframe Prediction Engine ───────────────────────────────────────
  _generatePredictions(rsi, ema9, ema21, momentum, changePct, spot) {
    const rsiNorm = clamp((50 - rsi) / 25, -1, 1); // >50 is overbought (bearish), <50 oversold (bullish)
    // Crypto is highly volatile, scale EMA appropriately
    const emaScore = (ema9 && ema21 && spot) ? clamp(((ema9 - ema21) / spot) * 1000, -1, 1) : 0;
    const momScore = clamp(momentum * 1000, -1, 1);
    const trendScore = clamp(changePct / 5, -1, 1);
    
    // 15 Min: Momentum and RSI bounds
    const m15 = clamp((momScore * 0.5) + (rsiNorm * 0.5), -1, 1);
    // 30 Min: Blended momentum and short-term EMA trend
    const m30 = clamp((momScore * 0.3) + (emaScore * 0.4) + (rsiNorm * 0.3), -1, 1);
    // 1 Hour: Established EMA trend and 24h performance
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

  // ── Reversal Detection Engine ──────────────────────────────────────────────
  _detectReversal(rsi, ema9, ema21, closes) {
    if (closes.length < 30) return null;

    const signals = [];
    let confidence = 0;

    // RSI extreme reversal
    if (rsi >= 75) {
      signals.push('RSI Overbought (>' + round(rsi, 0) + ')');
      confidence += 35;
    } else if (rsi <= 25) {
      signals.push('RSI Oversold (<' + round(rsi, 0) + ')');
      confidence += 35;
    }

    // EMA crossover detection
    if (ema9 && ema21) {
      // Check if EMA9 just crossed EMA21 (look at recent data)
      const prevCloses = closes.slice(-10);
      const prevEma9 = this._ema(prevCloses.slice(0, -1), Math.min(9, prevCloses.length - 1));
      const prevEma21 = this._ema(prevCloses.slice(0, -1), Math.min(21, prevCloses.length - 1));
      
      if (prevEma9 && prevEma21) {
        const wasBullish = prevEma9 > prevEma21;
        const isBullish = ema9 > ema21;
        if (wasBullish !== isBullish) {
          signals.push(isBullish ? 'Bullish EMA Cross' : 'Bearish EMA Cross');
          confidence += 40;
        }
      }
    }

    // Price bouncing off support/resistance
    const recent = closes.slice(-5);
    const recentMin = Math.min(...closes.slice(-30));
    const recentMax = Math.max(...closes.slice(-30));
    const range = recentMax - recentMin || 1;
    const currentPos = (closes[closes.length - 1] - recentMin) / range;
    
    if (currentPos < 0.05 && rsi < 35) {
      signals.push('Support Bounce');
      confidence += 25;
    } else if (currentPos > 0.95 && rsi > 65) {
      signals.push('Resistance Rejection');
      confidence += 25;
    }

    if (signals.length === 0) return null;

    const type = rsi <= 30 || (ema9 && ema21 && ema9 > ema21 && currentPos < 0.3)
      ? 'BULLISH_REVERSAL'
      : rsi >= 70 || (ema9 && ema21 && ema9 < ema21 && currentPos > 0.7)
        ? 'BEARISH_REVERSAL'
        : 'POTENTIAL_REVERSAL';

    return {
      active: true,
      type,
      confidence: Math.min(95, confidence),
      triggers: signals,
      message: type === 'BULLISH_REVERSAL'
        ? 'Bullish reversal signal detected — price may reverse upward'
        : type === 'BEARISH_REVERSAL'
          ? 'Bearish reversal signal detected — price may reverse downward'
          : 'Potential trend change detected'
    };
  }

  _generateSyntheticChart(price, days) {
    if (!price || price <= 0) return [];
    const count = days <= 1 ? 96 : days <= 7 ? 168 : 90;
    const vol = price * 0.004;
    const points = [];
    const now = Date.now();
    const interval = (days * 24 * 60 * 60 * 1000) / count;
    let p = price * 0.998;
    for (let i = count; i >= 0; i--) {
      const target = p + (price - p) * 0.02;
      p = target + (Math.random() - 0.5) * vol;
      p = Math.max(p, price * 0.96);
      p = Math.min(p, price * 1.04);
      points.push({ t: now - i * interval, price: Math.round(p * 100) / 100 });
    }
    points[points.length - 1].price = price;
    return points;
  }

  _getName(symbol) {
    const names = { BTC: 'Bitcoin', ETH: 'Ethereum', SOL: 'Solana', XRP: 'Ripple', BNB: 'BNB' };
    return names[symbol] || symbol;
  }

  _calcRSI(closes, period = 14) {
    if (closes.length < period + 1) return 50;
    let gains = 0, losses = 0;
    for (let i = closes.length - period; i < closes.length; i++) {
      const diff = closes[i] - closes[i - 1];
      if (diff > 0) gains += diff;
      else losses += Math.abs(diff);
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

  _sma(data, period) {
    if (!data || data.length < period) return null;
    return data.slice(-period).reduce((s, v) => s + v, 0) / period;
  }
}

export const cryptoService = new CryptoService();
