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
app.use('/api/books', authorBookRouter);
app.use('/api/tickets', authorTicketRouter);
app.use('/api/admin/tickets', adminTicketRouter);
app.use('/api/admin/admins', adminUserRouter);

// ─── Global Error Handler ─────────────────────────────────────────────────────
// Must be registered after all routes.
app.use(errorHandler);
