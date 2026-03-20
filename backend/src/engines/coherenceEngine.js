import { round } from '../utils/math.js';

class CoherenceEngine {
  run({ analytics, prediction }) {
    const priceSignal = analytics.spot - analytics.vwap;
    const gexSignal = analytics.gex;
    const momentumSignal = analytics.momentum;
    const flowSignal = analytics.writer;

    const weighted = (0.4 * priceSignal) + (0.3 * gexSignal / 1000) + (0.2 * momentumSignal) + (0.1 * flowSignal * 100);

    const coherentDirection = weighted > 0 ? 'BULLISH' : weighted < 0 ? 'BEARISH' : 'NEUTRAL';
    const finalDirection = Math.abs(weighted) > 0.1 ? coherentDirection : prediction.direction;

    return {
      coherentDirection: finalDirection,
      coherenceScore: round(weighted / 100)
    };
  }
}

export const coherenceEngine = new CoherenceEngine();
