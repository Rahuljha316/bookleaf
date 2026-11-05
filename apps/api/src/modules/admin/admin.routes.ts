import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { listAdminsHandler } from './admin.controller';

export const adminUserRouter = Router();

adminUserRouter.use(authenticate, authorize('admin'));

/** GET /api/admin/admins — list all admin users */
adminUserRouter.get('/', listAdminsHandler);

