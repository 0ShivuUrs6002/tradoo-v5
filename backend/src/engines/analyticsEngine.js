import { clamp, normalize, round, stdDev, adaptiveNormalize } from '../utils/math.js';

const proximity = (strike, spot) => 1 / (1 + Math.abs(strike - spot) / 50);

export class AnalyticsEngine {
  constructor() {
    this.lockedSupport = null;
    this.lockedResistance = null;
    this.lockedAt = 0;
  }

  computeVWAP(candles) {
    if (!candles || !candles.length) return 0;
    const result = candles.reduce((acc, c) => {
      const typical = ((c.h || c.c || 0) + (c.l || c.c || 0) + (c.c || 0)) / 3;
      const vol = c.v || 0;
      acc.pv += typical * vol;
      acc.v += vol;
      return acc;
    }, { pv: 0, v: 0 });
    return result.v > 0 ? result.pv / result.v : 0;
  }

  writerSignal(rows) {
    if (!rows || !rows.length) return 0;
    const values = rows.map((row) => {
      const callPressure = (row.callOIChange || 0) + (row.callVolume || 0) * 0.01;
      const putPressure = (row.putOIChange || 0) + (row.putVolume || 0) * 0.01;
      return putPressure - callPressure;
    });
    const avg = values.reduce((sum, v) => sum + v, 0) / values.length;
    return clamp(normalize(avg, 1000));
  }

  writerRelationLabel(writer) {
    if (writer > 0.15) return 'BULLISH_WRITERS';
    if (writer < -0.15) return 'BEARISH_WRITERS';
    return 'BALANCED';
  }

  buyerSellerRatio(rows, spotNow, spotPrev) {
    if (!rows || !rows.length) return 'BALANCED';
    const priceUp = (spotNow || 0) >= (spotPrev || spotNow || 0);
    let buyerScore = 0;
    let sellerScore = 0;

    for (const row of rows) {
      const oiRise = (row.callOIChange || 0) + (row.putOIChange || 0) > 0;
      if (priceUp && oiRise) buyerScore += 1;
      else if (!priceUp && oiRise) sellerScore += 1;
    }

    if (buyerScore > sellerScore * 1.2) return 'BUYER_DOMINANT';
    if (sellerScore > buyerScore * 1.2) return 'SELLER_DOMINANT';
    return 'BALANCED';
  }

  findSupportResistance(rows, spot) {
    if (!rows || !rows.length) return { support: null, resistance: null };

    const sortedByDistance = [...rows].sort((a, b) => Math.abs(a.strike - spot) - Math.abs(b.strike - spot));
    const atm = sortedByDistance[0]?.strike || spot;
    const stepSize = rows.length > 1
      ? Math.abs((rows[1]?.strike || atm + 50) - (rows[0]?.strike || atm))
      : 50;
    const range = 10 * stepSize;
    const inRange = rows.filter((row) => row.strike >= (atm - range) && row.strike <= (atm + range));

    if (!inRange.length) return { support: null, resistance: null };

    const maxPutOI = Math.max(...inRange.map((r) => r.putOI || 0)) || 1;
    const maxCallOI = Math.max(...inRange.map((r) => r.callOI || 0)) || 1;
    const maxPutOIChange = Math.max(...inRange.map((r) => Math.abs(r.putOIChange || 0))) || 1;
    const maxCallOIChange = Math.max(...inRange.map((r) => Math.abs(r.callOIChange || 0))) || 1;
    const maxPutVol = Math.max(...inRange.map((r) => r.putVolume || 0)) || 1;
    const maxCallVol = Math.max(...inRange.map((r) => r.callVolume || 0)) || 1;

    const withScores = inRange.map((row) => {
      const prox = proximity(row.strike, spot);
      const supportScore =
        0.4 * ((row.putOIChange || 0) / maxPutOIChange) +
        0.3 * ((row.putOI || 0) / maxPutOI) +
        0.2 * ((row.putVolume || 0) / maxPutVol) +
        0.1 * prox;

      const resistanceScore =
        0.4 * ((row.callOIChange || 0) / maxCallOIChange) +
        0.3 * ((row.callOI || 0) / maxCallOI) +
        0.2 * ((row.callVolume || 0) / maxCallVol) +
        0.1 * prox;

      return { ...row, prox, supportScore, resistanceScore };
    });

    const supportCandidates = [...withScores].sort((a, b) => b.supportScore - a.supportScore);
    const resistanceCandidates = [...withScores].sort((a, b) => b.resistanceScore - a.resistanceScore);

    const bestSupport = supportCandidates.find((r) => r.strike <= spot) || supportCandidates[0] || null;
    const bestResistance = resistanceCandidates.find((r) => r.strike >= spot) || resistanceCandidates[0] || null;

    return { support: bestSupport, resistance: bestResistance };
  }

  applyStabilityLock(currentSupport, currentResistance) {
    const now = Date.now();

    if (!this.lockedSupport || !this.lockedResistance) {
      this.lockedSupport = currentSupport;
      this.lockedResistance = currentResistance;
      this.lockedAt = now;
      return { support: currentSupport, resistance: currentResistance };
    }

    const lockActive = (now - this.lockedAt) < (2 * 60 * 1000);
    if (lockActive) {
      const strongerSupport = (currentSupport?.supportScore || 0) > (this.lockedSupport?.supportScore || 0) * 1.2;
      const strongerResistance = (currentResistance?.resistanceScore || 0) > (this.lockedResistance?.resistanceScore || 0) * 1.2;
      if (!strongerSupport) currentSupport = this.lockedSupport;
      if (!strongerResistance) currentResistance = this.lockedResistance;
    } else {
      this.lockedAt = now;
    }

    this.lockedSupport = currentSupport;
    this.lockedResistance = currentResistance;
    return { support: currentSupport, resistance: currentResistance };
  }

  run({ snapshotBuffer, smoothed, indicators }) {
    const snapshots = snapshotBuffer.getAll();
    if (!snapshots.length) return this._empty();

    const current = snapshots[snapshots.length - 1];
    const fiveMinAgo = snapshots.find((s) => (current.timestamp - s.timestamp) >= 5 * 60 * 1000) || snapshots[0] || current;
    const oneMinAgo = snapshots.find((s) => (current.timestamp - s.timestamp) >= 60 * 1000) || snapshots[0] || current;

    const spot = smoothed.smoothedSpot || current.spot?.ltp || 0;
    const prices = snapshots.map((s) => s.spot?.ltp || 0).filter((v) => v > 0).slice(-60);

    const momentum = round(spot - (fiveMinAgo?.spot?.ltp || spot), 2);
    const shortMomentum = round(spot - (oneMinAgo?.spot?.ltp || spot), 2);
    const vwap = round(this.computeVWAP(current.candles || []), 2);
    const volatility = round(stdDev(prices), 2);

    const gex = round(smoothed.smoothedRows.reduce((sum, row) => sum + ((row.callOI || 0) - (row.putOI || 0)), 0), 0);

    const srRaw = this.findSupportResistance(smoothed.smoothedRows, spot);
    const srStable = this.applyStabilityLock(srRaw.support, srRaw.resistance);

    const writer = this.writerSignal(smoothed.smoothedRows);
    const writerRelation = this.writerRelationLabel(writer);
    const liquidity = (current.spot?.volume || 0) + (current.futures?.volume || 0);

    const buyerSeller = this.buyerSellerRatio(smoothed.smoothedRows, spot, fiveMinAgo?.spot?.ltp);

    // Use adaptive normalization with rolling histories from indicator engine
    const normMomentum = indicators
      ? adaptiveNormalize(momentum, indicators.momentumHistory, 100)
      : normalize(momentum, 100);
    const normGex = indicators
      ? adaptiveNormalize(gex, indicators.gexHistory, 100000)
      : normalize(gex, 100000);
    const normVwapDev = indicators?.atr > 0
      ? clamp((spot - vwap) / indicators.atr)  // ATR-relative VWAP deviation
      : normalize(spot - vwap, 100);
    const normLiquidity = indicators
      ? adaptiveNormalize(liquidity, indicators.liquidityHistory, 1000000)
      : normalize(liquidity, 1000000);
    const normVolatility = indicators
      ? adaptiveNormalize(volatility, indicators.volatilityHistory, 100)
      : normalize(volatility, 100);

    const biasScore = round(
      (0.30 * normMomentum) +
      (0.25 * normVwapDev) +
      (0.25 * normGex) +
      (0.20 * writer),
      4
    );

    const prox = proximity(srStable.support?.strike || spot, spot);
    const breakoutScore = round(
      (0.30 * normMomentum) +
      (0.25 * writer) +
      (0.20 * normLiquidity) +
      (0.15 * normVolatility) +
      (0.10 * prox),
      4
    );

    // PCR from option chain
    const totalCallOI = smoothed.smoothedRows.reduce((sum, r) => sum + (r.callOI || 0), 0);
    const totalPutOI = smoothed.smoothedRows.reduce((sum, r) => sum + (r.putOI || 0), 0);
    const pcr = totalCallOI > 0 ? round(totalPutOI / totalCallOI, 4) : 1;

    return {
      spot: round(spot, 2),
      futures: round(current.futures?.ltp || 0, 2),
      support: srStable.support,
      resistance: srStable.resistance,
      momentum,
      shortMomentum,
      vwap,
      volatility,
      gex,
      writer,
      writerRelation,
      buyerSeller,
      liquidity,
      biasScore,
      breakoutScore,
      pcr,
      // Pass normalized values for downstream use
      _normalized: { momentum: normMomentum, gex: normGex, vwapDev: normVwapDev, liquidity: normLiquidity, volatility: normVolatility }
    };
  }

  _empty() {
    return {
      spot: 0, futures: 0, support: null, resistance: null,
      momentum: 0, shortMomentum: 0, vwap: 0, volatility: 0,
      gex: 0, writer: 0, writerRelation: 'BALANCED', buyerSeller: 'BALANCED',
      liquidity: 0, biasScore: 0, breakoutScore: 0, pcr: 1,
      _normalized: { momentum: 0, gex: 0, vwapDev: 0, liquidity: 0, volatility: 0 }
    };
  }
}

export const analyticsEngine = new AnalyticsEngine();
