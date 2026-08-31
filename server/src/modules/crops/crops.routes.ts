import { Router } from 'express';
import { asyncHandler } from '../../middleware/asyncHandler';
import { requireAuth, requireRole } from '../../middleware/requireAuth';
import * as cropsController from './crops.controller';

export const cropsRouter = Router();

cropsRouter.use(requireAuth);

// Catalog browsing is open to every authenticated role, same as varieties/seed-lots.
cropsRouter.get('/', asyncHandler(cropsController.list));
cropsRouter.get('/:id', asyncHandler(cropsController.getById));

cropsRouter.post('/', requireRole('Admin'), asyncHandler(cropsController.create));
cropsRouter.put('/:id', requireRole('Admin'), asyncHandler(cropsController.update));
cropsRouter.delete('/:id', requireRole('Admin'), asyncHandler(cropsController.remove));
