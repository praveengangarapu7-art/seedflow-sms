import type { Request, Response } from 'express';
import * as feedbackLoopService from './feedbackLoop.service';

export async function record(req: Request, res: Response): Promise<void> {
  const data = await feedbackLoopService.recordLotFieldInspection(req.body, req.user!);
  res.status(201).json({ success: true, data, message: 'Field inspection recorded against seed lot' });
}

export async function list(req: Request, res: Response): Promise<void> {
  const { seedLotId, farmerId } = req.query;
  const data = await feedbackLoopService.listLotFieldInspections({
    seedLotId: typeof seedLotId === 'string' ? seedLotId : undefined,
    farmerId: typeof farmerId === 'string' ? farmerId : undefined,
  });
  res.json({ success: true, data });
}

export async function lotPerformance(_req: Request, res: Response): Promise<void> {
  const data = await feedbackLoopService.getLotPerformanceReport();
  res.json({ success: true, data });
}

export async function breederPerformance(_req: Request, res: Response): Promise<void> {
  const data = await feedbackLoopService.getBreederPerformanceReport();
  res.json({ success: true, data });
}

export async function environmentalAdaptation(_req: Request, res: Response): Promise<void> {
  const data = await feedbackLoopService.getEnvironmentalAdaptation();
  res.json({ success: true, data });
}
