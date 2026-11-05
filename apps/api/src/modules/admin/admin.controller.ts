import { Request, Response, NextFunction } from 'express';
import { User } from '../../models/User';
import { sendSuccess } from '../../utils/apiResponse';

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

