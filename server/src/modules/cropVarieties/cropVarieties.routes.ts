import { Router } from 'express';
import { asyncHandler } from '../../middleware/asyncHandler';
import { requireAuth, requireRole } from '../../middleware/requireAuth';
import * as cropVarietiesController from './cropVarieties.controller';

export const cropVarietiesRouter = Router();

cropVarietiesRouter.use(requireAuth);

// Catalog browsing is open to every authenticated role, same as crops/varieties.
cropVarietiesRouter.get('/', asyncHandler(cropVarietiesController.list));
cropVarietiesRouter.get('/:id', asyncHandler(cropVarietiesController.getById));

cropVarietiesRouter.post('/', requireRole('Admin', 'Breeder'), asyncHandler(cropVarietiesController.create));
cropVarietiesRouter.put('/:id', requireRole('Admin', 'Breeder'), asyncHandler(cropVarietiesController.update));
cropVarietiesRouter.post('/:id/submit-for-review', requireRole('Admin', 'Breeder'), asyncHandler(cropVarietiesController.submitForReview));

// Approve/reject are Admin-only at the route level too — belt and suspenders
// with the same check inside the service.
cropVarietiesRouter.post('/:id/approve', requireRole('Admin'), asyncHandler(cropVarietiesController.approve));
cropVarietiesRouter.post('/:id/reject', requireRole('Admin'), asyncHandler(cropVarietiesController.reject));

cropVarietiesRouter.delete('/:id', requireRole('Admin'), asyncHandler(cropVarietiesController.remove));
