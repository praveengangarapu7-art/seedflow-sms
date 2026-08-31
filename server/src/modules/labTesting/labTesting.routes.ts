import { Router } from 'express';
import { asyncHandler } from '../../middleware/asyncHandler';
import { requireAuth, requireRole } from '../../middleware/requireAuth';
import * as labTestingController from './labTesting.controller';

export const labTestingRouter = Router();

labTestingRouter.use(requireAuth);

labTestingRouter.get('/submissions', asyncHandler(labTestingController.list));
labTestingRouter.get('/submissions/:id', asyncHandler(labTestingController.getById));
labTestingRouter.get('/quality-flags', asyncHandler(labTestingController.listFlags));
labTestingRouter.get('/lab-performance', asyncHandler(labTestingController.labPerformance));
// Certificates this module itself issued from completed submissions — see
// listCertificatesIssuedFromSubmissions for why compliance-module-authored
// certificates are deliberately excluded.
labTestingRouter.get('/certificates', asyncHandler(labTestingController.listIssuedCertificates));

// Submitting samples is a request, not a lab activity — any role that owns
// the lot may initiate it (ownership itself is checked in the service).
labTestingRouter.post(
  '/submissions',
  requireRole('Admin', 'Inspector', 'Breeder', 'Producer'),
  asyncHandler(labTestingController.submit),
);

// Receiving results back FROM the lab (manual entry or a bulk file/API
// upload) and everything downstream of it is Admin/Inspector authority, the
// same gate the existing compliance module uses for recording test results.
labTestingRouter.post(
  '/submissions/:id/results',
  requireRole('Admin', 'Inspector'),
  asyncHandler(labTestingController.recordResult),
);
labTestingRouter.post(
  '/submissions/:id/results/bulk-upload',
  requireRole('Admin', 'Inspector'),
  asyncHandler(labTestingController.bulkUpload),
);
labTestingRouter.post(
  '/submissions/:id/phytosanitary-certificate',
  requireRole('Admin', 'Inspector'),
  asyncHandler(labTestingController.generatePhytosanitary),
);
labTestingRouter.post('/quality-flags/:id/resolve', requireRole('Admin', 'Inspector'), asyncHandler(labTestingController.resolveFlag));
