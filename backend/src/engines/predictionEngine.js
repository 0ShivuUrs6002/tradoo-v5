import { normalize, round } from '../utils/math.js';

class PredictionEngine {
  run(analytics) {
    const predictionScore = round(
      (0.25 * analytics.biasScore) +
      (0.2 * normalize(analytics.momentum, 100)) +
      (0.2 * normalize(analytics.gex, 100000)) +
      (0.15 * normalize(analytics.liquidity, 1000000)) +
      (0.1 * normalize(analytics.volatility, 100)) +
      (0.1 * normalize(analytics.spot - analytics.vwap, 100))
    );

    let direction = 'NEUTRAL';
    if (predictionScore > 0.2) direction = 'BULLISH';
    else if (predictionScore < -0.2) direction = 'BEARISH';

    return {
      predictionScore,
      direction,
      confidence: Math.min(1, Math.abs(predictionScore))
    };
  }
}

export const predictionEngine = new PredictionEngine();
