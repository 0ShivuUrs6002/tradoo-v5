import { config } from '../config.js';
import { dataFetcher } from '../services/dataFetcher.js';
import { authService } from '../services/authService.js';
import { createSnapshot, SnapshotBuffer } from '../engines/snapshotEngine.js';
import { smoothingEngine } from '../engines/smoothingEngine.js';
import { analyticsEngine } from '../engines/analyticsEngine.js';
import { predictionEngine } from '../engines/predictionEngine.js';
import { coherenceEngine } from '../engines/coherenceEngine.js';
import { stabilityEngine } from '../engines/stabilityEngine.js';
import { logger } from '../utils/logger.js';

class PipelineOrchestrator {
  constructor() {
    this.snapshotBuffer = new SnapshotBuffer(20);
    this.currentOutput = null;
    this.timer = null;
  }

  buyerSellerSignal(rows) {
    const scores = rows.map((row) => {
      const callSide = (row.callOIChange || 0) + (row.callVolume || 0) + (row.callLtp || 0);
      const putSide = (row.putOIChange || 0) + (row.putVolume || 0) + (row.putLtp || 0);
      return putSide - callSide;
    });

    const net = scores.reduce((sum, value) => sum + value, 0);
    if (net > 0) return 'BUYER_DOMINANT';
    if (net < 0) return 'SELLER_DOMINANT';
    return 'BALANCED';
  }

  async cycle() {
    try {
      if (!authService.hasValidToken()) {
        return;
      }

      const raw = await dataFetcher.fetchSnapshot();
      if (!raw) return;

      const snapshot = createSnapshot(raw);
      const previous = this.snapshotBuffer.last();
      this.snapshotBuffer.push(snapshot);

      const smoothed = smoothingEngine.smooth(snapshot, previous);
      const analytics = analyticsEngine.run({ snapshotBuffer: this.snapshotBuffer, smoothed });
      analytics.writerRelation = this.buyerSellerSignal(smoothed.smoothedRows);

      const prediction = predictionEngine.run(analytics);
      const coherence = coherenceEngine.run({ analytics, prediction });

      const stabilityResult = stabilityEngine.run({
        timestamp: snapshot.timestamp,
        analytics,
        prediction,
        coherence,
        meta: {
          snapshots: this.snapshotBuffer.getAll().length,
          smoothedRows: smoothed.smoothedRows,
          candles: snapshot.candles,
          spot: snapshot.spot,
          futures: snapshot.futures
        }
      });

      this.currentOutput = {
        ...stabilityResult.payload,
        stability: {
          confirmedCycles: stabilityEngine.pendingCount,
          frozenUntil: stabilityResult.frozenUntil,
          updated: stabilityResult.updated
        }
      };
    } catch (error) {
      logger.error('Pipeline cycle failed', error.message);
    }
  }

  start() {
    if (this.timer) return;
    this.cycle();
    this.timer = setInterval(() => this.cycle(), config.fetchIntervalMs);
    logger.info(`Pipeline started with ${config.fetchIntervalMs}ms interval`);
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  getOutput() {
    return this.currentOutput;
  }
}

export const pipelineOrchestrator = new PipelineOrchestrator();
