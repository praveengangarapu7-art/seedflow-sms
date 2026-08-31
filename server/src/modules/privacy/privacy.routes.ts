import { Router } from 'express';
import { asyncHandler } from '../../middleware/asyncHandler';
import { requireAuth, requireRole } from '../../middleware/requireAuth';
import * as privacyController from './privacy.controller';

export const privacyRouter = Router();

privacyRouter.use(requireAuth, requireRole('Admin'));

privacyRouter.get('/farmers/:id/export', asyncHandler(privacyController.exportFarmer));
privacyRouter.post('/farmers/:id/anonymize', asyncHandler(privacyController.anonymizeFarmer));
privacyRouter.get('/retention-policies', asyncHandler(privacyController.listRetentionPolicies));
privacyRouter.patch('/retention-policies/:entityType', asyncHandler(privacyController.updateRetentionPolicy));
privacyRouter.get('/retention-candidates', asyncHandler(privacyController.retentionCandidates));
privacyRouter.get('/compliance-audit', asyncHandler(privacyController.complianceAudit));
privacyRouter.get('/access-logs', asyncHandler(privacyController.accessLogs));
