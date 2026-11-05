import type { AuthUser } from '@bookleaf/shared';

declare global {
  namespace Express {
    interface Request {
      /** Populated by the `authenticate` middleware after successful JWT verification. */
      user?: AuthUser;
    }
  }
}

