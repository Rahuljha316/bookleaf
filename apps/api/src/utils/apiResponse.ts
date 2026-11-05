import { Response } from 'express';
import type { ApiResponse } from '@bookleaf/shared';

/**
 * Send a successful JSON response.
 */
export function sendSuccess<T>(
  res: Response,
  statusCode: number,
  message: string,
  data?: T,
): Response {
  const body: ApiResponse<T> = { success: true, message, ...(data !== undefined ? { data } : {}) };
  return res.status(statusCode).json(body);
}

/**
 * Send an error JSON response.
 */
export function sendError(
  res: Response,
  statusCode: number,
  message: string,
): Response {
  const body: ApiResponse = { success: false, message };
  return res.status(statusCode).json(body);
}

