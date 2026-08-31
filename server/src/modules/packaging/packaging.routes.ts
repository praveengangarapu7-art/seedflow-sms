import { Router } from 'express';
import { asyncHandler } from '../../middleware/asyncHandler';
import { requireAuth, requireRole } from '../../middleware/requireAuth';
import * as packagingController from './packaging.controller';

export const packagingRouter = Router();

packagingRouter.use(requireAuth);

packagingRouter.get('/batches', asyncHandler(packagingController.list));
packagingRouter.get('/batches/:id', asyncHandler(packagingController.getOne));
packagingRouter.get('/batches/:id/units', asyncHandler(packagingController.listUnits));
packagingRouter.get('/units/:unitId/label', asyncHandler(packagingController.getUnitLabel));

packagingRouter.post(
  '/batches',
  requireRole('Admin', 'Producer', 'Warehouse Manager'),
  asyncHandler(packagingController.create),
);
packagingRouter.post(
  '/units/:unitId/status',
  requireRole('Admin', 'Producer', 'Warehouse Manager'),
  asyncHandler(packagingController.updateUnitStatus),
);
