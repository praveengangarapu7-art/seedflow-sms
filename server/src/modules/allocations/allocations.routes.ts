import { Router } from 'express';
import { asyncHandler } from '../../middleware/asyncHandler';
import { requireAuth, requireRole } from '../../middleware/requireAuth';
import * as allocationsController from './allocations.controller';

export const allocationsRouter = Router();

allocationsRouter.use(requireAuth);
// Registered ahead of the /:id/... routes for the same reason seedLots'
// /search is: "bulk-allocate" is a literal path segment, not an allocation id.
allocationsRouter.post(
  '/bulk-allocate',
  requireRole('Admin', 'Breeder', 'Producer', 'Warehouse Manager'),
  asyncHandler(allocationsController.bulkAllocate),
);
allocationsRouter.post(
  '/:id/release',
  requireRole('Admin', 'Breeder', 'Producer', 'Warehouse Manager'),
  asyncHandler(allocationsController.release),
);
