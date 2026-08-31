import { Router } from 'express';
import { asyncHandler } from '../../middleware/asyncHandler';
import { requireAuth, requireRole } from '../../middleware/requireAuth';
import * as demandPlanningController from './demandPlanning.controller';

export const demandPlanningRouter = Router();

demandPlanningRouter.use(requireAuth);

// Stateless calculation over live inventory — open to every role, like the
// other analytics reads.
demandPlanningRouter.post('/forecast', asyncHandler(demandPlanningController.forecast));
demandPlanningRouter.get('/inventory-optimization', asyncHandler(demandPlanningController.inventoryOptimization));

demandPlanningRouter.get('/purchase-orders', asyncHandler(demandPlanningController.listPurchaseOrders));
demandPlanningRouter.get('/purchase-orders/:id', asyncHandler(demandPlanningController.getPurchaseOrder));

demandPlanningRouter.post(
  '/purchase-orders',
  requireRole('Admin', 'Producer', 'Warehouse Manager'),
  asyncHandler(demandPlanningController.generatePurchaseOrder),
);

// Which roles may apply which target status varies (procurement drives
// sent/cancelled, the receiving breeder drives acknowledged/fulfilled) — so
// that check happens inside the service against STATUS_APPROVER_ROLES,
// the same dynamic-per-target-value pattern used for workflow stage RBAC.
demandPlanningRouter.post('/purchase-orders/:id/status', asyncHandler(demandPlanningController.updatePurchaseOrderStatus));
