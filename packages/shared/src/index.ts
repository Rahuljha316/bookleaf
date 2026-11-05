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
  sub: number; // user.id
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
  created_at: string | Date;
  updated_at: string | Date;
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

// ─── Book & Royalty Types ───────────────────────────────────────────────────

export interface Book {
  id: number;
  book_id: string;
  author_user_id: number;
  title: string;
  isbn: string;
  genre: string;
  publication_date: string | null;
  status: string;
  mrp: number | null;
  author_royalty_per_copy: number | null;
  total_copies_sold: number;
  total_royalty_earned: number;
  royalty_paid: number;
  royalty_pending: number;
  last_royalty_payout_date: string | null;
  print_partner: string | null;
  available_on: string[];
  created_at: string | Date;
  updated_at: string | Date;
}

// ─── Ticket & Conversation Types ────────────────────────────────────────────

export interface TicketMessageSender {
  id: number;
  name: string;
  role: UserRole;
}

export interface TicketMessage {
  id: number;
  ticket_id: number;
  sender_id: number;
  message: string;
  is_ai_assisted: boolean;
  created_at: string | Date;
  sender?: TicketMessageSender;
}

export interface TicketInternalNoteAdmin {
  id: number;
  name: string;
  email?: string;
}

export interface TicketInternalNote {
  id: number;
  ticket_id: number;
  admin_id: number;
  note: string;
  created_at: string | Date;
  admin?: TicketInternalNoteAdmin;
}

export interface TicketAssociatedBook {
  id: number;
  title: string;
  book_id: string;
  isbn?: string;
  status?: string;
}

export interface TicketAuthorInfo {
  id: number;
  name: string;
  email: string;
  author_id?: string | null;
}

export interface TicketAssignedAdmin {
  id: number;
  name: string;
  email?: string;
}

export interface Ticket {
  id: number;
  ticket_number: string;
  author_user_id: number;
  book_id: number | null;
  assigned_to: number | null;
  subject: string;
  description: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  ai_suggested_category?: string | null;
  ai_suggested_priority?: string | null;
  ai_classification_status?: AIClassificationStatus;
  ai_suggested_reply?: string | null;
  ai_reply_edited_draft?: string | null;
  ai_draft_generated_at?: string | Date | null;
  created_at: string | Date;
  updated_at: string | Date;
  book?: TicketAssociatedBook | null;
  author?: TicketAuthorInfo;
  assignedAdmin?: TicketAssignedAdmin | null;
  messages?: TicketMessage[];
  internalNotes?: TicketInternalNote[];
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginatedTicketsData {
  tickets: Ticket[];
  pagination: PaginationMeta;
}

export interface CreateTicketPayload {
  subject: string;
  description: string;
  book_id?: number;
}

export interface UpdateTicketPayload {
  status?: TicketStatus;
  category?: TicketCategory;
  priority?: TicketPriority;
  assigned_to?: number | null;
}

export interface AddMessagePayload {
  message: string;
}

export interface AddNotePayload {
  note: string;
}
