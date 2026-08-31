import { Router } from 'express';
import { asyncHandler } from '../../middleware/asyncHandler';
import { requireAuth, requireRole } from '../../middleware/requireAuth';
import * as analyticsController from './analytics.controller';

export const analyticsRouter = Router();

analyticsRouter.use(requireAuth);

analyticsRouter.get('/dashboard', asyncHandler(analyticsController.dashboard));

// Harvest outcomes are reported by whoever manages the lot in the field/warehouse.
analyticsRouter.post(
  '/harvest-yields',
  requireRole('Admin', 'Breeder', 'Producer', 'Warehouse Manager'),
  asyncHandler(analyticsController.recordHarvestYield),
);

// Germination testing is a quality-inspection activity.
analyticsRouter.post(
  '/germination-tests',
  requireRole('Admin', 'Inspector'),
  asyncHandler(analyticsController.recordGerminationTest),
);
