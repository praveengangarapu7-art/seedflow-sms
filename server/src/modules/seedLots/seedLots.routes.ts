import { Router } from 'express';
import { asyncHandler } from '../../middleware/asyncHandler';
import { requireAuth, requireRole } from '../../middleware/requireAuth';
import * as allocationsController from '../allocations/allocations.controller';
import * as complianceController from '../compliance/compliance.controller';
import * as seedLotsController from './seedLots.controller';

export const seedLotsRouter = Router();

seedLotsRouter.use(requireAuth);

// Read access is open to every authenticated role, including Inspector and
// Warehouse Manager, who never create or edit lots themselves.
seedLotsRouter.get('/', asyncHandler(seedLotsController.list));
// Registered ahead of the /:id catch-all so "search" and "search/..." are
// never swallowed as a lot id.
seedLotsRouter.get('/search', asyncHandler(seedLotsController.search));
seedLotsRouter.get('/search/filter-options', asyncHandler(seedLotsController.searchFilterOptions));
// Saved searches (Extend #18) — personal to the requesting user, so no
// role restriction beyond being authenticated. Also registered ahead of
// the /:id catch-all for the same literal-path-segment reason.
seedLotsRouter.get('/saved-searches', asyncHandler(seedLotsController.listMySavedSearches));
seedLotsRouter.post('/saved-searches', asyncHandler(seedLotsController.saveSearch));
seedLotsRouter.delete('/saved-searches/:id', asyncHandler(seedLotsController.removeSavedSearch));
// Bulk endpoints — registered ahead of the /:id catch-all for the same
// reason /search is: these are literal path segments, not lot ids. Each
// row/item is validated and processed independently (partial success),
// which is the point of a bulk-with-validation endpoint.
seedLotsRouter.post('/bulk-create', requireRole('Admin', 'Breeder', 'Producer'), asyncHandler(seedLotsController.bulkCreate));
seedLotsRouter.post('/bulk-update', requireRole('Admin', 'Breeder', 'Producer'), asyncHandler(seedLotsController.bulkUpdate));
seedLotsRouter.post('/bulk-delete', requireRole('Admin', 'Breeder', 'Producer'), asyncHandler(seedLotsController.bulkDelete));
seedLotsRouter.post('/bulk-import-csv', requireRole('Admin', 'Breeder', 'Producer'), asyncHandler(seedLotsController.importCsv));
// Quick actions (Batch Operations for Seed Lots): mutating actions share the
// same write-role gate as the other bulk-* endpoints above; Print Labels is
// read + audit-log only, so it's open to the same broader set /:id/allocate
// uses (Warehouse Manager included) since it never touches lot data.
seedLotsRouter.post('/bulk-quick-action', requireRole('Admin', 'Breeder', 'Producer'), asyncHandler(seedLotsController.bulkQuickAction));
seedLotsRouter.post(
  '/bulk-print-labels',
  requireRole('Admin', 'Breeder', 'Producer', 'Warehouse Manager'),
  asyncHandler(seedLotsController.bulkPrintLabels),
);
// Manual trigger for the genealogy materialized view (migration 034) — it
// already auto-refreshes (fire-and-forget) after every lot creation, so
// this is only for ops/debugging when a refresh needs to happen sooner.
seedLotsRouter.post('/genealogy/refresh', requireRole('Admin'), asyncHandler(seedLotsController.refreshGenealogy));
seedLotsRouter.get('/:id', asyncHandler(seedLotsController.getOne));
seedLotsRouter.get('/:id/children', asyncHandler(seedLotsController.getChildren));
seedLotsRouter.get('/:id/allocations', asyncHandler(allocationsController.listBySeedLot));
seedLotsRouter.get('/:id/allocation-history', asyncHandler(allocationsController.history));
seedLotsRouter.get('/:id/genealogy', asyncHandler(seedLotsController.genealogy));
seedLotsRouter.get('/:id/quality-metrics', asyncHandler(complianceController.getQualityMetrics));
seedLotsRouter.get('/:id/compliance-chain', asyncHandler(complianceController.getComplianceChain));
seedLotsRouter.get('/:id/certificates', asyncHandler(complianceController.listCertificates));
seedLotsRouter.post(
  '/:id/certificates',
  requireRole('Admin', 'Inspector'),
  asyncHandler(complianceController.generateCertificate),
);

seedLotsRouter.post('/', requireRole('Admin', 'Breeder', 'Producer'), asyncHandler(seedLotsController.create));
seedLotsRouter.put('/:id', requireRole('Admin', 'Breeder', 'Producer'), asyncHandler(seedLotsController.update));
seedLotsRouter.delete('/:id', requireRole('Admin', 'Breeder', 'Producer'), asyncHandler(seedLotsController.remove));

// Warehouse Manager allocates/distributes stock across organizations;
// Breeder/Producer may only allocate from lots their own org owns
// (enforced inside allocations.service, not by role alone).
seedLotsRouter.post(
  '/:id/allocate',
  requireRole('Admin', 'Breeder', 'Producer', 'Warehouse Manager'),
  asyncHandler(allocationsController.allocate),
);
