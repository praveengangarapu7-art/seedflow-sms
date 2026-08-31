import { Router } from 'express';
import { asyncHandler } from '../../middleware/asyncHandler';
import { requireAuth } from '../../middleware/requireAuth';
import * as reconciliationController from './reconciliation.controller';

export const reconciliationRouter = Router();

reconciliationRouter.use(requireAuth);

// Read-only diagnostic scan — no mutation happens here, so it's open to
// every authenticated role, same as browsing the master-data catalogs it
// checks (farmers/organizations/crops).
reconciliationRouter.post('/reconcile', asyncHandler(reconciliationController.reconcile));
