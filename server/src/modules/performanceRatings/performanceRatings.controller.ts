import type { Request, Response } from 'express';
import * as performanceRatingsService from './performanceRatings.service';

export async function submit(req: Request, res: Response): Promise<void> {
  const data = await performanceRatingsService.submitRating(req.body, req.user!);
  res.status(201).json({ success: true, data, message: 'Performance rating submitted' });
}

export async function list(req: Request, res: Response): Promise<void> {
  const { farmerId, crop, variety } = req.query;
  const data = await performanceRatingsService.listRatings({
    farmerId: typeof farmerId === 'string' ? farmerId : undefined,
    crop: typeof crop === 'string' ? crop : undefined,
    variety: typeof variety === 'string' ? variety : undefined,
  });
  res.json({ success: true, data });
}

export async function varietyEffectiveness(_req: Request, res: Response): Promise<void> {
  const data = await performanceRatingsService.getVarietyEffectiveness();
  res.json({ success: true, data });
}
