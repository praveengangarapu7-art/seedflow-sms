import { Router } from 'express';
import { asyncHandler } from '../../middleware/asyncHandler';
import { requireAuth, requireRole } from '../../middleware/requireAuth';
import * as performanceRatingsController from './performanceRatings.controller';

export const performanceRatingsRouter = Router();

performanceRatingsRouter.use(requireAuth);

performanceRatingsRouter.get('/', asyncHandler(performanceRatingsController.list));
performanceRatingsRouter.get('/variety-effectiveness', asyncHandler(performanceRatingsController.varietyEffectiveness));
performanceRatingsRouter.post(
  '/',
  requireRole('Admin', 'Producer', 'Warehouse Manager', 'Inspector'),
  asyncHandler(performanceRatingsController.submit),
);
