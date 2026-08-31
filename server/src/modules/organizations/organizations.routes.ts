import { Router } from 'express';
import { asyncHandler } from '../../middleware/asyncHandler';
import { requireAuth, requireRole } from '../../middleware/requireAuth';
import * as organizationsController from './organizations.controller';

export const organizationsRouter = Router();

organizationsRouter.use(requireAuth);
organizationsRouter.get('/', asyncHandler(organizationsController.list));
organizationsRouter.get('/:id', asyncHandler(organizationsController.getById));
organizationsRouter.post('/', requireRole('Admin'), asyncHandler(organizationsController.create));
organizationsRouter.put('/:id', requireRole('Admin'), asyncHandler(organizationsController.update));
organizationsRouter.delete('/:id', requireRole('Admin'), asyncHandler(organizationsController.remove));
