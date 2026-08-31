import type { Request, Response } from 'express';
import { ValidationError } from '../../errors';
import * as demandPlanningService from './demandPlanning.service';

export async function forecast(req: Request, res: Response): Promise<void> {
  const { items, horizonMonths } = req.body ?? {};
  if (!Array.isArray(items)) throw new ValidationError('items must be an array of planning items');
  const data = await demandPlanningService.computeDemandForecast(items, Number(horizonMonths) || 6);
  res.json({ success: true, data });
}

export async function generatePurchaseOrder(req: Request, res: Response): Promise<void> {
  const data = await demandPlanningService.generatePurchaseOrder(req.body, req.user!);
  res.status(201).json({ success: true, data, message: `Purchase order ${data.po_number} created` });
}

export async function listPurchaseOrders(req: Request, res: Response): Promise<void> {
  const { status, crop } = req.query;
  const data = await demandPlanningService.listPurchaseOrders({
    status: typeof status === 'string' ? status : undefined,
    crop: typeof crop === 'string' ? crop : undefined,
  });
  res.json({ success: true, data });
}

export async function getPurchaseOrder(req: Request, res: Response): Promise<void> {
  const data = await demandPlanningService.getPurchaseOrder(req.params.id);
  res.json({ success: true, data });
}

export async function updatePurchaseOrderStatus(req: Request, res: Response): Promise<void> {
  const { status, fulfilledSeedLotId, notes } = req.body ?? {};
  if (!status) throw new ValidationError('status is required');
  const data = await demandPlanningService.updatePurchaseOrderStatus(req.params.id, status, req.user!, {
    fulfilledSeedLotId,
    notes,
  });
  res.json({ success: true, data, message: `Purchase order moved to ${status}` });
}

export async function inventoryOptimization(_req: Request, res: Response): Promise<void> {
  const data = await demandPlanningService.getInventoryOptimization();
  res.json({ success: true, data });
}
