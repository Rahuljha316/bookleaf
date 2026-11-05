/**
 * BookLeaf Shared Package
 *
 * Contains shared types and validation schemas consumable by both
 * web (frontend) and api (backend).
 */

export interface HealthCheckResponse {
  status: 'ok' | 'error';
  message: string;
  timestamp: string;
  environment: string;
}

export const APP_CONFIG = {
  name: 'BookLeaf Author Support Portal',
  version: '0.1.0',
} as const;

export const USER_ROLES = ['author', 'admin'] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const TICKET_CATEGORIES = [
  'Royalty & Payments',
  'ISBN & Metadata Issues',
  'Printing & Quality',
  'Distribution & Availability',
  'Book Status & Production Updates',
  'General Inquiry',
] as const;
export type TicketCategory = (typeof TICKET_CATEGORIES)[number];

export const TICKET_PRIORITIES = ['Critical', 'High', 'Medium', 'Low'] as const;
export type TicketPriority = (typeof TICKET_PRIORITIES)[number];

export const TICKET_STATUSES = ['Open', 'In Progress', 'Resolved', 'Closed'] as const;
export type TicketStatus = (typeof TICKET_STATUSES)[number];

export const AI_CLASSIFICATION_STATUSES = [
  'pending',
  'success',
  'failed',
  'manual_override',
] as const;
export type AIClassificationStatus = (typeof AI_CLASSIFICATION_STATUSES)[number];

// ─── Auth Types ──────────────────────────────────────────────────────────────

/** Shape of the JWT payload stored in the token */
export interface JwtPayload {
  sub: number;   // user.id
  role: UserRole;
  email: string;
  iat?: number;
  exp?: number;
}

/** Safe user object returned in API responses (no password_hash) */
export interface AuthUser {
  id: number;
  author_id: string | null;
  role: UserRole;
  name: string;
  email: string;
  phone: string | null;
  city: string | null;
  joined_date: string | null;
  created_at: Date;
  updated_at: Date;
}

/** Standard API response envelope */
export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
}

/** Login request body */
export interface LoginRequest {
  email: string;
  password: string;
}

/** Login response data */
export interface LoginResponseData {
  user: AuthUser;
}


