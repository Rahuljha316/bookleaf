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

  sendError(res, 500, 'An unexpected server error occurred.');
}

