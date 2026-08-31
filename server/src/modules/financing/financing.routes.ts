import { Router } from 'express';
import { asyncHandler } from '../../middleware/asyncHandler';
import { requireAuth, requireRole } from '../../middleware/requireAuth';
import * as financingController from './financing.controller';
import { FINANCING_REQUEST_ROLES } from './financing.service';

export const financingRouter = Router();

financingRouter.use(requireAuth);

// Reads are open to every authenticated role, matching this app's general
// convention. Requesting financing is open to whoever manages the relevant
// relationship; approval/disbursement/repayment-recording/default are all
// Admin-only inside the service (role checks depend on which action, not a
// single fixed set, so they're not all expressed as route-level requireRole).
financingRouter.get('/accounts', asyncHandler(financingController.listFinancingAccounts));
financingRouter.get('/accounts/:id', asyncHandler(financingController.getFinancingAccount));
financingRouter.post('/accounts', requireRole(...FINANCING_REQUEST_ROLES), asyncHandler(financingController.requestFinancing));

financingRouter.post('/accounts/:id/approve', asyncHandler(financingController.approveFinancing));
financingRouter.post('/accounts/:id/reject', asyncHandler(financingController.rejectFinancing));
financingRouter.post('/accounts/:id/disburse', asyncHandler(financingController.disburseFinancing));
financingRouter.post('/accounts/:id/trigger-repayment', asyncHandler(financingController.triggerPostHarvestRepayment));
financingRouter.post('/accounts/:id/repay', asyncHandler(financingController.recordRepayment));
financingRouter.post('/accounts/:id/default', asyncHandler(financingController.markFinancingDefaulted));

financingRouter.get('/accounts/:id/accrued-interest', asyncHandler(financingController.getAccruedInterest));
financingRouter.get('/seed-lots/:seedLotId/financing-costs', asyncHandler(financingController.getFinancingCostsForLot));
financingRouter.get('/insurance-context', asyncHandler(financingController.getInsuranceContext));
