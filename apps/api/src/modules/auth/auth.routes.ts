import { Router } from 'express';
import { login, logout, me } from './auth.controller';
import { authenticate } from '../../middleware/authenticate';

const router = Router();

/** POST /api/auth/login — public */
router.post('/login', login);

/** POST /api/auth/logout — requires a valid cookie (best-effort) */
router.post('/logout', logout);

/** GET /api/auth/me — protected */
router.get('/me', authenticate, me);

export default router;

