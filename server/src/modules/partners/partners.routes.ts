import { Router } from 'express';
import { asyncHandler } from '../../middleware/asyncHandler';
import { requireAuth, requireRole } from '../../middleware/requireAuth';
import * as partnersController from './partners.controller';

export const partnersRouter = Router();

partnersRouter.use(requireAuth);

// Links — establishing (and severing) the partnership that must exist
// before orders can flow between two organizations. A trust decision, so
// Admin-only, mirroring createOrganization.
partnersRouter.get('/links', asyncHandler(partnersController.listLinks));
partnersRouter.post('/links', requireRole('Admin'), asyncHandler(partnersController.requestLink));
partnersRouter.post('/links/:linkId/approve', requireRole('Admin'), asyncHandler(partnersController.approveLink));
partnersRouter.post('/links/:linkId/reject', requireRole('Admin'), asyncHandler(partnersController.rejectLink));
partnersRouter.post('/links/:linkId/suspend', requireRole('Admin'), asyncHandler(partnersController.suspendLink));
partnersRouter.post('/links/:linkId/reactivate', requireRole('Admin'), asyncHandler(partnersController.reactivateLink));

// Quality comparison — before catalog/:partnerOrgId routes so "quality-comparison" isn't captured as a partnerOrgId param.
partnersRouter.get('/quality-comparison', asyncHandler(partnersController.qualityComparison));

// Catalog / inventory sync — open read, matching this app's existing
// convention that seed lot reads aren't organization-scoped.
partnersRouter.get('/:partnerOrgId/catalog', asyncHandler(partnersController.getCatalog));
partnersRouter.post('/:partnerOrgId/sync', asyncHandler(partnersController.syncInventory));
partnersRouter.get('/:partnerOrgId/sync-history', asyncHandler(partnersController.getSyncHistory));
partnersRouter.get('/:partnerOrgId/rating', asyncHandler(partnersController.getRating));
partnersRouter.get('/:partnerOrgId/ratings', asyncHandler(partnersController.listRatings));

// Orders
partnersRouter.get('/orders', asyncHandler(partnersController.listOrders));
partnersRouter.get('/orders/:id', asyncHandler(partnersController.getOrder));
partnersRouter.post('/orders', requireRole('Admin', 'Producer', 'Warehouse Manager'), asyncHandler(partnersController.createOrder));
// Confirm/reject/ship are the seed-bank partner's side of the transaction —
// org-agnostic Warehouse Manager role, same as seed lot allocate/release.
partnersRouter.post('/orders/:id/confirm', requireRole('Admin', 'Warehouse Manager'), asyncHandler(partnersController.confirmOrder));
partnersRouter.post('/orders/:id/reject', requireRole('Admin', 'Warehouse Manager'), asyncHandler(partnersController.rejectOrder));
partnersRouter.post('/orders/:id/ship', requireRole('Admin', 'Warehouse Manager'), asyncHandler(partnersController.shipOrder));
// Receive/dispute are the buyer's side.
partnersRouter.post(
  '/orders/:id/receive',
  requireRole('Admin', 'Producer', 'Warehouse Manager'),
  asyncHandler(partnersController.receiveOrder),
);
partnersRouter.post(
  '/orders/:id/dispute',
  requireRole('Admin', 'Producer', 'Warehouse Manager'),
  asyncHandler(partnersController.disputeOrder),
);
partnersRouter.post(
  '/orders/:id/cancel',
  requireRole('Admin', 'Producer', 'Warehouse Manager'),
  asyncHandler(partnersController.cancelOrder),
);
