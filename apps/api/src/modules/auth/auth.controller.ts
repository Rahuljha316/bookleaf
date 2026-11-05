import { Request, Response, NextFunction } from 'express';
import { loginSchema } from './auth.schema';
import { verifyPassword, signToken, toSafeUser } from './auth.service';
import { sendSuccess, sendError } from '../../utils/apiResponse';
import { User } from '../../models/User';
import { env } from '../../config/env';
import { CookieOptions } from 'express';

/** Cookie name used across the application */
export const AUTH_COOKIE = 'bookleaf_token';

/** Build cookie options based on the environment */
function cookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: env.NODE_ENV === 'production' || env.COOKIE_SECURE,
    sameSite: env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
    path: '/',
  };
}

/**
 * POST /api/auth/login
 * Authenticates a user (author or admin) using email + password.
 */
export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    // 1. Validate request body with Zod
    const result = loginSchema.safeParse(req.body);
    if (!result.success) {
      sendError(res, 400, result.error.errors.map((e) => e.message).join(', '));
      return;
    }
    const { email, password } = result.data;

    // 2. Find user by email
    const user = await User.findOne({ where: { email } });
    if (!user) {
      sendError(res, 401, 'Invalid email or password');
      return;
    }

    // 3. Verify password
    const valid = await verifyPassword(password, user.password_hash);
    if (!valid) {
      sendError(res, 401, 'Invalid email or password');
      return;
    }

    // 4. Sign JWT
    const token = signToken(user);

    // 5. Set HTTP-only cookie
    res.cookie(AUTH_COOKIE, token, cookieOptions());

    // 6. Return safe user (never include password_hash)
    sendSuccess(res, 200, 'Login successful', { user: toSafeUser(user) });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/auth/logout
 * Clears the authentication cookie.
 */
export async function logout(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.clearCookie(AUTH_COOKIE, {
      httpOnly: true,
      secure: env.NODE_ENV === 'production' || env.COOKIE_SECURE,
      sameSite: env.NODE_ENV === 'production' ? 'none' : 'lax',
      path: '/',
    });
    sendSuccess(res, 200, 'Logged out successfully');
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/auth/me
 * Returns the currently authenticated user.
 * Protected by the `authenticate` middleware (req.user is populated).
 */
export async function me(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    // req.user is set by the authenticate middleware
    sendSuccess(res, 200, 'Authenticated user retrieved', { user: req.user });
  } catch (err) {
    next(err);
  }
}

