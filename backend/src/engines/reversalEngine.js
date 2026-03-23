import { round, clamp } from '../utils/math.js';

class ReversalEngine {
  /**
   * Detects major market reversals by analyzing divergences, volume spikes, and OI walls.
   * Outputs a probability score (0-1) and specific warning flags.
   */
  run(analytics, indicators, meta) {
    const { spot = 0, support, resistance } = analytics;
    const { rsi = 50, macd, volumeSurge = 0, divergenceSignal = 0 } = indicators || {};
    const { candles = [] } = meta || {};

    let reversalScore = 0;
    const warnings = [];
    let direction = 'NONE'; // 'BULLISH', 'BEARISH', 'NONE'

    // 1. Extreme RSI + Divergence (Weight: 40%)
    if (rsi >= 80) { // Tightened from 75 to 80
      if (divergenceSignal < 0 && macd?.histogram < 0) { // Added MACD confirmation
        warnings.push('CRITICAL BEARISH DIVERGENCE (RSI > 80 + MACD Cross)');
        reversalScore += 0.45;
        direction = 'BEARISH';
      } else {
        warnings.push('EXTREME OVERBOUGHT (RSI > 80)');
        reversalScore += 0.2;
      }
    } else if (rsi <= 20) { // Tightened from 25 to 20
      if (divergenceSignal > 0 && macd?.histogram > 0) { // Added MACD confirmation
        warnings.push('CRITICAL BULLISH DIVERGENCE (RSI < 20 + MACD Cross)');
        reversalScore += 0.45;
        direction = 'BULLISH';
      } else {
        warnings.push('EXTREME OVERSOLD (RSI < 20)');
        reversalScore += 0.2;
      }
    }

    // 2. Volume Exhaustion / Spike (Weight: 30%)
    if (volumeSurge >= 1.0) { // Tightened to 100% volume surge
      const recentCandles = candles.slice(-3);
      const isPushingHigh = recentCandles.length === 3 && recentCandles.every(c => c.c >= (c.o || c.c));
      const isPushingLow = recentCandles.length === 3 && recentCandles.every(c => c.c <= (c.o || c.c));

      if (isPushingHigh && rsi > 70) {
        warnings.push('BUYING EXHAUSTION (100%+ Volume Spike at Highs)');
        reversalScore += 0.35;
        direction = 'BEARISH';
      } else if (isPushingLow && rsi < 30) {
        warnings.push('SELLING EXHAUSTION (100%+ Volume Spike at Lows)');
        reversalScore += 0.35;
        direction = 'BULLISH';
      }
    }

    // 3. Option Wall Rejections (Support / Resistance Hits) (Weight: 25%)
    if (spot > 0 && support?.strike && resistance?.strike) {
      const distToRes = Math.abs((resistance.strike) - spot) / spot;
      const distToSup = Math.abs(spot - (support.strike)) / spot;

      // Tightened: within 0.05% of major resistance + negative MACD + high RSI
      if (distToRes <= 0.0005 && macd?.histogram < 0 && rsi > 55) {
        warnings.push('HARD REJECTION AT MAJOR RESISTANCE');
        reversalScore += 0.4;
        direction = 'BEARISH';
      }
      // Tightened: within 0.05% of major support + positive MACD + low RSI
      else if (distToSup <= 0.0005 && macd?.histogram > 0 && rsi < 45) {
        warnings.push('HARD BOUNCE AT MAJOR SUPPORT');
        reversalScore += 0.4;
        direction = 'BULLISH';
      }
    }

    // Ensure score is capped
    const finalScore = clamp(reversalScore, 0, 1);
    
    // Increased threshold for a "Major Reversal" warning from 0.6 to 0.85 to weed out noise
    const isMajorReversal = finalScore >= 0.85;

    return {
      probability: round(finalScore, 4), // 0 to 1
      isMajorReversal,
      direction: isMajorReversal ? direction : 'NONE',
      warnings: [...new Set(warnings)], // unique warnings
    };
  }
}

export const reversalEngine = new ReversalEngine();
