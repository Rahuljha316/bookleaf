import { Request, Response, NextFunction } from 'express';
import { sendSuccess, sendError } from '../../utils/apiResponse';
import {
  createTicket,
  listAuthorTickets,
  getAuthorTicket,
  addAuthorMessage,
  listAllTickets,
  getAdminTicket,
  updateTicket,
  addAdminMessage,
  addInternalNote,
  triggerAIClassification,
} from './ticket.service';
import {
  listTicketsQuerySchema,
  adminListTicketsQuerySchema,
} from './ticket.schema';

// ─── Shared Helpers ───────────────────────────────────────────────────────────

/**
 * Parses a route param string into an integer.
 * Sends a 400 response and returns null if parsing fails.
 */
function parseTicketId(
  idParam: string | string[] | undefined,
  res: Response,
): number | null {
    const raw = Array.isArray(idParam) ? idParam[0] : idParam;
    const id = parseInt(raw ?? '', 10);
    if (isNaN(id) || id <= 0) {
      sendError(res, 400, 'Invalid ticket ID.');
      return null;
    }
    return id;
  }

  /**
   * Extracts the HTTP status code from a service error.
   * Falls back to null so the caller can decide to use next(err) instead.
   */
  function getStatusCode(err: unknown): number | null {
    if (err instanceof Error && (err as Error & { statusCode?: number }).statusCode) {
      return (err as Error & { statusCode: number }).statusCode;
    }
    return null;
  }

  // ─── Author Controllers ───────────────────────────────────────────────────────

  /**
   * POST /api/tickets
   * Creates a new support ticket for the authenticated author.
   */
  export async function createTicketHandler(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const ticket = await createTicket(req.user!.id, req.body);
      // Fire AI classification asynchronously — does NOT block the response.
      // Failures are handled inside triggerAIClassification and never reach here.
      triggerAIClassification(ticket);
      sendSuccess(res, 201, 'Ticket created successfully.', { ticket });
    } catch (err) {
      const statusCode = getStatusCode(err);
      if (statusCode) {
        sendError(res, statusCode, (err as Error).message);
      } else {
        next(err);
      }
    }
  }

  /**
   * GET /api/tickets
   * Lists the authenticated author's own tickets with optional filters.
   */
  export async function listAuthorTicketsHandler(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const parseResult = listTicketsQuerySchema.safeParse(req.query);
      if (!parseResult.success) {
        const message = parseResult.error.errors.map((e) => e.message).join(', ');
        sendError(res, 400, message);
        return;
      }

      const result = await listAuthorTickets(req.user!.id, parseResult.data);
      sendSuccess(res, 200, 'Tickets retrieved.', {
        tickets: result.tickets,
        pagination: {
          total: result.total,
          page: result.page,
          limit: result.limit,
          totalPages: result.totalPages,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/tickets/:id
   * Returns full details of a single ticket owned by the authenticated author.
   */
  export async function getAuthorTicketHandler(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const ticketId = parseTicketId(req.params['id'], res);
      if (ticketId === null) return;

      const ticket = await getAuthorTicket(req.user!.id, ticketId);
      sendSuccess(res, 200, 'Ticket retrieved.', { ticket });
    } catch (err) {
      const statusCode = getStatusCode(err);
      if (statusCode) {
        sendError(res, statusCode, (err as Error).message);
      } else {
        next(err);
      }
    }
  }

  /**
   * POST /api/tickets/:id/messages
   * Adds a public message to the author's own ticket.
   */
  export async function addAuthorMessageHandler(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const ticketId = parseTicketId(req.params['id'], res);
      if (ticketId === null) return;

      const ticketMessage = await addAuthorMessage(
        req.user!.id,
        ticketId,
        req.body.message,
      );
      sendSuccess(res, 201, 'Message added.', { message: ticketMessage });
    } catch (err) {
      const statusCode = getStatusCode(err);
      if (statusCode) {
        sendError(res, statusCode, (err as Error).message);
      } else {
        next(err);
      }
    }
  }

  // ─── Admin Controllers ────────────────────────────────────────────────────────

  /**
   * GET /api/admin/tickets
   * Lists all tickets with optional filters (admin only).
   */
  export async function listAllTicketsHandler(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const parseResult = adminListTicketsQuerySchema.safeParse(req.query);
      if (!parseResult.success) {
        const message = parseResult.error.errors.map((e) => e.message).join(', ');
        sendError(res, 400, message);
        return;
      }

      const result = await listAllTickets(parseResult.data);
      sendSuccess(res, 200, 'Tickets retrieved.', {
        tickets: result.tickets,
        pagination: {
          total: result.total,
          page: result.page,
          limit: result.limit,
          totalPages: result.totalPages,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/admin/tickets/:id
   * Returns full details of any ticket including messages and internal notes (admin only).
   */
  export async function getAdminTicketHandler(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const ticketId = parseTicketId(req.params['id'], res);
      if (ticketId === null) return;

      const ticket = await getAdminTicket(ticketId);
      sendSuccess(res, 200, 'Ticket retrieved.', { ticket });
    } catch (err) {
      const statusCode = getStatusCode(err);
      if (statusCode) {
        sendError(res, statusCode, (err as Error).message);
      } else {
        next(err);
      }
    }
  }

  /**
   * PATCH /api/admin/tickets/:id
   * Updates status, category, priority, and/or assignment of a ticket (admin only).
   */
  export async function updateTicketHandler(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const ticketId = parseTicketId(req.params['id'], res);
      if (ticketId === null) return;

      const ticket = await updateTicket(ticketId, req.body);
      sendSuccess(res, 200, 'Ticket updated.', { ticket });
    } catch (err) {
      const statusCode = getStatusCode(err);
      if (statusCode) {
        sendError(res, statusCode, (err as Error).message);
      } else {
        next(err);
      }
    }
  }

  /**
   * POST /api/admin/tickets/:id/messages
   * Adds a public message from an admin to any ticket.
   */
  export async function addAdminMessageHandler(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const ticketId = parseTicketId(req.params['id'], res);
      if (ticketId === null) return;

      const ticketMessage = await addAdminMessage(
        req.user!.id,
        ticketId,
        req.body.message,
      );
      sendSuccess(res, 201, 'Message added.', { message: ticketMessage });
    } catch (err) {
      const statusCode = getStatusCode(err);
      if (statusCode) {
        sendError(res, statusCode, (err as Error).message);
      } else {
        next(err);
      }
    }
  }

  /**
   * POST /api/admin/tickets/:id/notes
   * Adds an internal note (visible to admins only) to any ticket.
   */
  export async function addInternalNoteHandler(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const ticketId = parseTicketId(req.params['id'], res);
      if (ticketId === null) return;

      const note = await addInternalNote(req.user!.id, ticketId, req.body.note);
      sendSuccess(res, 201, 'Internal note added.', { note });
    } catch (err) {
      const statusCode = getStatusCode(err);
      if (statusCode) {
        sendError(res, statusCode, (err as Error).message);
      } else {
        next(err);
      }
    }
  }
