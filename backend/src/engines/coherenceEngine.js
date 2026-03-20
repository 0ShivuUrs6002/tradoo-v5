import { normalize, round } from '../utils/math.js';

class CoherenceEngine {
  /**
   * Priority stack: price > GEX > momentum > flow
   * Stronger signal overrides weaker conflicting signals.
   */
  run({ analytics, prediction }) {
    const {
      spot = 0,
      vwap = 0,
      gex = 0,
      momentum = 0,
      writer = 0
    } = analytics;

    // Normalize each signal to [-1, +1]
    const priceSignal = normalize(spot - vwap, 100);
    const gexSignal = normalize(gex, 100000);
    const momentumSignal = normalize(momentum, 100);
    const flowSignal = writer || 0;

    // Weighted combination — priority order: price 40%, gex 30%, momentum 20%, flow 10%
    const weighted =
      (0.40 * priceSignal) +
      (0.30 * gexSignal) +
      (0.20 * momentumSignal) +
      (0.10 * flowSignal);

    // Override logic: if price is strongly directional, it overrides weak signals
    const signals = [
      { name: 'price', value: priceSignal, priority: 1 },
      { name: 'gex', value: gexSignal, priority: 2 },
      { name: 'momentum', value: momentumSignal, priority: 3 },
      { name: 'flow', value: flowSignal, priority: 4 }
    ];

    // Find the dominant signal (strongest absolute value, highest priority for ties)
    const dominant = signals.reduce((best, sig) => {
      if (Math.abs(sig.value) > Math.abs(best.value) + 0.05) return sig;
      if (Math.abs(sig.value) >= Math.abs(best.value) - 0.05 && sig.priority < best.priority) return sig;
      return best;
    }, signals[0]);

    let coherentDirection = 'NEUTRAL';
    if (weighted > 0.05) coherentDirection = 'BULLISH';
    else if (weighted < -0.05) coherentDirection = 'BEARISH';

    // Use prediction direction as tiebreaker for near-neutral zones
    if (Math.abs(weighted) <= 0.05) {
      coherentDirection = prediction.direction || 'NEUTRAL';
    }

    return {
      coherentDirection,
      coherenceScore: round(weighted, 4),
      dominantSignal: dominant.name,
      signalBreakdown: {
        price: round(priceSignal, 4),
        gex: round(gexSignal, 4),
        momentum: round(momentumSignal, 4),
        flow: round(flowSignal, 4)
      }
    };
  }
}

export const coherenceEngine = new CoherenceEngine();
