import { config } from '../config.js';
import { dataFetcher } from '../services/dataFetcher.js';
import { authService } from '../services/authService.js';
import { createSnapshot, SnapshotBuffer } from '../engines/snapshotEngine.js';
import { smoothingEngine } from '../engines/smoothingEngine.js';
import { analyticsEngine } from '../engines/analyticsEngine.js';
import { indicatorEngine } from '../engines/indicatorEngine.js';
import { predictionEngine } from '../engines/predictionEngine.js';
import { coherenceEngine } from '../engines/coherenceEngine.js';
import { reversalEngine } from '../engines/reversalEngine.js';
import { gapPredictorEngine } from '../engines/gapPredictorEngine.js';
import { stabilityEngine } from '../engines/stabilityEngine.js';
import { logger } from '../utils/logger.js';

class PipelineOrchestrator {
  constructor() {
    this.snapshotBuffer = new SnapshotBuffer(60);
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

      // Stage 1: Smooth raw data
      const smoothed = smoothingEngine.smooth(snapshot, previous);

      // Stage 2: Compute technical indicators from candles + option chain
      const indicators = indicatorEngine.compute({
        candles: snapshot.candles || [],
        optionChainRows: smoothed.smoothedRows,
        spot: smoothed.smoothedSpot || snapshot.spot?.ltp || 0
      });

      // Stage 3: Run analytics with indicators for adaptive normalization
      const analytics = analyticsEngine.run({ snapshotBuffer: this.snapshotBuffer, smoothed, indicators });

      // Stage 4: Update indicator engine histories for next cycle
      indicatorEngine.updateHistories({
        gex: analytics.gex,
        momentum: analytics.momentum,
        liquidity: analytics.liquidity,
        volatility: analytics.volatility
      });

      // Stage 5: Multi-layer prediction and auxiliary engines
      const prediction = predictionEngine.run(analytics, indicators);
      const reversal = reversalEngine.run(analytics, indicators, { candles: snapshot.candles });
      const gap = gapPredictorEngine.run(analytics, indicators, { candles: snapshot.candles });

      // Stage 6: Coherence analysis with all signals
      const coherence = coherenceEngine.run({ analytics, prediction, indicators });

      const rawPayload = {
        timestamp: snapshot.timestamp,
        analytics,
        prediction,
        reversal,
        gap,
        coherence,
        indicators: {
          rsi: indicators.rsi,
          ema9: indicators.ema9,
          ema21: indicators.ema21,
          macd: indicators.macd,
          atr: indicators.atr,
          pcr: indicators.pcr,
          ivSkew: indicators.ivSkew,
          volumeSurge: indicators.volumeSurge,
          momentum1m: indicators.momentum1m,
          momentum5m: indicators.momentum5m,
          momentum15m: indicators.momentum15m
        },
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
