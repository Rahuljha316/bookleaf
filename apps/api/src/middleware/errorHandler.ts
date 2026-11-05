import { Request, Response, NextFunction } from 'express';
import { sendError } from '../utils/apiResponse';

/**
 * Global error-handling middleware.
 *
 * Must be the last middleware registered in app.ts (four-parameter signature).
 * Catches any error forwarded via next(err) and returns a consistent JSON
 * error response without leaking stack traces in production.
 */
export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
): void {
  console.error('[ErrorHandler]', err.message, err.stack);

  // Avoid sending a response if headers are already sent
  if (res.headersSent) {
    return;
  }

  const statusCode = (err as Error & { statusCode?: number }).statusCode ?? 500;
  const message = statusCode === 500 && process.env['NODE_ENV'] === 'production'
    ? 'An unexpected server error occurred.'
    : err.message || 'An unexpected server error occurred.';

  sendError(res, statusCode, message);
}

