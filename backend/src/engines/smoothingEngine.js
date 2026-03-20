import { round } from '../utils/math.js';

const ema = (current, previous) => (0.7 * current) + (0.3 * previous);

export class SmoothingEngine {
  smooth(currentSnapshot, previousSnapshot) {
    if (!previousSnapshot) {
      return {
        smoothedSpot: currentSnapshot.spot?.ltp || 0,
        smoothedGex: 0,
        smoothedRows: currentSnapshot.optionChain || []
      };
    }

    const prevRowsByStrike = new Map((previousSnapshot.optionChain || []).map((row) => [row.strike, row]));

    const smoothedRows = (currentSnapshot.optionChain || []).map((row) => {
      const prev = prevRowsByStrike.get(row.strike) || {};
      return {
        ...row,
        callOI: round(ema(row.callOI || 0, prev.callOI || 0)),
        putOI: round(ema(row.putOI || 0, prev.putOI || 0)),
        callOIChange: round(ema(row.callOIChange || 0, prev.callOIChange || 0)),
        putOIChange: round(ema(row.putOIChange || 0, prev.putOIChange || 0)),
        callVolume: round(ema(row.callVolume || 0, prev.callVolume || 0)),
        putVolume: round(ema(row.putVolume || 0, prev.putVolume || 0)),
        callLtp: round(ema(row.callLtp || 0, prev.callLtp || 0)),
        putLtp: round(ema(row.putLtp || 0, prev.putLtp || 0))
      };
    });

    const totalCallOI = smoothedRows.reduce((sum, row) => sum + row.callOI, 0);
    const totalPutOI = smoothedRows.reduce((sum, row) => sum + row.putOI, 0);

    return {
      smoothedSpot: round(ema(currentSnapshot.spot?.ltp || 0, previousSnapshot.spot?.ltp || 0)),
      smoothedGex: round(ema(totalCallOI - totalPutOI, 0)),
      smoothedRows
    };
  }
}

export const smoothingEngine = new SmoothingEngine();
