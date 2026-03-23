import { computeRSI, computeMACD, computeATR, computeEMA, round, clamp } from '../utils/math.js';

class IndicatorEngine {
  constructor() {
    // Rolling histories for adaptive normalization
    this.gexHistory = [];
    this.momentumHistory = [];
    this.liquidityHistory = [];
    this.volatilityHistory = [];
    this.historyLimit = 60;
  }

  _pushHistory(arr, value) {
    arr.push(value);
    if (arr.length > this.historyLimit) arr.shift();
  }

  /**
   * Compute all technical indicators from raw snapshot data.
   * @param {Object} params
   * @param {Array}  params.candles - Array of { t, o, h, l, c, v }
   * @param {Array}  params.optionChainRows - Smoothed option chain rows
   * @param {number} params.spot - Current spot price
   * @returns {Object} All computed indicator values
   */
  compute({ candles, optionChainRows, spot }) {
    const closes = (candles || []).map(c => c.c).filter(v => v > 0);

    // ─── RSI-14 ──────────────────────────────────────────────────────────
    const rsi = computeRSI(closes, 14);

    // RSI scoring: -1 (overbought, bearish signal) to +1 (oversold, bullish signal)
    let rsiScore = 0;
    if (rsi >= 80) rsiScore = -1.0;        // Extremely overbought
    else if (rsi >= 70) rsiScore = -0.7;   // Overbought
    else if (rsi >= 60) rsiScore = -0.2;   // Slightly overbought
    else if (rsi <= 20) rsiScore = 1.0;    // Extremely oversold
    else if (rsi <= 30) rsiScore = 0.7;    // Oversold
    else if (rsi <= 40) rsiScore = 0.2;    // Slightly oversold
    // 40-60 = neutral (rsiScore stays 0)

    // ─── EMA Crossover (9/21) ────────────────────────────────────────────
    let emaCrossSignal = 0;
    let ema9Value = 0;
    let ema21Value = 0;
    if (closes.length >= 21) {
      const ema9 = computeEMA(closes, 9);
      const ema21 = computeEMA(closes, 21);
      ema9Value = round(ema9[ema9.length - 1], 2);
      ema21Value = round(ema21[ema21.length - 1], 2);
      const diff = ema9Value - ema21Value;
      const diffPct = spot > 0 ? (diff / spot) * 100 : 0;
      // Scale crossover signal: ±0.1% of spot = ±1.0
      emaCrossSignal = clamp(diffPct * 10);
    }

    // ─── MACD (12/26/9) ──────────────────────────────────────────────────
    const macd = computeMACD(closes, 12, 26, 9);
    let macdScore = 0;
    if (spot > 0 && macd.histogram !== 0) {
      // Normalize histogram relative to spot price
      const histPct = (macd.histogram / spot) * 10000;
      macdScore = clamp(histPct / 5); // ±5 basis points = ±1
    }

    // ─── ATR-14 ──────────────────────────────────────────────────────────
    const atr = computeATR(candles || [], 14);

    // ─── Put-Call Ratio ──────────────────────────────────────────────────
    const rows = optionChainRows || [];
    const totalCallOI = rows.reduce((sum, r) => sum + (r.callOI || 0), 0);
    const totalPutOI = rows.reduce((sum, r) => sum + (r.putOI || 0), 0);
    const pcr = totalCallOI > 0 ? round(totalPutOI / totalCallOI, 4) : 1;
    // PCR scoring: PCR > 1.2 = put heavy = contrarian bullish; PCR < 0.8 = call heavy = contrarian bearish
    let pcrScore = 0;
    if (pcr >= 1.5) pcrScore = 1.0;       // Very high PCR = strong bullish (contrarian)
    else if (pcr >= 1.2) pcrScore = 0.5;   // Moderately high PCR = bullish
    else if (pcr >= 0.8) pcrScore = 0;     // Neutral
    else if (pcr >= 0.5) pcrScore = -0.5;  // Low PCR = bearish
    else pcrScore = -1.0;                   // Very low = strong bearish

    // ─── IV Skew ─────────────────────────────────────────────────────────
    // Compare ATM put premium vs ATM call premium
    let ivSkew = 0;
    let ivSkewScore = 0;
    if (rows.length > 0 && spot > 0) {
      // Find ATM strike
      const sortedByDist = [...rows].sort((a, b) => Math.abs(a.strike - spot) - Math.abs(b.strike - spot));
      const atm = sortedByDist[0];
      if (atm) {
        const callPrem = atm.callLtp || 0;
        const putPrem = atm.putLtp || 0;
        if (callPrem > 0 && putPrem > 0) {
          // IV skew = (put premium / call premium) - 1
          // Positive = puts expensive (fear = bullish contrarian)
          // Negative = calls expensive (greed = bearish contrarian)
          ivSkew = round((putPrem / callPrem) - 1, 4);
          ivSkewScore = clamp(ivSkew * 2); // Scale: ±0.5 ratio diff = ±1
        }
      }
    }

    // ─── OI Concentration Signal ─────────────────────────────────────────
    // Measures where the heaviest OI is relative to spot
    let oiConcentration = 0;
    if (rows.length > 0 && spot > 0) {
      let weightedCallStrike = 0;
      let weightedPutStrike = 0;
      if (totalCallOI > 0) {
        weightedCallStrike = rows.reduce((sum, r) => sum + r.strike * (r.callOI || 0), 0) / totalCallOI;
      }
      if (totalPutOI > 0) {
        weightedPutStrike = rows.reduce((sum, r) => sum + r.strike * (r.putOI || 0), 0) / totalPutOI;
      }
      // If call OI center is far above spot = resistance above = bullish room
      // If put OI center is far below spot = support below = bullish
      const callDist = weightedCallStrike > 0 ? (weightedCallStrike - spot) / spot : 0;
      const putDist = weightedPutStrike > 0 ? (spot - weightedPutStrike) / spot : 0;
      // Positive = more room to go up, negative = more room to go down
      oiConcentration = clamp((callDist + putDist) * 50);
    }

    // ─── Volume Surge Detection ──────────────────────────────────────────
    let volumeSurge = 0;
    if (candles && candles.length >= 10) {
      const recentVols = candles.slice(-5).map(c => c.v || 0);
      const olderVols = candles.slice(-10, -5).map(c => c.v || 0);
      const recentAvg = recentVols.reduce((s, v) => s + v, 0) / recentVols.length;
      const olderAvg = olderVols.reduce((s, v) => s + v, 0) / olderVols.length;
      if (olderAvg > 0) {
        volumeSurge = clamp((recentAvg / olderAvg) - 1); // 0 = normal, +1 = doubled
      }
    }

    // ─── Multi-timeframe Momentum ────────────────────────────────────────
    const momentum1m = closes.length >= 2 ? round(closes[closes.length - 1] - closes[closes.length - 2], 2) : 0;
    const momentum5m = closes.length >= 6 ? round(closes[closes.length - 1] - closes[Math.max(0, closes.length - 6)], 2) : 0;
    const momentum15m = closes.length >= 16 ? round(closes[closes.length - 1] - closes[Math.max(0, closes.length - 16)], 2) : 0;

    // ─── Price-RSI Divergence Detection ──────────────────────────────────
    let divergenceSignal = 0;
    if (closes.length >= 20) {
      const recentCloses = closes.slice(-10);
      const olderCloses = closes.slice(-20, -10);
      const recentHigh = Math.max(...recentCloses);
      const olderHigh = Math.max(...olderCloses);
      const recentRSI = computeRSI(closes.slice(-15), 14);
      const olderRSI = computeRSI(closes.slice(-25, -10), 14);

      // Bearish divergence: price making higher highs, RSI making lower highs
      if (recentHigh > olderHigh && recentRSI < olderRSI - 5) {
        divergenceSignal = -0.5; // Bearish divergence
      }
      // Bullish divergence: price making lower lows, RSI making higher lows
      const recentLow = Math.min(...recentCloses);
      const olderLow = Math.min(...olderCloses);
      if (recentLow < olderLow && recentRSI > olderRSI + 5) {
        divergenceSignal = 0.5; // Bullish divergence
      }
    }

    return {
      // Raw indicator values
      rsi,
      ema9: ema9Value,
      ema21: ema21Value,
      macd,
      atr,
      pcr,
      ivSkew,

      // Signal scores (all [-1, +1])
      rsiScore,
      emaCrossSignal,
      macdScore,
      pcrScore,
      ivSkewScore,
      oiConcentration,
      volumeSurge,
      divergenceSignal,

      // Multi-timeframe momentum
      momentum1m,
      momentum5m,
      momentum15m,

      // Histories for adaptive normalization
      gexHistory: [...this.gexHistory],
      momentumHistory: [...this.momentumHistory],
      liquidityHistory: [...this.liquidityHistory],
      volatilityHistory: [...this.volatilityHistory]
    };
  }

  /**
   * Update rolling histories with current cycle values.
   */
  updateHistories({ gex, momentum, liquidity, volatility }) {
    this._pushHistory(this.gexHistory, gex);
    this._pushHistory(this.momentumHistory, momentum);
    this._pushHistory(this.liquidityHistory, liquidity);
    this._pushHistory(this.volatilityHistory, volatility);
  }
}

export const indicatorEngine = new IndicatorEngine();
