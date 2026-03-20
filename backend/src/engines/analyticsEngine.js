import { clamp, normalize, round, stdDev } from '../utils/math.js';

const proximity = (strike, spot) => 1 / (1 + Math.abs(strike - spot));

export class AnalyticsEngine {
  constructor() {
    this.lockedSupport = null;
    this.lockedResistance = null;
    this.lockedAt = 0;
  }

  computeVWAP(candles) {
    const result = candles.reduce((acc, c) => {
      const price = c.c || 0;
      const vol = c.v || 0;
      acc.pv += price * vol;
      acc.v += vol;
      return acc;
    }, { pv: 0, v: 0 });
    return result.v > 0 ? result.pv / result.v : 0;
  }

  writerSignal(rows) {
    const values = rows.map((row) => {
      const callPressure = (row.callOIChange || 0) + (row.callVolume || 0) * 0.01;
      const putPressure = (row.putOIChange || 0) + (row.putVolume || 0) * 0.01;
      return putPressure - callPressure;
    });
    const avg = values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
    return clamp(normalize(avg, 1000));
  }

  findSupportResistance(rows, spot) {
    const sortedByDistance = [...rows].sort((a, b) => Math.abs(a.strike - spot) - Math.abs(b.strike - spot));
    const atm = sortedByDistance[0]?.strike || spot;
    const inRange = rows.filter((row) => row.strike >= (atm - 10 * 50) && row.strike <= (atm + 10 * 50));

    const withScores = inRange.map((row) => {
      const prox = proximity(row.strike, spot);
      const supportScore = (0.4 * row.putOIChange) + (0.3 * row.putOI) + (0.2 * row.putVolume) + (0.1 * prox * 1000);
      const resistanceScore = (0.4 * row.callOIChange) + (0.3 * row.callOI) + (0.2 * row.callVolume) + (0.1 * prox * 1000);
      return { ...row, prox, supportScore, resistanceScore };
    });

    const bestSupport = withScores.sort((a, b) => b.supportScore - a.supportScore)[0] || null;
    const bestResistance = withScores.sort((a, b) => b.resistanceScore - a.resistanceScore)[0] || null;

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
      const strongerSupport = currentSupport?.supportScore > (this.lockedSupport?.supportScore || 0) * 1.2;
      const strongerResistance = currentResistance?.resistanceScore > (this.lockedResistance?.resistanceScore || 0) * 1.2;

      if (!strongerSupport) currentSupport = this.lockedSupport;
      if (!strongerResistance) currentResistance = this.lockedResistance;
    } else {
      this.lockedAt = now;
    }

    this.lockedSupport = currentSupport;
    this.lockedResistance = currentResistance;

    return { support: currentSupport, resistance: currentResistance };
  }

  run({ snapshotBuffer, smoothed }) {
    const snapshots = snapshotBuffer.getAll();
    const current = snapshots[snapshots.length - 1];
    const fiveMinAgo = snapshots.find((s) => (current.timestamp - s.timestamp) >= 5 * 60 * 1000) || snapshots[0] || current;

    const spot = smoothed.smoothedSpot || current.spot?.ltp || 0;
    const prices = snapshots.map((s) => s.spot?.ltp || 0).filter((value) => value > 0).slice(-20);

    const momentum = round(spot - (fiveMinAgo?.spot?.ltp || spot));
    const vwap = round(this.computeVWAP(current.candles || []));
    const volatility = round(stdDev(prices));
    const gex = round(smoothed.smoothedRows.reduce((sum, row) => sum + (row.callOI - row.putOI), 0));

    const srRaw = this.findSupportResistance(smoothed.smoothedRows, spot);
    const srStable = this.applyStabilityLock(srRaw.support, srRaw.resistance);

    const writer = this.writerSignal(smoothed.smoothedRows);
    const liquidity = round((current.spot?.volume || 0) + (current.futures?.volume || 0));

    const biasScore = round(
      (0.3 * normalize(momentum, 100)) +
      (0.25 * normalize(spot - vwap, 100)) +
      (0.25 * normalize(gex, 100000)) +
      (0.2 * writer)
    );

    const prox = proximity(srStable.support?.strike || spot, spot);
    const breakoutScore = round(
      (0.3 * normalize(momentum, 100)) +
      (0.25 * writer) +
      (0.2 * normalize(liquidity, 1000000)) +
      (0.15 * normalize(volatility, 100)) +
      (0.1 * prox)
    );

    return {
      spot: round(spot, 2),
      futures: round(current.futures?.ltp || 0, 2),
      support: srStable.support,
      resistance: srStable.resistance,
      momentum,
      vwap,
      volatility,
      gex,
      writer,
      liquidity,
      biasScore,
      breakoutScore
    };
  }
}

export const analyticsEngine = new AnalyticsEngine();
