import { Router } from 'express';
import { asyncHandler } from '../../middleware/asyncHandler';
import { requireAuth, requireRole } from '../../middleware/requireAuth';
import * as usersController from './users.controller';

export const usersRouter = Router();

// User administration is Admin-only, without exception. Note this is the
// BACKEND role (Admin/Breeder/Producer/Inspector/Warehouse Manager), not the
// Administration module's front-end roles — the front-end super_admin and
// system_admin roles both map onto the backend Admin account, while
// compliance_auditor maps to Inspector and therefore cannot reach any of
// these endpoints at all. See src/pages/admin/useAdminSession.ts.
usersRouter.use(requireAuth, requireRole('Admin'));

usersRouter.get('/', asyncHandler(usersController.list));
usersRouter.get('/stats', asyncHandler(usersController.stats));
usersRouter.get('/roles', asyncHandler(usersController.roles));
usersRouter.get('/:id', asyncHandler(usersController.getById));
usersRouter.post('/', asyncHandler(usersController.create));
usersRouter.patch('/:id', asyncHandler(usersController.update));
usersRouter.post('/:id/reset-password', asyncHandler(usersController.resetPassword));
