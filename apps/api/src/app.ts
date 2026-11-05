import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import { env } from './config/env';
import { HealthCheckResponse } from '@bookleaf/shared';

export const app: Application = express();

// Middleware
app.use(
  cors({
    origin: env.CORS_ORIGIN,
    credentials: true,
  })
);
app.use(express.json());

// Health check endpoint
app.get('/api/health', (_req: Request, res: Response) => {
  const healthData: HealthCheckResponse = {
    status: 'ok',
    message: 'BookLeaf Author Support Portal API is running',
    timestamp: new Date().toISOString(),
    environment: env.NODE_ENV,
  };

  res.status(200).json(healthData);
});

