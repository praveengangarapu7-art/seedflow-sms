import type { Request, Response } from 'express';
import * as analyticsService from './analytics.service';

export async function dashboard(_req: Request, res: Response): Promise<void> {
  const data = await analyticsService.getDashboard();
  res.json({ success: true, data });
}

export async function recordHarvestYield(req: Request, res: Response): Promise<void> {
  const data = await analyticsService.recordHarvestYield(req.body, req.user!);
  res.status(201).json({ success: true, data, message: 'Harvest yield recorded' });
}

export async function recordGerminationTest(req: Request, res: Response): Promise<void> {
  const data = await analyticsService.recordGerminationTest(req.body, req.user!);
  res.status(201).json({ success: true, data, message: 'Germination test recorded' });
}
