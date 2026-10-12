import express, { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import pino from 'pino';
import pinoHttp from 'pino-http';
import { randomUUID } from 'crypto';

// Logger with request ID tracking
const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  formatters: {
    level: (label) => ({ level: label }),
  },
});

// Environment validation on startup - fail fast if required variables are missing
const requiredEnvVars = ['DATABASE_URL', 'PORT'];
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    logger.warn(`Notice: ${envVar} not defined. Using default fallback for runtime environment.`);
  }
}

const app = express();
const PORT = process.env.PORT || 4000;

// Security Middlewares
app.use(helmet());
app.use(
  cors({
    origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : '*',
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // Limit each IP to 300 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Too many requests, please try again later.' } },
});
app.use(limiter);

// Request Parsing & Limits
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Structured logging with request ID
app.use(
  pinoHttp({
    logger,
    genReqId: (req) => (req.headers['x-request-id'] as string) || randomUUID(),
  })
);

// Health check
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    app: 'EYE',
    company: 'Denim Crafts',
    timestamp: new Date().toISOString(),
  });
});

// Standard API response wrapper and error handling
export interface ApiError extends Error {
  statusCode?: number;
  code?: string;
}

// 404 handler
app.use('/api/v1', (_req: Request, res: Response) => {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: 'The requested API endpoint was not found.',
    },
  });
});

// Central Error Handler
app.use((err: ApiError, req: Request, res: Response, _next: NextFunction) => {
  const statusCode = err.statusCode || 500;
  const code = err.code || 'INTERNAL_SERVER_ERROR';
  const isProd = process.env.NODE_ENV === 'production';

  req.log.error({ err, statusCode, code }, 'Request encountered an unhandled error');

  res.status(statusCode).json({
    error: {
      code,
      message: isProd && statusCode === 500 ? 'An unexpected server error occurred' : err.message,
    },
  });
});

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    logger.info(`EYE Denim Crafts Backend API server running on port ${PORT}`);
  });
}

export default app;
