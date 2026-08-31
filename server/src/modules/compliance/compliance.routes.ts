import { Router } from 'express';
import { asyncHandler } from '../../middleware/asyncHandler';
import { requireAuth, requireRole } from '../../middleware/requireAuth';
import * as complianceController from './compliance.controller';

export const complianceRouter = Router();

complianceRouter.use(requireAuth);

// Quality/regulatory testing and certificate sign-off are Inspector/Admin
// activities — the same authority that reviews audit logs.
complianceRouter.post('/purity-tests', requireRole('Admin', 'Inspector'), asyncHandler(complianceController.recordPurityTest));
complianceRouter.post(
  '/viability-tests',
  requireRole('Admin', 'Inspector'),
  asyncHandler(complianceController.recordViabilityTest),
);
complianceRouter.post(
  '/phytosanitary-certificates',
  requireRole('Admin', 'Inspector'),
  asyncHandler(complianceController.recordPhytosanitaryCertificate),
);

complianceRouter.get('/certificates/:certificateId', asyncHandler(complianceController.getCertificate));
complianceRouter.post(
  '/certificates/:certificateId/sign',
  requireRole('Admin', 'Inspector'),
  asyncHandler(complianceController.signCertificate),
);
