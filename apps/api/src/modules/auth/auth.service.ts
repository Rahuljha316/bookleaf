import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env';
import { User } from '../../models/User';
import type { JwtPayload, AuthUser } from '@bookleaf/shared';

const SALT_ROUNDS = 12;

/**
 * Hash a plain-text password.
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Compare a plain-text password with a bcrypt hash.
 */
export async function verifyPassword(
  password: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Sign a JWT for the given user.
 */
export function signToken(user: User): string {
  const payload: JwtPayload = {
    sub: user.id,
    role: user.role,
    email: user.email,
  };
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  });
}

/**
 * Verify and decode a JWT. Returns null if invalid or expired.
 */
export function verifyToken(token: string): JwtPayload | null {
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as unknown as JwtPayload;
    return decoded;
  } catch {
    return null;
  }
}

/**
 * Strip password_hash from a User model instance and return a safe object.
 */
export function toSafeUser(user: User): AuthUser {
  return {
    id: user.id,
    author_id: user.author_id,
    role: user.role,
    name: user.name,
    email: user.email,
    phone: user.phone,
    city: user.city,
    joined_date: user.joined_date,
    created_at: user.created_at,
    updated_at: user.updated_at,
  };
}
