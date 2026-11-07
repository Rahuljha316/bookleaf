import { Request, Response, NextFunction } from 'express';
import { User } from '../../models/User';
import { sendSuccess, sendError } from '../../utils/apiResponse';
import { generateDraft } from '../../ai';

/**
 * GET /api/admin/admins
 * Returns all users with role 'admin' for ticket assignment and filtering.
 */
export async function listAdminsHandler(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const admins = await User.findAll({
      where: { role: 'admin' },
      attributes: ['id', 'name', 'email', 'role'],
      order: [['name', 'ASC']],
    });

    sendSuccess(res, 200, 'Admin users retrieved.', { admins });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/admin/tickets/:id/ai-draft
 *
 * Generates an AI-assisted reply draft for the given ticket.
 *
 * Security:
 *  - Only authenticated admins can reach this handler (enforced by middleware).
 *  - Internal notes are NEVER included in the AI prompt.
 *  - The draft is returned to the admin for review — it is NOT saved or sent.
 *  - The ticket is NOT modified in any way.
 *  - AI provider errors are caught and never exposed to the client.
 */
export async function generateAIDraftHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const raw = Array.isArray(req.params['id']) ? req.params['id'][0] : req.params['id'];
    const ticketId = parseInt(raw ?? '', 10);
    if (isNaN(ticketId) || ticketId <= 0) {
      sendError(res, 400, 'Invalid ticket ID.');
      return;
    }

    const result = await generateDraft(ticketId);

    if (result.status === 'unavailable') {
      sendError(
        res,
        503,
        'AI draft generation is temporarily unavailable. Please write your response manually.',
      );
      return;
    }

    sendSuccess(res, 200, 'AI draft generated successfully.', { draft: result.draft });
  } catch (err) {
    // Handle 404 from fetchDraftContext
    const statusCode =
      err instanceof Error && (err as Error & { statusCode?: number }).statusCode
        ? (err as Error & { statusCode: number }).statusCode
        : null;

    if (statusCode === 404) {
      sendError(res, 404, (err as Error).message);
    } else {
      next(err);
    }
  }
}

