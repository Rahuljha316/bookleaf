import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { env } from './config/env';
import { HealthCheckResponse } from '@bookleaf/shared';
import { errorHandler } from './middleware/errorHandler';
import authRoutes from './modules/auth/auth.routes';

export const app: Application = express();

// ─── CORS ─────────────────────────────────────────────────────────────────────
// credentials: true is required so the browser sends the HTTP-only cookie
// on cross-origin requests (dev: localhost:5173 → localhost:5000).
app.use(
  cors({
    origin: env.CORS_ORIGIN,
    credentials: true,
  })
);

// ─── Body Parsers ─────────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── Cookie Parser ────────────────────────────────────────────────────────────
// Populates req.cookies so the authenticate middleware can read the JWT cookie.
app.use(cookieParser());

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/api/health', (_req: Request, res: Response) => {
  const healthData: HealthCheckResponse = {
    status: 'ok',
    message: 'BookLeaf Author Support Portal API is running',
    timestamp: new Date().toISOString(),
    environment: env.NODE_ENV,
  };

  res.status(200).json(healthData);
});

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);

// ─── Global Error Handler ─────────────────────────────────────────────────────
// Must be registered after all routes.
app.use(errorHandler);
