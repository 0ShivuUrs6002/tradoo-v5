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
    this.cycleCount = 0;
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
      this.cycleCount += 1;

      const smoothed = smoothingEngine.smooth(snapshot, previous);
      const analytics = analyticsEngine.run({ snapshotBuffer: this.snapshotBuffer, smoothed });

      const prediction = predictionEngine.run(analytics);
      const coherence = coherenceEngine.run({ analytics, prediction });

      const rawPayload = {
        timestamp: snapshot.timestamp,
        analytics,
        prediction,
        coherence,
        meta: {
          snapshots: this.snapshotBuffer.getAll().length,
          smoothedRows: smoothed.smoothedRows,
          candles: snapshot.candles || [],
          spot: snapshot.spot,
          futures: snapshot.futures,
          cycleCount: this.cycleCount
        }
      };

      const stabilityResult = stabilityEngine.run(rawPayload);

      this.currentOutput = {
        ...stabilityResult.payload,
        stability: {
          confirmedCycles: stabilityEngine.confirmedCycles,
          pendingCycles: stabilityEngine.pendingCount,
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
