import { Router } from 'express';
import { asyncHandler } from '../../middleware/asyncHandler';
import { requireAuth, requireRole } from '../../middleware/requireAuth';
import * as farmersController from './farmers.controller';

export const farmersRouter = Router();

farmersRouter.use(requireAuth);

farmersRouter.get('/', asyncHandler(farmersController.list));
farmersRouter.get('/:id', asyncHandler(farmersController.getOne));
farmersRouter.post('/', requireRole('Admin', 'Producer', 'Warehouse Manager'), asyncHandler(farmersController.create));
farmersRouter.put('/:id', requireRole('Admin', 'Producer', 'Warehouse Manager'), asyncHandler(farmersController.update));
farmersRouter.delete('/:id', requireRole('Admin', 'Producer', 'Warehouse Manager'), asyncHandler(farmersController.remove));
