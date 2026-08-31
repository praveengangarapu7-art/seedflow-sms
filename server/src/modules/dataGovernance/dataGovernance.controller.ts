import type { Request, Response } from 'express';
import * as dataGovernanceService from './dataGovernance.service';

export async function violations(_req: Request, res: Response): Promise<void> {
  const data = await dataGovernanceService.scanForViolations();
  res.json({ success: true, data });
}

export async function recordCount(req: Request, res: Response): Promise<void> {
  const data = await dataGovernanceService.recordInventoryCount(req.body, req.user!);
  res.status(201).json({ success: true, data, message: 'Inventory count recorded' });
}

export async function reconciliation(_req: Request, res: Response): Promise<void> {
  const data = await dataGovernanceService.getReconciliationReport();
  res.json({ success: true, data });
}

export async function orphanLots(_req: Request, res: Response): Promise<void> {
  const data = await dataGovernanceService.listOrphanLots();
  res.json({ success: true, data });
}

export async function archiveOrphan(req: Request, res: Response): Promise<void> {
  const data = await dataGovernanceService.archiveOrphanLot(req.params.id, req.body?.reason, req.user!);
  res.json({ success: true, data, message: 'Seed lot archived as orphan' });
}

export async function correctQuantity(req: Request, res: Response): Promise<void> {
  const data = await dataGovernanceService.correctSeedLotQuantity(req.params.id, req.body, req.user!);
  res.json({ success: true, data, message: 'Seed lot quantity corrected' });
}

export async function correctionHistory(req: Request, res: Response): Promise<void> {
  const { seedLotId } = req.query;
  const data = await dataGovernanceService.getCorrectionHistory(typeof seedLotId === 'string' ? seedLotId : undefined);
  res.json({ success: true, data });
}
