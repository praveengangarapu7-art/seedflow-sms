import { Router } from 'express';
import { asyncHandler } from '../../middleware/asyncHandler';
import { requireAuth, requireRole } from '../../middleware/requireAuth';
import * as cropPlanningController from './cropPlanning.controller';

export const cropPlanningRouter = Router();

cropPlanningRouter.use(requireAuth);

cropPlanningRouter.get('/farms', asyncHandler(cropPlanningController.listFarmsHandler));
cropPlanningRouter.get('/recommendations', asyncHandler(cropPlanningController.recommendations));
cropPlanningRouter.get('/crop-history', asyncHandler(cropPlanningController.cropHistory));
cropPlanningRouter.get('/seed-quantity', asyncHandler(cropPlanningController.seedQuantity));
cropPlanningRouter.get('/advisory', asyncHandler(cropPlanningController.advisory));
cropPlanningRouter.get('/plans', asyncHandler(cropPlanningController.list));
cropPlanningRouter.get('/plans/:id', asyncHandler(cropPlanningController.getById));
// Farmer-Centric Features: "Recommended Seed Lots" step, ranking candidate
// lots for this draft plan's exact crop/variety by certified status,
// germination %, available quantity, and storage zone proximity.
cropPlanningRouter.get('/plans/:id/seed-lot-recommendations', asyncHandler(cropPlanningController.seedLotRecommendations));

// Same authority split as seedRequests: creating/drafting a plan (no
// inventory touched yet) is Admin/Producer/Warehouse Manager, same as
// creating a seed request. Reserving/confirming/cancelling call the real
// allocate()/release() primitives underneath, which enforce organization
// ownership for non-exempt roles — exactly like seedRequests' fulfill/deliver
// routes, this is Admin/Warehouse Manager only, not Producer.
cropPlanningRouter.post('/farms', requireRole('Admin', 'Producer', 'Warehouse Manager'), asyncHandler(cropPlanningController.createFarmHandler));
cropPlanningRouter.post('/plans', requireRole('Admin', 'Producer', 'Warehouse Manager'), asyncHandler(cropPlanningController.createDraft));
cropPlanningRouter.post('/plans/:id/reserve', requireRole('Admin', 'Warehouse Manager'), asyncHandler(cropPlanningController.reserve));
cropPlanningRouter.post('/plans/:id/confirm', requireRole('Admin', 'Warehouse Manager'), asyncHandler(cropPlanningController.confirm));
cropPlanningRouter.post('/plans/:id/cancel', requireRole('Admin', 'Warehouse Manager'), asyncHandler(cropPlanningController.cancel));
