import { Request, Response, NextFunction } from 'express';
import { verifyToken, toSafeUser } from '../modules/auth/auth.service';
import { sendError } from '../utils/apiResponse';
import { User } from '../models/User';
import { AUTH_COOKIE } from '../modules/auth/auth.controller';

/**
 * Middleware: authenticate
 *
 * Reads the JWT from the HTTP-only cookie, verifies it, then loads the
 * corresponding user from the database.  Attaches the safe user object to
 * `req.user` on success.  Sends 401 if the token is missing, invalid, or
 * the user no longer exists.
 */
export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const token: string | undefined = req.cookies?.[AUTH_COOKIE];

    if (!token) {
      sendError(res, 401, 'Authentication required. Please log in.');
      return;
    }

    const payload = verifyToken(token);
    if (!payload) {
      sendError(res, 401, 'Invalid or expired token. Please log in again.');
      return;
    }

    // Load user from DB to ensure account still exists
    const user = await User.findByPk(payload.sub);
    if (!user) {
      sendError(res, 401, 'User account not found. Please log in again.');
      return;
    }

    req.user = toSafeUser(user);
    next();
  } catch (err) {
    next(err);
  }
}

