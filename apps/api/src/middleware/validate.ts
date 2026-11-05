import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { sendError } from '../utils/apiResponse';

/**
 * Middleware factory: validate
 *
 * Validates `req.body` against a Zod schema.  On failure returns 400 with
 * a human-readable error message.  On success, the parsed (and coerced) data
 * is written back to `req.body`.
 *
 * Usage:
 *   router.post('/login', validate(loginSchema), loginHandler)
 */
export function validate<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const message = result.error.errors.map((e) => e.message).join(', ');
      sendError(res, 400, message);
      return;
    }
    req.body = result.data;
    next();
  };
}

