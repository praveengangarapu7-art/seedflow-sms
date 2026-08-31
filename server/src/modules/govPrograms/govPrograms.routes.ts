import { Router } from 'express';
import { asyncHandler } from '../../middleware/asyncHandler';
import { requireAuth, requireRole } from '../../middleware/requireAuth';
import * as govProgramsController from './govPrograms.controller';

export const govProgramsRouter = Router();

govProgramsRouter.use(requireAuth);

// --- Registrations ---
govProgramsRouter.get('/registrations', asyncHandler(govProgramsController.listRegistrations));
govProgramsRouter.get('/seed-lots/:seedLotId/registrations', asyncHandler(govProgramsController.listRegistrationsForLot));
govProgramsRouter.post(
  '/seed-lots/:seedLotId/registrations',
  requireRole('Admin', 'Breeder', 'Producer'),
  asyncHandler(govProgramsController.submitRegistration),
);
// Approve/reject is the regulatory sign-off — same authority as compliance certificate issuance elsewhere in this app.
govProgramsRouter.post(
  '/registrations/:id/approve',
  requireRole('Admin', 'Inspector'),
  asyncHandler(govProgramsController.approveRegistration),
);
govProgramsRouter.post(
  '/registrations/:id/reject',
  requireRole('Admin', 'Inspector'),
  asyncHandler(govProgramsController.rejectRegistration),
);

// --- Subsidy programs ---
govProgramsRouter.get('/subsidy-programs', asyncHandler(govProgramsController.listSubsidyPrograms));
govProgramsRouter.get('/subsidy-programs/:id', asyncHandler(govProgramsController.getSubsidyProgram));
// Defining a subsidy program is a policy-setting action — Admin only, same trust level as createOrganization.
govProgramsRouter.post('/subsidy-programs', requireRole('Admin'), asyncHandler(govProgramsController.createSubsidyProgram));
govProgramsRouter.post('/subsidy-programs/:id/activate', requireRole('Admin'), asyncHandler(govProgramsController.activateSubsidyProgram));
govProgramsRouter.post('/subsidy-programs/:id/deactivate', requireRole('Admin'), asyncHandler(govProgramsController.deactivateSubsidyProgram));

// --- Subsidy claims ---
govProgramsRouter.get('/subsidy-claims', asyncHandler(govProgramsController.listSubsidyClaims));
govProgramsRouter.get('/subsidy-claims/:id', asyncHandler(govProgramsController.getSubsidyClaim));
govProgramsRouter.post(
  '/subsidy-claims',
  requireRole('Admin', 'Producer', 'Warehouse Manager'),
  asyncHandler(govProgramsController.submitSubsidyClaim),
);
govProgramsRouter.post(
  '/subsidy-claims/:id/approve',
  requireRole('Admin', 'Inspector'),
  asyncHandler(govProgramsController.approveSubsidyClaim),
);
govProgramsRouter.post(
  '/subsidy-claims/:id/reject',
  requireRole('Admin', 'Inspector'),
  asyncHandler(govProgramsController.rejectSubsidyClaim),
);
// Disbursement is a financial action — Admin only.
govProgramsRouter.post('/subsidy-claims/:id/pay', requireRole('Admin'), asyncHandler(govProgramsController.paySubsidyClaim));

// --- Reports ---
govProgramsRouter.get('/reports', asyncHandler(govProgramsController.listReports));
govProgramsRouter.get('/reports/:id', asyncHandler(govProgramsController.getReport));
govProgramsRouter.post(
  '/reports/:reportType',
  requireRole('Admin', 'Inspector'),
  asyncHandler(govProgramsController.generateReport),
);
