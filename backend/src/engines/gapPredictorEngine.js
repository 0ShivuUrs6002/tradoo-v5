import { clamp, round } from '../utils/math.js';

class GapPredictorEngine {
  /**
   * Predicts the next morning's opening gap direction based on EOD (End of Day) momentum,
   * option writer activity, and PCR skew.
   */
  run(analytics, indicators, meta) {
    const { 
      momentum = 0, 
      writer = 0, 
      _normalized = {} 
    } = analytics || {};
    
    const { 
      pcr = 1, 
      macd = { histogram: 0 }, 
      emaCrossSignal = 0,
      ivSkew = 0
    } = indicators || {};

    const { candles = [] } = meta || {};

    let gapScore = 0; // Negative = Gap Down, Positive = Gap Up

    // 1. Late Momentum (Weight: 35%)
    // Did they buy or sell into the close?
    if (_normalized.momentum) {
      gapScore += _normalized.momentum * 0.35;
    }

    // 2. Put-Call Ratio Skew (Weight: 25%)
    // High PCR means put writers are confident -> Bullish gap
    // Low PCR means call writers are confident -> Bearish gap
    let pcrImpact = 0;
    if (pcr >= 1.4) pcrImpact = 0.5; // Extreme bullish
    else if (pcr >= 1.2) pcrImpact = 0.2; 
    else if (pcr <= 0.6) pcrImpact = -0.5; // Extreme bearish
    else if (pcr <= 0.8) pcrImpact = -0.2;
    
    gapScore += pcrImpact * 0.25;

    // 3. Option Writer Flow (Weight: 25%)
    // Tracks net pressure of Puts sold vs Calls sold
    const writerImpact = clamp(writer * 2, -1, 1);
    gapScore += writerImpact * 0.25;

    // 4. Institutional Fear Gauge (IV Skew) (Weight: 15%)
    // Positive skew = puts expensive = fear
    const skewImpact = clamp(ivSkew * 2, -1, 1);
    gapScore += skewImpact * 0.15;

    // Final gap probability and direction
    let direction = 'FLAT';
    let probability = 0; // 0 to 1

    // Increased threshold to 0.40 to guarantee only massive imbalances trigger a gap prediction
    if (gapScore >= 0.40) {
      direction = 'GAP_UP';
      probability = clamp(gapScore * 1.5, 0, 1);
    } else if (gapScore <= -0.40) {
      direction = 'GAP_DOWN';
      probability = clamp(Math.abs(gapScore) * 1.5, 0, 1);
    } else {
      direction = 'FLAT';
      // Probability of staying flat is inverse of the directional strength
      probability = clamp(1 - Math.abs(gapScore * 2), 0, 1);
    }

    // Determine signals contributing to the gap prediction
    const signals = [
      { name: 'Late Momentum', value: round(_normalized.momentum || 0, 3) },
      { name: 'PCR Skew', value: round(pcrImpact, 3) },
      { name: 'Writer Flow', value: round(writerImpact, 3) },
      { name: 'IV Skew', value: round(skewImpact, 3) }
    ];

    return {
      direction,
      probability: round(probability, 4),
      score: round(gapScore, 4), // raw score for UI bar
      signals
    };
  }
}

export const gapPredictorEngine = new GapPredictorEngine();
