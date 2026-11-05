import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { listAuthorBooksHandler } from './author.controller';

export const authorBookRouter = Router();

authorBookRouter.use(authenticate, authorize('author'));

/** GET /api/books — list all books belonging to authenticated author */
authorBookRouter.get('/', listAuthorBooksHandler);

