import { Router } from 'express';
import { asyncHandler } from '../../middleware/asyncHandler';
import { requireAuth, requireRole } from '../../middleware/requireAuth';
import * as seedRequestsController from './seedRequests.controller';

export const seedRequestsRouter = Router();

seedRequestsRouter.use(requireAuth);

seedRequestsRouter.get('/', asyncHandler(seedRequestsController.list));
seedRequestsRouter.get('/distribution-lists', asyncHandler(seedRequestsController.distributionLists));
// Farmer Portal "My Allocations" (Extend #9) — registered ahead of the
// /:id catch-all for the same reason /distribution-lists is: a literal
// path segment, not a request id.
seedRequestsRouter.get('/my-allocations', asyncHandler(seedRequestsController.myAllocations));
seedRequestsRouter.get('/:id', asyncHandler(seedRequestsController.getOne));

seedRequestsRouter.post(
  '/',
  requireRole('Admin', 'Producer', 'Warehouse Manager'),
  asyncHandler(seedRequestsController.create),
);
seedRequestsRouter.post(
  '/:id/approve',
  requireRole('Admin', 'Producer', 'Warehouse Manager'),
  asyncHandler(seedRequestsController.approve),
);
seedRequestsRouter.post(
  '/:id/reject',
  requireRole('Admin', 'Producer', 'Warehouse Manager'),
  asyncHandler(seedRequestsController.reject),
);
seedRequestsRouter.post(
  '/:id/cancel',
  requireRole('Admin', 'Producer', 'Warehouse Manager'),
  asyncHandler(seedRequestsController.cancel),
);
// Fulfillment and delivery are the distribution partner's job — modeled as
// the org-agnostic Warehouse Manager role, same as seed lot allocate/release.
seedRequestsRouter.post('/:id/fulfill', requireRole('Admin', 'Warehouse Manager'), asyncHandler(seedRequestsController.fulfill));
seedRequestsRouter.post('/:id/deliver', requireRole('Admin', 'Warehouse Manager'), asyncHandler(seedRequestsController.deliver));
