import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import { logger } from './utils/logger.js';
import { authService } from './services/authService.js';
import { apiRouter } from './routes/api.js';
import { pipelineOrchestrator } from './pipeline/pipelineOrchestrator.js';

const app = express();

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (config.corsOrigins.includes('*') || config.corsOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('CORS origin blocked'));
  }
}));
app.use(express.json());
app.use('/api', apiRouter);

const start = async () => {
  await authService.init();
  pipelineOrchestrator.start();

  app.listen(config.port, () => {
    logger.info(`TRADO backend running on port ${config.port}`);
  });
};

start();
