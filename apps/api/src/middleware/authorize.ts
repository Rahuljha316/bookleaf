import { Request, Response, NextFunction } from 'express';
import { sendError } from '../utils/apiResponse';
import type { UserRole } from '@bookleaf/shared';

/**
 * Middleware factory: authorize
 *
 * Returns an Express middleware that checks whether the authenticated user
 * (`req.user`) has one of the allowed roles.
 *
 * Usage:
 *   router.get('/admin/tickets', authenticate, authorize('admin'), handler)
 *   router.get('/profile',       authenticate, authorize('author', 'admin'), handler)
 */
export function authorize(...allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      // authenticate middleware was not applied before authorize
      sendError(res, 401, 'Authentication required.');
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      sendError(
        res,
        403,
        `Access denied. Required role: ${allowedRoles.join(' or ')}.`,
      );
      return;
    }

    next();
  };
}

