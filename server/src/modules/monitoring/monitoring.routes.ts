import { Router } from 'express';
import { asyncHandler } from '../../middleware/asyncHandler';
import { requireAuth, requireRole } from '../../middleware/requireAuth';
import * as monitoringController from './monitoring.controller';

export const monitoringRouter = Router();

monitoringRouter.use(requireAuth);

// Any authenticated user's client can report a crash it hit.
monitoringRouter.post('/errors', asyncHandler(monitoringController.reportFrontendError));

// The rest is an operational dashboard — Admin-only, same authority as
// audit log review.
monitoringRouter.get('/errors', requireRole('Admin'), asyncHandler(monitoringController.listErrors));
monitoringRouter.get('/api-performance', requireRole('Admin'), asyncHandler(monitoringController.apiPerformance));
monitoringRouter.get('/failed-operations', requireRole('Admin'), asyncHandler(monitoringController.failedOperations));
monitoringRouter.get('/user-activity', requireRole('Admin'), asyncHandler(monitoringController.userActivity));
monitoringRouter.get('/data-consistency', requireRole('Admin'), asyncHandler(monitoringController.dataConsistency));
monitoringRouter.get('/anomalies', requireRole('Admin'), asyncHandler(monitoringController.anomalies));
