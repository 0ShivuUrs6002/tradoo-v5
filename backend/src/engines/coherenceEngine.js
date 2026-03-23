import { normalize, round, clamp } from '../utils/math.js';

class CoherenceEngine {
  /**
   * Priority stack: Technical indicators > Price > GEX > Flow
   * Uses RSI and MACD to strengthen signal validation.
   */
  run({ analytics, prediction, indicators }) {
    const {
      spot = 0,
      vwap = 0,
      gex = 0,
      momentum = 0,
      writer = 0,
      _normalized = {}
    } = analytics;

    const ind = indicators || {};

    // Use adaptively normalized values when available
    const priceSignal = _normalized.vwapDev || normalize(spot - vwap, 100);
    const gexSignal = _normalized.gex || normalize(gex, 100000);
    const momentumSignal = _normalized.momentum || normalize(momentum, 100);
    const flowSignal = writer || 0;

    // Technical indicator signals
    const rsiSignal = ind.rsiScore || 0;
    const macdSignal = ind.macdScore || 0;
    const emaSignal = ind.emaCrossSignal || 0;
    const pcrSignal = ind.pcrScore || 0;

    // Weighted combination with technical indicators getting priority
    const weighted =
      (0.20 * emaSignal) +      // EMA crossover (trend)
      (0.15 * rsiSignal) +      // RSI (momentum exhaustion)
      (0.15 * macdSignal) +     // MACD (momentum acceleration)
      (0.15 * priceSignal) +    // Price vs VWAP
      (0.15 * gexSignal) +      // GEX
      (0.10 * momentumSignal) + // Raw momentum
      (0.10 * flowSignal);       // Writer flow

    // All signals for dominance detection
    const signals = [
      { name: 'ema', value: emaSignal, priority: 1 },
      { name: 'rsi', value: rsiSignal, priority: 2 },
      { name: 'macd', value: macdSignal, priority: 3 },
      { name: 'price', value: priceSignal, priority: 4 },
      { name: 'gex', value: gexSignal, priority: 5 },
      { name: 'pcr', value: pcrSignal, priority: 6 },
      { name: 'momentum', value: momentumSignal, priority: 7 },
      { name: 'flow', value: flowSignal, priority: 8 }
    ];

    // Find the dominant signal
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

    // Count agreements for coherence quality
    const bullishSignals = signals.filter(s => s.value > 0.05).length;
    const bearishSignals = signals.filter(s => s.value < -0.05).length;
    const agreeing = Math.max(bullishSignals, bearishSignals);
    const coherenceQuality = round(agreeing / signals.length, 4);

    return {
      coherentDirection,
      coherenceScore: round(weighted, 4),
      dominantSignal: dominant.name,
      coherenceQuality,
      signalBreakdown: {
        ema: round(emaSignal, 4),
        rsi: round(rsiSignal, 4),
        macd: round(macdSignal, 4),
        price: round(priceSignal, 4),
        gex: round(gexSignal, 4),
        pcr: round(pcrSignal, 4),
        momentum: round(momentumSignal, 4),
        flow: round(flowSignal, 4)
      }
    };
  }
}

export const coherenceEngine = new CoherenceEngine();
