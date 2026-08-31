import { Router } from 'express';
import { asyncHandler } from '../../middleware/asyncHandler';
import { requireAuth, requireRole } from '../../middleware/requireAuth';
import * as varietiesController from './varieties.controller';

export const varietiesRouter = Router();

varietiesRouter.use(requireAuth);

// Catalog browsing is open to every authenticated role, same as seed-lots.
varietiesRouter.get('/', asyncHandler(varietiesController.list));
varietiesRouter.get('/:id', asyncHandler(varietiesController.getById));

varietiesRouter.post('/', requireRole('Admin', 'Breeder'), asyncHandler(varietiesController.create));
varietiesRouter.patch('/:id/draft', requireRole('Admin', 'Breeder'), asyncHandler(varietiesController.updateDraft));
varietiesRouter.post('/:id/submit-for-review', requireRole('Admin', 'Breeder'), asyncHandler(varietiesController.submit));
varietiesRouter.post('/:id/versions', requireRole('Admin', 'Breeder'), asyncHandler(varietiesController.createVersion));

// No route-level role gate on review — the breeding-committee role check AND
// the self-review guard both depend on runtime state (submitter identity),
// so they live inside the service, mirroring the certified-production
// workflow's per-stage approver check.
varietiesRouter.post('/:id/review', asyncHandler(varietiesController.review));

varietiesRouter.post('/:id/deprecate', requireRole('Admin'), asyncHandler(varietiesController.deprecate));
