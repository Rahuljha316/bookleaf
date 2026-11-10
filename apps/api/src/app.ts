import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import './models';
import { env } from './config/env';
import { HealthCheckResponse } from '@bookleaf/shared';
import { errorHandler } from './middleware/errorHandler';
import authRoutes from './modules/auth/auth.routes';
import { authorTicketRouter, adminTicketRouter } from './modules/tickets/ticket.routes';
import { authorBookRouter } from './modules/authors/author.routes';
import { adminUserRouter } from './modules/admin/admin.routes';

export const app: Application = express();

// Trust reverse proxy (e.g. Render) for secure cookies and protocol detection
app.set('trust proxy', 1);

// ─── CORS ─────────────────────────────────────────────────────────────────────
// credentials: true is required so the browser sends the HTTP-only cookie
// on cross-origin requests.
// Supports comma-separated CORS_ORIGIN values, Vercel domains, and local development.
const allowedOrigins = env.CORS_ORIGIN.split(',')
  .map((origin) => origin.trim().replace(/\/+$/, ''))
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, curl, server-to-server, Render health checks)
      if (!origin) return callback(null, true);

      const normalizedOrigin = origin.trim().replace(/\/+$/, '');

      // Explicit match in allowed origins
      if (allowedOrigins.includes(normalizedOrigin)) {
        return callback(null, true);
      }

      // Allow localhost in non-production
      if (env.NODE_ENV !== 'production' && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(normalizedOrigin)) {
        return callback(null, true);
      }

      // Support Vercel preview deployments if a Vercel domain is configured
      const hasVercelAllowed = allowedOrigins.some((o) => o.includes('.vercel.app'));
      if (hasVercelAllowed && /^https:\/\/[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*\.vercel\.app$/.test(normalizedOrigin)) {
        return callback(null, true);
      }

      return callback(null, false);
    },
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
app.use('/api/books', authorBookRouter);
app.use('/api/tickets', authorTicketRouter);
app.use('/api/admin/tickets', adminTicketRouter);
app.use('/api/admin/admins', adminUserRouter);

// ─── Global Error Handler ─────────────────────────────────────────────────────
// Must be registered after all routes.
app.use(errorHandler);
