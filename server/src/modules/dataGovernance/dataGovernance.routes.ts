import { Router } from 'express';
import { asyncHandler } from '../../middleware/asyncHandler';
import { requireAuth, requireRole } from '../../middleware/requireAuth';
import * as dataGovernanceController from './dataGovernance.controller';

export const dataGovernanceRouter = Router();

dataGovernanceRouter.use(requireAuth);

dataGovernanceRouter.get('/violations', requireRole('Admin', 'Inspector'), asyncHandler(dataGovernanceController.violations));
dataGovernanceRouter.get('/reconciliation', requireRole('Admin', 'Inspector'), asyncHandler(dataGovernanceController.reconciliation));
dataGovernanceRouter.get('/orphan-lots', requireRole('Admin', 'Inspector'), asyncHandler(dataGovernanceController.orphanLots));
dataGovernanceRouter.get('/corrections', requireRole('Admin', 'Inspector'), asyncHandler(dataGovernanceController.correctionHistory));

// Submitting a physical count is a warehouse-floor activity, same authority
// as the inventory operations in the storage module.
dataGovernanceRouter.post(
  '/inventory-counts',
  requireRole('Admin', 'Inspector', 'Warehouse Manager'),
  asyncHandler(dataGovernanceController.recordCount),
);

// Archival and quantity correction are Admin-only: both mutate the
// authoritative record outside the normal allocation/production flow.
dataGovernanceRouter.post(
  '/orphan-lots/:id/archive',
  requireRole('Admin'),
  asyncHandler(dataGovernanceController.archiveOrphan),
);
dataGovernanceRouter.post(
  '/seed-lots/:id/correct-quantity',
  requireRole('Admin'),
  asyncHandler(dataGovernanceController.correctQuantity),
);
