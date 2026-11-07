import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import {
  createTicketHandler,
  listAuthorTicketsHandler,
  getAuthorTicketHandler,
  addAuthorMessageHandler,
  listAllTicketsHandler,
  getAdminTicketHandler,
  updateTicketHandler,
  addAdminMessageHandler,
  addInternalNoteHandler,
} from './ticket.controller';
import {
  createTicketSchema,
  addMessageSchema,
  addNoteSchema,
  adminUpdateTicketSchema,
} from './ticket.schema';
import { generateAIDraftHandler } from '../admin/admin.controller';

// ─── Author Router (mounted at /api/tickets) ──────────────────────────────────
export const authorTicketRouter = Router();

// Apply authenticate and authorize('author') to all author ticket routes
authorTicketRouter.use(authenticate, authorize('author'));

/** POST /api/tickets — Create a ticket */
authorTicketRouter.post('/', validate(createTicketSchema), createTicketHandler);

/** GET /api/tickets — List author's tickets */
authorTicketRouter.get('/', listAuthorTicketsHandler);

/** GET /api/tickets/:id — Get a single ticket details and messages */
authorTicketRouter.get('/:id', getAuthorTicketHandler);

/** POST /api/tickets/:id/messages — Add a message to author's ticket */
authorTicketRouter.post(
  '/:id/messages',
  validate(addMessageSchema),
  addAuthorMessageHandler,
);

// ─── Admin Router (mounted at /api/admin/tickets) ─────────────────────────────
export const adminTicketRouter = Router();

// Apply authenticate and authorize('admin') to all admin ticket routes
adminTicketRouter.use(authenticate, authorize('admin'));

/** GET /api/admin/tickets — List all tickets with filters */
adminTicketRouter.get('/', listAllTicketsHandler);

/** GET /api/admin/tickets/:id — Get full ticket details with messages and internal notes */
adminTicketRouter.get('/:id', getAdminTicketHandler);

/** PATCH /api/admin/tickets/:id — Update ticket status/category/priority/assigned_to */
adminTicketRouter.patch(
  '/:id',
  validate(adminUpdateTicketSchema),
  updateTicketHandler,
);

/** POST /api/admin/tickets/:id/messages — Add public admin message */
adminTicketRouter.post(
  '/:id/messages',
  validate(addMessageSchema),
  addAdminMessageHandler,
);

/** POST /api/admin/tickets/:id/notes — Add private internal note */
adminTicketRouter.post(
  '/:id/notes',
  validate(addNoteSchema),
  addInternalNoteHandler,
);

/** POST /api/admin/tickets/:id/ai-draft — Generate AI-assisted reply draft (admin only, not saved/sent) */
adminTicketRouter.post('/:id/ai-draft', generateAIDraftHandler);

