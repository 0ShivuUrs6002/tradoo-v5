export const round = (value, places = 4) => {
  if (!Number.isFinite(value)) return 0;
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
};

export const stdDev = (values) => {
  if (!values?.length) return 0;
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
};

export const normalize = (value, scale = 1) => {
  if (!Number.isFinite(value) || !Number.isFinite(scale) || scale === 0) return 0;
  return value / scale;
};

export const clamp = (value, min = -1, max = 1) => Math.min(max, Math.max(min, value));

// ─── Exponential Moving Average ────────────────────────────────────────────────
// Computes EMA over an array of numeric values.
// Returns an array of EMA values the same length as input.
export const computeEMA = (values, period) => {
  if (!values?.length || period < 1) return [];
  const k = 2 / (period + 1);
  const result = [values[0]];
  for (let i = 1; i < values.length; i++) {
    result.push(values[i] * k + result[i - 1] * (1 - k));
  }
  return result;
};

// ─── RSI (Relative Strength Index) ─────────────────────────────────────────────
// Standard Wilder's RSI. Returns a single RSI value (0-100) for the full series.
export const computeRSI = (closes, period = 14) => {
  if (!closes?.length || closes.length < period + 1) return 50; // neutral default
  const changes = [];
  for (let i = 1; i < closes.length; i++) {
    changes.push(closes[i] - closes[i - 1]);
  }

  let avgGain = 0;
  let avgLoss = 0;
  for (let i = 0; i < period; i++) {
    if (changes[i] > 0) avgGain += changes[i];
    else avgLoss += Math.abs(changes[i]);
  }
  avgGain /= period;
  avgLoss /= period;

  // Wilder's smoothing for remaining periods
  for (let i = period; i < changes.length; i++) {
    const gain = changes[i] > 0 ? changes[i] : 0;
    const loss = changes[i] < 0 ? Math.abs(changes[i]) : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
  }

  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return round(100 - (100 / (1 + rs)), 2);
};

// ─── MACD ──────────────────────────────────────────────────────────────────────
// Returns { macdLine, signalLine, histogram } as final values.
export const computeMACD = (closes, fast = 12, slow = 26, signal = 9) => {
  if (!closes?.length || closes.length < slow + signal) {
    return { macdLine: 0, signalLine: 0, histogram: 0 };
  }
  const emaFast = computeEMA(closes, fast);
  const emaSlow = computeEMA(closes, slow);
  const macdSeries = emaFast.map((v, i) => v - emaSlow[i]);
  const signalSeries = computeEMA(macdSeries, signal);

  const last = macdSeries.length - 1;
  const macdLine = round(macdSeries[last], 4);
  const signalLine = round(signalSeries[last], 4);
  return {
    macdLine,
    signalLine,
    histogram: round(macdLine - signalLine, 4)
  };
};

// ─── ATR (Average True Range) ──────────────────────────────────────────────────
// candles = [{ h, l, c }, ...]. Returns a single ATR value.
export const computeATR = (candles, period = 14) => {
  if (!candles?.length || candles.length < 2) return 0;
  const trueRanges = [];
  for (let i = 1; i < candles.length; i++) {
    const high = candles[i].h || candles[i].c || 0;
    const low = candles[i].l || candles[i].c || 0;
    const prevClose = candles[i - 1].c || 0;
    const tr = Math.max(
      high - low,
      Math.abs(high - prevClose),
      Math.abs(low - prevClose)
    );
    trueRanges.push(tr);
  }

  if (trueRanges.length < period) {
    // Not enough data, use simple average of what we have
    return round(trueRanges.reduce((s, v) => s + v, 0) / trueRanges.length, 2);
  }

  // Wilder's smoothing
  let atr = trueRanges.slice(0, period).reduce((s, v) => s + v, 0) / period;
  for (let i = period; i < trueRanges.length; i++) {
    atr = (atr * (period - 1) + trueRanges[i]) / period;
  }
  return round(atr, 2);
};

// ─── Adaptive Normalize ────────────────────────────────────────────────────────
// Normalizes value to [-1, +1] based on a rolling min/max range.
// Falls back to fixed scale if history is insufficient.
export const adaptiveNormalize = (value, history, fallbackScale = 1) => {
  if (!Number.isFinite(value)) return 0;
  if (!history?.length || history.length < 3) {
    return clamp(normalize(value, fallbackScale));
  }
  const min = Math.min(...history);
  const max = Math.max(...history);
  const range = max - min;
  if (range === 0) return 0;
  // Map to [-1, +1] where midpoint = 0
  const mid = (max + min) / 2;
  return clamp((value - mid) / (range / 2));
};
