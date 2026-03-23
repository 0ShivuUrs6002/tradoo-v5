import { round, clamp } from '../utils/math.js';

class PredictionEngine {
  /**
   * Multi-Timeframe Prediction System
   * Evaluates 15-minute, 30-minute, and 1-hour timelines separately.
   */
  run(analytics, indicators) {
    const {
      writer = 0,
      support = null,
      resistance = null,
      spot = 0,
      _normalized = {}
    } = analytics || {};

    const {
      rsiScore = 0,
      emaCrossSignal = 0,
      macdScore = 0,
      pcrScore = 0,
      ivSkewScore = 0,
      oiConcentration = 0,
      volumeSurge = 0,
      divergenceSignal = 0,
      momentum1m = 0,
      momentum5m = 0,
      momentum15m = 0
    } = indicators || {};

    const vwapDev = _normalized.vwapDev || 0;
    const gexSignal = _normalized.gex || 0;
    
    // Proximity to S/R
    let srScore = 0;
    if (support && resistance && spot > 0) {
      const distToSup = Math.abs(spot - (support.strike || spot));
      const distToRes = Math.abs((resistance.strike || spot) - spot);
      const totalRange = distToSup + distToRes;
      if (totalRange > 0) {
        srScore = clamp((distToRes - distToSup) / totalRange);
      }
    }

    // ─── 15-Minute Model ───────────────────────────────────────────────────
    // Focuses heavily on immediate short-term momentum, 1m/5m flow, and volume
    const m15_score = clamp(
      (0.35 * clamp(momentum5m * 2)) +
      (0.25 * vwapDev) +
      (0.20 * volumeSurge * Math.sign(momentum1m || 1)) +
      (0.20 * writer)
    );

    // ─── 30-Minute Model ───────────────────────────────────────────────────
    // Focuses heavily on MACD acceleration, 15m momentum, and RSI exhaustion
    const m30_score = clamp(
      (0.30 * macdScore) +
      (0.25 * clamp(momentum15m)) +
      (0.25 * writer) +
      (0.20 * rsiScore)
    );

    // ─── 1-Hour Model ──────────────────────────────────────────────────────
    // Focuses on EMA Crossovers, institutional positioning (PCR/GEX), and S/R
    const h1_score = clamp(
      (0.30 * emaCrossSignal) +
      (0.25 * pcrScore) +
      (0.20 * gexSignal) +
      (0.15 * srScore) +
      (0.10 * ivSkewScore)
    );

    // Helper to format as percentage (0-100)
    // Note: The raw score is usually -1 to +1. We need to convert it to a probability (0-1)
    // where 0.5 is neutral.
    const toPercent = (score) => round(clamp((score + 1) / 2) * 100, 1);

    const formatOutput = (scoreStr) => {
      const normalizedScore = scoreStr; // remains between -1 and +1
      let direction = 'FLAT';
      if (normalizedScore > 0.15) direction = 'BULLISH';
      else if (normalizedScore < -0.15) direction = 'BEARISH';
      
      return {
        score: round(normalizedScore, 4),    // Raw for internal math (-1 to +1)
        direction,
        probability: toPercent(normalizedScore) // Percentage 0% to 100%
      };
    };

    const pred15m = formatOutput(m15_score);
    const pred30m = formatOutput(m30_score);
    const pred1h = formatOutput(h1_score);

    // Aggregate direction
    const bullishCount = [pred15m, pred30m, pred1h].filter(p => p.direction === 'BULLISH').length;
    const bearishCount = [pred15m, pred30m, pred1h].filter(p => p.direction === 'BEARISH').length;
    let aggregateDirection = 'MIXED';
    if (bullishCount >= 2) aggregateDirection = 'BULLISH';
    else if (bearishCount >= 2) aggregateDirection = 'BEARISH';
    
    // Overall market score
    const avgScore = (m15_score + m30_score + h1_score) / 3;

    return {
      predictionScore: round(avgScore, 4),
      probability: toPercent(avgScore),
      direction: aggregateDirection,
      timeframes: {
        m15: pred15m,
        m30: pred30m,
        h1: pred1h
      },
      // Keep old signals structure so existing UI doesn't break until we refactor it
      signals: {
        emaCross: round(emaCrossSignal, 4),
        rsi: round(rsiScore, 4),
        macd: round(macdScore, 4),
        pcr: round(pcrScore, 4),
        writer: round(writer, 4),
        ivSkew: round(ivSkewScore, 4),
        gex: round(gexSignal, 4),
        vwapDev: round(vwapDev, 4),
        momentum: round(_normalized.momentum || 0, 4),
        srProximity: round(srScore, 4),
        oiConcentration: round(oiConcentration, 4),
        volumeSurge: round(volumeSurge, 4),
        divergence: round(divergenceSignal, 4)
      }
    };
  }
}

export const predictionEngine = new PredictionEngine();
