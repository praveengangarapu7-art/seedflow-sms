import { Router } from 'express';
import { asyncHandler } from '../../middleware/asyncHandler';
import { requireAuth, requireRole } from '../../middleware/requireAuth';
import * as feedbackLoopController from './feedbackLoop.controller';

export const feedbackLoopRouter = Router();

feedbackLoopRouter.use(requireAuth);

feedbackLoopRouter.get('/', asyncHandler(feedbackLoopController.list));
feedbackLoopRouter.get('/lot-performance', asyncHandler(feedbackLoopController.lotPerformance));
feedbackLoopRouter.get('/breeder-performance', asyncHandler(feedbackLoopController.breederPerformance));
feedbackLoopRouter.get('/environmental-adaptation', asyncHandler(feedbackLoopController.environmentalAdaptation));

// Recording field observations is an inspection activity, same authority
// as germination/purity/viability testing.
feedbackLoopRouter.post('/', requireRole('Admin', 'Inspector'), asyncHandler(feedbackLoopController.record));
