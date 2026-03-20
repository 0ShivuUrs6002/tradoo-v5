import { normalize, round } from '../utils/math.js';

class PredictionEngine {
  run(analytics) {
    const {
      biasScore = 0,
      momentum = 0,
      shortMomentum = 0,
      gex = 0,
      liquidity = 0,
      volatility = 0,
      spot = 0,
      vwap = 0
    } = analytics;

    const predictionScore = round(
      (0.25 * (biasScore || 0)) +
      (0.20 * normalize(momentum, 100)) +
      (0.20 * normalize(gex, 100000)) +
      (0.15 * normalize(liquidity, 1000000)) +
      (0.10 * normalize(volatility, 100)) +
      (0.10 * normalize(spot - vwap, 100)),
      4
    );

    let direction = 'NEUTRAL';
    if (predictionScore > 0.2) direction = 'BULLISH';
    else if (predictionScore < -0.2) direction = 'BEARISH';

    const absScore = Math.abs(predictionScore);
    let confidenceLabel = 'LOW';
    if (absScore >= 0.5) confidenceLabel = 'HIGH';
    else if (absScore >= 0.25) confidenceLabel = 'MEDIUM';

    return {
      predictionScore,
      direction,
      confidence: round(Math.min(1, absScore), 4),
      confidenceLabel,
      inputs: {
        bias: round(biasScore || 0, 4),
        momentum: round(normalize(momentum, 100), 4),
        gex: round(normalize(gex, 100000), 4),
        liquidity: round(normalize(liquidity, 1000000), 4),
        volatility: round(normalize(volatility, 100), 4),
        vwapDeviation: round(normalize(spot - vwap, 100), 4)
      }
    };
  }
}

export const predictionEngine = new PredictionEngine();
