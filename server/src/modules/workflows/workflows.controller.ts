import type { Request, Response } from 'express';
import { ValidationError } from '../../errors';
import * as workflowsService from './workflows.service';
import { WORKFLOW_STAGE_KEYS, type WorkflowStageKey } from './workflows.types';

function parseStageKey(value: string): WorkflowStageKey {
  if (!(WORKFLOW_STAGE_KEYS as readonly string[]).includes(value)) {
    throw new ValidationError(`Unknown workflow stage: ${value}`);
  }
  return value as WorkflowStageKey;
}

export async function start(req: Request, res: Response): Promise<void> {
  const { seedLotId } = req.body;
  if (!seedLotId) throw new ValidationError('seedLotId is required');
  const data = await workflowsService.startWorkflow(seedLotId, req.user!);
  res.status(201).json({ success: true, data, message: 'Production workflow started' });
}

export async function list(req: Request, res: Response): Promise<void> {
  const { seedLotId, status } = req.query;
  const data = await workflowsService.listWorkflows({
    seedLotId: typeof seedLotId === 'string' ? seedLotId : undefined,
    status: typeof status === 'string' ? status : undefined,
  });
  res.json({ success: true, data });
}

export async function getOne(req: Request, res: Response): Promise<void> {
  const data = await workflowsService.getWorkflow(req.params.id);
  res.json({ success: true, data });
}

export async function approve(req: Request, res: Response): Promise<void> {
  const stageKey = parseStageKey(req.params.stageKey);
  const data = await workflowsService.approveStage(req.params.id, stageKey, req.user!, req.body?.notes);
  res.json({ success: true, data, message: `Stage ${stageKey} approved` });
}

export async function reject(req: Request, res: Response): Promise<void> {
  const stageKey = parseStageKey(req.params.stageKey);
  const data = await workflowsService.rejectStage(req.params.id, stageKey, req.user!, req.body?.reason);
  res.json({ success: true, data, message: `Stage ${stageKey} rejected` });
}

export async function cancel(req: Request, res: Response): Promise<void> {
  const data = await workflowsService.cancelWorkflow(req.params.id, req.user!);
  res.json({ success: true, data, message: 'Workflow cancelled' });
}
