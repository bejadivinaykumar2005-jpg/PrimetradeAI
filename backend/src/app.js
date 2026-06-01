import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import morgan from 'morgan';
import mongoSanitize from 'express-mongo-sanitize';
import hpp from 'hpp';
import swaggerUi from 'swagger-ui-express';

import { env } from './config/env.js';
import { swaggerSpec } from './config/swagger.js';
import { globalLimiter } from './middleware/rateLimiter.js';
import { notFoundHandler, errorHandler } from './middleware/error.middleware.js';
import { morganStream } from './utils/logger.js';
import v1Routes from './routes/v1/index.js';

export function createApp() {
  const app = express();

  // Behind a reverse proxy / load balancer in production (correct client IPs for rate limiting).
  app.set('trust proxy', 1);

  // ---- Security & hardening ----
  app.use(helmet());
  app.use(
    cors({
      origin(origin, cb) {
        // Allow same-origin / curl (no origin) and any whitelisted frontend origin.
        if (!origin || env.corsOrigins.includes(origin)) return cb(null, true);
        return cb(new Error(`Origin ${origin} not allowed by CORS`));
      },
      credentials: true,
    })
  );

  // ---- Body parsing ----
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  // ---- Input sanitisation ----
  app.use(mongoSanitize()); // strip $ / . operators to block NoSQL injection
  app.use(hpp()); // guard against HTTP parameter pollution

  // ---- Performance & logging ----
  app.use(compression());
  app.use(morgan(env.isProd ? 'combined' : 'dev', { stream: morganStream }));

  // ---- Health check (for load balancers / orchestrators) ----
  app.get('/health', (_req, res) =>
    res.json({ success: true, status: 'ok', uptime: process.uptime() })
  );

  // ---- API docs ----
  app.get('/api/docs.json', (_req, res) => res.json(swaggerSpec));
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, { explorer: true }));

  // ---- API (rate-limited, versioned) ----
  app.use('/api', globalLimiter);
  app.use('/api/v1', v1Routes);

  // ---- 404 + centralised error handling (must be last) ----
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
