import type { Request, Response } from 'express';
import { canViewFullFarmerPII, maskFarmerNameField, maskFarmerNameFieldList } from '../privacy/piiMasking';
import { logDataAccess } from '../privacy/privacy.service';
import * as cropPlanningService from './cropPlanning.service';

function logCropPlanFarmerAccess(req: Request, farmerId: string, accessType: 'view' | 'list', route: string): void {
  logDataAccess({
    entityType: 'farmer',
    entityId: farmerId,
    accessType,
    accessedBy: req.user!.email,
    accessedByRole: req.user!.role,
    wasMasked: !canViewFullFarmerPII(req.user!.role),
    route,
  });
}

export async function createFarmHandler(req: Request, res: Response): Promise<void> {
  const data = await cropPlanningService.createFarm(req.body);
  res.status(201).json({ success: true, data, message: 'Farm added' });
}

export async function listFarmsHandler(req: Request, res: Response): Promise<void> {
  const { farmerId } = req.query;
  const data = await cropPlanningService.listFarms(typeof farmerId === 'string' ? farmerId : undefined);
  res.json({ success: true, data });
}

export async function recommendations(req: Request, res: Response): Promise<void> {
  const { farmerId, farmId, crop } = req.query;
  const data = await cropPlanningService.getVarietyRecommendations(
    String(farmerId ?? ''),
    String(farmId ?? ''),
    String(crop ?? ''),
  );
  res.json({ success: true, data });
}

export async function cropHistory(req: Request, res: Response): Promise<void> {
  const { farmerId, crop } = req.query;
  const data = await cropPlanningService.getCropHistoryCompatibility(String(farmerId ?? ''), String(crop ?? ''));
  res.json({ success: true, data });
}

export async function seedQuantity(req: Request, res: Response): Promise<void> {
  const { crop, targetAreaAcres } = req.query;
  const quantity = cropPlanningService.calculateSeedQuantity(String(crop ?? ''), Number(targetAreaAcres));
  res.json({ success: true, data: { quantity, unit: 'kg' } });
}

export async function advisory(req: Request, res: Response): Promise<void> {
  const { crop } = req.query;
  const data = cropPlanningService.getAgroAdvisory(String(crop ?? ''));
  res.json({ success: true, data });
}

export async function createDraft(req: Request, res: Response): Promise<void> {
  const plan = await cropPlanningService.createCropPlanDraft(req.body, req.user!);
  logCropPlanFarmerAccess(req, plan.farmer_id, 'view', '/production/crop-planning/plans');
  res.status(201).json({ success: true, data: maskFarmerNameField(plan, req.user!.role), message: 'Crop plan draft created' });
}

export async function seedLotRecommendations(req: Request, res: Response): Promise<void> {
  const data = await cropPlanningService.getSeedLotRecommendations(req.params.id);
  res.json({ success: true, data });
}

export async function reserve(req: Request, res: Response): Promise<void> {
  const seedLotId = typeof req.body?.seedLotId === 'string' ? req.body.seedLotId : undefined;
  const plan = await cropPlanningService.reserveSeedLot(req.params.id, req.user!, seedLotId);
  logCropPlanFarmerAccess(req, plan.farmer_id, 'view', '/production/crop-planning/plans/:id/reserve');
  res.json({ success: true, data: maskFarmerNameField(plan, req.user!.role), message: 'Seed lot reserved' });
}

export async function confirm(req: Request, res: Response): Promise<void> {
  const plan = await cropPlanningService.confirmCropPlan(req.params.id, req.user!);
  logCropPlanFarmerAccess(req, plan.farmer_id, 'view', '/production/crop-planning/plans/:id/confirm');
  res.json({ success: true, data: maskFarmerNameField(plan, req.user!.role), message: 'Booking confirmed' });
}

export async function cancel(req: Request, res: Response): Promise<void> {
  const plan = await cropPlanningService.cancelCropPlan(req.params.id, req.body?.reason, req.user!);
  logCropPlanFarmerAccess(req, plan.farmer_id, 'view', '/production/crop-planning/plans/:id/cancel');
  res.json({ success: true, data: maskFarmerNameField(plan, req.user!.role), message: 'Crop plan cancelled' });
}

export async function list(req: Request, res: Response): Promise<void> {
  const { farmerId, status } = req.query;
  const plans = await cropPlanningService.listCropPlans({
    farmerId: typeof farmerId === 'string' ? farmerId : undefined,
    status: typeof status === 'string' ? status : undefined,
  });
  for (const plan of plans) logCropPlanFarmerAccess(req, plan.farmer_id, 'list', '/production/crop-planning/plans');
  res.json({ success: true, data: maskFarmerNameFieldList(plans, req.user!.role) });
}

export async function getById(req: Request, res: Response): Promise<void> {
  const plan = await cropPlanningService.getCropPlanById(req.params.id);
  logCropPlanFarmerAccess(req, plan.farmer_id, 'view', '/production/crop-planning/plans/:id');
  res.json({ success: true, data: maskFarmerNameField(plan, req.user!.role) });
}
