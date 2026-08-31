import { Router } from 'express';
import { asyncHandler } from '../../middleware/asyncHandler';
import { requireAuth, requireRole } from '../../middleware/requireAuth';
import * as workflowsController from './workflows.controller';

export const workflowsRouter = Router();

workflowsRouter.use(requireAuth);

workflowsRouter.get('/', asyncHandler(workflowsController.list));
workflowsRouter.get('/:id', asyncHandler(workflowsController.getOne));

workflowsRouter.post(
  '/',
  requireRole('Admin', 'Breeder', 'Producer'),
  asyncHandler(workflowsController.start),
);

// Each stage has a different owning department/role (Inspection, Production,
// Quality, Marketing) — that varies per :stageKey, which a static
// requireRole(...) can't express, so the allowed-roles check happens inside
// workflows.service against that stage's own definition.
workflowsRouter.post('/:id/stages/:stageKey/approve', asyncHandler(workflowsController.approve));
workflowsRouter.post('/:id/stages/:stageKey/reject', asyncHandler(workflowsController.reject));

workflowsRouter.post('/:id/cancel', requireRole('Admin'), asyncHandler(workflowsController.cancel));
