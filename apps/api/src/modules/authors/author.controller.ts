import { Request, Response, NextFunction } from 'express';
import { Book } from '../../models/Book';
import { sendSuccess } from '../../utils/apiResponse';

/**
 * GET /api/books
 * Retrieves all books belonging to the authenticated author.
 */
export async function listAuthorBooksHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const authorUserId = req.user!.id;
    const books = await Book.findAll({
      where: { author_user_id: authorUserId },
      order: [
        ['publication_date', 'DESC'],
        ['created_at', 'DESC'],
      ],
    });

    sendSuccess(res, 200, 'Author books retrieved.', { books });
  } catch (err) {
    next(err);
  }
}

