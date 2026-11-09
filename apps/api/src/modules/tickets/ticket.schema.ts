import { z } from 'zod';
import {
  TICKET_CATEGORIES,
  TICKET_PRIORITIES,
  TICKET_STATUSES,
} from '@bookleaf/shared';

// ─── Create Ticket ────────────────────────────────────────────────────────────

export const createTicketSchema = z.object({
  subject: z
    .string({ required_error: 'Subject is required' })
    .min(1, 'Subject must not be empty')
    .max(255, 'Subject must be at most 255 characters'),
  description: z
    .string({ required_error: 'Description is required' })
    .min(1, 'Description must not be empty'),
  book_id: z
    .number()
    .int('book_id must be an integer')
    .positive('book_id must be a positive integer')
    .optional(),
});

export type CreateTicketInput = z.infer<typeof createTicketSchema>;

// ─── Add Message ──────────────────────────────────────────────────────────────

export const addMessageSchema = z.object({
  message: z
    .string({ required_error: 'Message is required' })
    .min(1, 'Message must not be empty'),
});

export type AddMessageInput = z.infer<typeof addMessageSchema>;

// ─── Add Note ─────────────────────────────────────────────────────────────────

export const addNoteSchema = z.object({
  note: z
    .string({ required_error: 'Note is required' })
    .min(1, 'Note must not be empty'),
});

export type AddNoteInput = z.infer<typeof addNoteSchema>;

// ─── Admin Update Ticket ──────────────────────────────────────────────────────

export const adminUpdateTicketSchema = z
  .object({
    status: z.enum(TICKET_STATUSES).optional(),
    category: z.enum(TICKET_CATEGORIES).optional(),
    priority: z.enum(TICKET_PRIORITIES).optional(),
    assigned_to: z.number().int().positive().nullable().optional(),
  })
  .refine(
    (data) =>
      data.status !== undefined ||
      data.category !== undefined ||
      data.priority !== undefined ||
      data.assigned_to !== undefined,
    { message: 'At least one field must be provided for update.' },
  );

export type AdminUpdateTicketInput = z.infer<typeof adminUpdateTicketSchema>;

// ─── List Tickets Query (Author) ───────────────────────────────────────────────

export const listTicketsQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(10),
  status: z.enum(TICKET_STATUSES).optional(),
});

export type ListTicketsQuery = z.infer<typeof listTicketsQuerySchema>;

// ─── List Tickets Query (Admin) ────────────────────────────────────────────────

const isoDateQuery = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must use YYYY-MM-DD format').refine(
  (value) => {
    const parsed = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
  },
  'Date must be a valid calendar date',
);

export const adminListTicketsQuerySchema = z
  .object({
    page: z.coerce.number().int().positive().optional().default(1),
    limit: z.coerce.number().int().positive().max(100).optional().default(10),
    status: z.enum(TICKET_STATUSES).optional(),
    priority: z.enum(TICKET_PRIORITIES).optional(),
    category: z.enum(TICKET_CATEGORIES).optional(),
    assigned_to: z.coerce.number().int().positive().optional(),
    created_from: isoDateQuery.optional(),
    created_to: isoDateQuery.optional(),
  })
  .refine(
    (data) => !data.created_from || !data.created_to || data.created_from <= data.created_to,
    { message: 'created_from must be on or before created_to', path: ['created_to'] },
  );

export type AdminListTicketsQuery = z.infer<typeof adminListTicketsQuerySchema>;
