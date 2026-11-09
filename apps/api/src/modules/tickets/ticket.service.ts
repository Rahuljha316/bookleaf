import { Op } from 'sequelize';
import { sequelize } from '../../config/database';
import { Ticket } from '../../models/Ticket';
import { TicketMessage } from '../../models/TicketMessage';
import { TicketInternalNote } from '../../models/TicketInternalNote';
import { User } from '../../models/User';
import { Book } from '../../models/Book';
import { classifyAndPersist } from '../../ai';
import type {
  CreateTicketInput,
  ListTicketsQuery,
  AdminListTicketsQuery,
  AdminUpdateTicketInput,
} from './ticket.schema';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Creates an error with an HTTP status code attached.
 * Controllers inspect `err.statusCode` to send the right HTTP status.
 */
function createError(statusCode: number, message: string): Error & { statusCode: number } {
  const err = new Error(message) as Error & { statusCode: number };
  err.statusCode = statusCode;
  return err;
}

export interface PaginatedTickets {
  tickets: Ticket[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ─── Ticket Number Generation ─────────────────────────────────────────────────

/**
 * Generates the next sequential ticket number (TICK-1001, TICK-1002, …).
 * Must be called inside an existing transaction to be atomic.
 */
async function generateTicketNumber(transaction: import('sequelize').Transaction): Promise<string> {
  const count = await Ticket.count({ transaction });
  return `TICK-${1001 + count}`;
}

// ─── Author: Create Ticket ────────────────────────────────────────────────────

/**
 * Creates a new support ticket for the given author.
 * If `book_id` is supplied the book must exist and belong to the author.
 */
export async function createTicket(
  authorUserId: number,
  data: CreateTicketInput,
): Promise<Ticket> {
  return sequelize.transaction(async (transaction) => {
    // Verify book ownership when a book is linked
    if (data.book_id !== undefined) {
      const book = await Book.findByPk(data.book_id, { transaction });
      if (!book) {
        throw createError(404, 'Book not found.');
      }
      if (book.author_user_id !== authorUserId) {
        throw createError(403, 'You do not have permission to link this book to a ticket.');
      }
    }

    const ticketNumber = await generateTicketNumber(transaction);

    const ticket = await Ticket.create(
      {
        ticket_number: ticketNumber,
        author_user_id: authorUserId,
        subject: data.subject,
        description: data.description,
        book_id: data.book_id ?? null,
        assigned_to: null,
        status: 'Open',
        category_manually_overridden: false,
        priority_manually_overridden: false,
        ai_classification_status: 'pending',
        ai_suggested_category: null,
        ai_suggested_priority: null,
        ai_suggested_reply: null,
        ai_reply_edited_draft: null,
        ai_draft_generated_at: null,
      },
      { transaction },
    );

    return ticket;
  });
}

/**
 * Triggers AI classification for a newly created ticket.
 * Must be called AFTER the DB transaction commits so the ticket row exists.
 *
 * Fire-and-forget: awaiting is optional in controllers — failures are
 * handled inside classifyAndPersist and never propagate to the caller.
 */
export function triggerAIClassification(ticket: Ticket): void {
  classifyAndPersist(ticket, {
    subject: ticket.subject,
    description: ticket.description,
  }).catch((err: unknown) => {
    // classifyAndPersist already swallows errors, but guard defensively
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[Ticket] Background AI classification error for ticket ${ticket.id}: ${msg}`);
  });
}

// ─── Author: List Own Tickets ─────────────────────────────────────────────────

/**
 * Returns a paginated list of tickets raised by the given author.
 * Never returns another author's tickets.
 */
export async function listAuthorTickets(
  authorUserId: number,
  query: ListTicketsQuery,
): Promise<PaginatedTickets> {
  const page = query.page ?? 1;
  const limit = Math.min(query.limit ?? 10, 100);
  const offset = (page - 1) * limit;

  const where: Record<string, unknown> = { author_user_id: authorUserId };
  if (query.status) {
    where['status'] = query.status;
  }

  const { count, rows } = await Ticket.findAndCountAll({
    where,
    include: [
      {
        model: Book,
        as: 'book',
        attributes: ['id', 'title', 'book_id'],
        required: false,
      },
      {
        model: User,
        as: 'assignedAdmin',
        attributes: ['id', 'name'],
        required: false,
      },
    ],
    order: [['created_at', 'DESC']],
    limit,
    offset,
  });

  return {
    tickets: rows,
    total: count,
    page,
    limit,
    totalPages: Math.ceil(count / limit),
  };
}

// ─── Author: Get Single Ticket ────────────────────────────────────────────────

/**
 * Returns full ticket details for the given author.
 * Returns 404 if the ticket doesn't exist or belongs to another author.
 * Never exposes internal notes to authors.
 */
export async function getAuthorTicket(
  authorUserId: number,
  ticketId: number,
): Promise<Ticket> {
  const ticket = await Ticket.findOne({
    where: { id: ticketId, author_user_id: authorUserId },
    include: [
      {
        model: Book,
        as: 'book',
        attributes: ['id', 'title', 'book_id'],
        required: false,
      },
      {
        model: User,
        as: 'author',
        attributes: ['id', 'name', 'email'],
      },
      {
        model: User,
        as: 'assignedAdmin',
        attributes: ['id', 'name'],
        required: false,
      },
      {
        model: TicketMessage,
        as: 'messages',
        include: [
          {
            model: User,
            as: 'sender',
            attributes: ['id', 'name', 'role'],
          },
        ],
      },
    ],
  });

  if (!ticket) {
    throw createError(404, 'Ticket not found.');
  }

  return ticket;
}

// ─── Author: Add Public Message ───────────────────────────────────────────────

/**
 * Adds a public message from the author to their own ticket.
 * Returns 404 if the ticket doesn't belong to the author.
 */
export async function addAuthorMessage(
  authorUserId: number,
  ticketId: number,
  message: string,
): Promise<TicketMessage> {
  const ticket = await Ticket.findOne({
    where: { id: ticketId, author_user_id: authorUserId },
  });

  if (!ticket) {
    throw createError(404, 'Ticket not found.');
  }

  const ticketMessage = await TicketMessage.create({
    ticket_id: ticketId,
    sender_id: authorUserId,
    message,
    is_ai_assisted: false,
  });

  // Reload with sender association
  await ticketMessage.reload({
    include: [
      {
        model: User,
        as: 'sender',
        attributes: ['id', 'name', 'role'],
      },
    ],
  });

  return ticketMessage;
}

// ─── Admin: List All Tickets ──────────────────────────────────────────────────

/**
 * Returns a paginated list of all tickets with optional filters.
 */
export async function listAllTickets(query: AdminListTicketsQuery): Promise<PaginatedTickets> {
  const page = query.page ?? 1;
  const limit = Math.min(query.limit ?? 10, 100);
  const offset = (page - 1) * limit;

  const where: Record<string, unknown> = {};
  if (query.status) where['status'] = query.status;
  if (query.priority) where['priority'] = query.priority;
  if (query.category) where['category'] = query.category;
  if (query.assigned_to !== undefined) where['assigned_to'] = query.assigned_to;

  const { count, rows } = await Ticket.findAndCountAll({
    where,
    include: [
      {
        model: User,
        as: 'author',
        attributes: ['id', 'name', 'email', 'author_id'],
      },
      {
        model: Book,
        as: 'book',
        attributes: ['id', 'title', 'book_id'],
        required: false,
      },
      {
        model: User,
        as: 'assignedAdmin',
        attributes: ['id', 'name'],
        required: false,
      },
    ],
    order: [['created_at', 'DESC']],
    limit,
    offset,
  });

  return {
    tickets: rows,
    total: count,
    page,
    limit,
    totalPages: Math.ceil(count / limit),
  };
}

// ─── Admin: Get Full Ticket ───────────────────────────────────────────────────

/**
 * Returns a ticket with full details including messages and internal notes.
 * Returns 404 if the ticket doesn't exist.
 */
export async function getAdminTicket(ticketId: number): Promise<Ticket> {
  const ticket = await Ticket.findByPk(ticketId, {
    include: [
      {
        model: User,
        as: 'author',
        attributes: ['id', 'name', 'email', 'author_id'],
      },
      {
        model: Book,
        as: 'book',
        attributes: ['id', 'title', 'book_id'],
        required: false,
      },
      {
        model: User,
        as: 'assignedAdmin',
        attributes: ['id', 'name'],
        required: false,
      },
      {
        model: TicketMessage,
        as: 'messages',
        include: [
          {
            model: User,
            as: 'sender',
            attributes: ['id', 'name', 'role'],
          },
        ],
      },
      {
        model: TicketInternalNote,
        as: 'internalNotes',
        include: [
          {
            model: User,
            as: 'admin',
            attributes: ['id', 'name'],
          },
        ],
      },
    ],
  });

  if (!ticket) {
    throw createError(404, 'Ticket not found.');
  }

  return ticket;
}

// ─── Admin: Update Ticket ─────────────────────────────────────────────────────

/**
 * Updates status, category, priority, and/or assignment of a ticket.
 * When `assigned_to` is a non-null number the target user must be an admin.
 * Returns 404 if ticket not found, 400 if assigned user is not an admin.
 */
export async function updateTicket(
  ticketId: number,
  data: AdminUpdateTicketInput,
): Promise<Ticket> {
  const ticket = await Ticket.findByPk(ticketId);
  if (!ticket) {
    throw createError(404, 'Ticket not found.');
  }

  // Validate assignee when it's being set to a real user
  if (data.assigned_to !== undefined && data.assigned_to !== null) {
    const assignee = await User.findByPk(data.assigned_to, {
      attributes: ['id', 'role'],
    });
    if (!assignee) {
      throw createError(400, 'The user to be assigned does not exist.');
    }
    if (assignee.role !== 'admin') {
      throw createError(400, 'Only admin users can be assigned to tickets.');
    }
  }

  // Apply updates
  if (data.status !== undefined) ticket.status = data.status;
  if (data.category !== undefined) {
    ticket.category = data.category;
    ticket.category_manually_overridden = true;
  }
  if (data.priority !== undefined) {
    ticket.priority = data.priority;
    ticket.priority_manually_overridden = true;
  }
  if (data.assigned_to !== undefined) ticket.assigned_to = data.assigned_to;

  await ticket.save();

  // Reload with associations
  await ticket.reload({
    include: [
      {
        model: User,
        as: 'author',
        attributes: ['id', 'name', 'email', 'author_id'],
      },
      {
        model: Book,
        as: 'book',
        attributes: ['id', 'title', 'book_id'],
        required: false,
      },
      {
        model: User,
        as: 'assignedAdmin',
        attributes: ['id', 'name'],
        required: false,
      },
    ],
  });

  return ticket;
}

// ─── Admin: Add Public Message ────────────────────────────────────────────────

/**
 * Adds a public message from an admin to any ticket.
 * Returns 404 if the ticket doesn't exist.
 */
export async function addAdminMessage(
  adminUserId: number,
  ticketId: number,
  message: string,
): Promise<TicketMessage> {
  const ticket = await Ticket.findByPk(ticketId);
  if (!ticket) {
    throw createError(404, 'Ticket not found.');
  }

  const ticketMessage = await TicketMessage.create({
    ticket_id: ticketId,
    sender_id: adminUserId,
    message,
    is_ai_assisted: false,
  });

  // Reload with sender association
  await ticketMessage.reload({
    include: [
      {
        model: User,
        as: 'sender',
        attributes: ['id', 'name', 'role'],
      },
    ],
  });

  return ticketMessage;
}

// ─── Admin: Add Internal Note ─────────────────────────────────────────────────

/**
 * Adds an internal note (visible to admins only) to any ticket.
 * Returns 404 if the ticket doesn't exist.
 */
export async function addInternalNote(
  adminUserId: number,
  ticketId: number,
  note: string,
): Promise<TicketInternalNote> {
  const ticket = await Ticket.findByPk(ticketId);
  if (!ticket) {
    throw createError(404, 'Ticket not found.');
  }

  const internalNote = await TicketInternalNote.create({
    ticket_id: ticketId,
    admin_id: adminUserId,
    note,
  });

  // Reload with admin association
  await internalNote.reload({
    include: [
      {
        model: User,
        as: 'admin',
        attributes: ['id', 'name'],
      },
    ],
  });

  return internalNote;
}
