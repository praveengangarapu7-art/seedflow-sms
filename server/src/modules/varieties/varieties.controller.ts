import type { Request, Response } from 'express';
import * as varietiesService from './varieties.service';

export async function create(req: Request, res: Response): Promise<void> {
  const data = await varietiesService.createVariety(req.body, req.user!);
  res.status(201).json({ success: true, data, message: 'Variety registered as draft' });
}

export async function list(req: Request, res: Response): Promise<void> {
  const { crop, status } = req.query;
  const data = await varietiesService.listVarieties({
    crop: typeof crop === 'string' ? crop : undefined,
    status: typeof status === 'string' ? status : undefined,
  });
  res.json({ success: true, data });
}

export async function getById(req: Request, res: Response): Promise<void> {
  const data = await varietiesService.getVarietyById(req.params.id);
  res.json({ success: true, data });
}

export async function updateDraft(req: Request, res: Response): Promise<void> {
  const data = await varietiesService.updateVarietyDraft(req.params.id, req.body, req.user!);
  res.json({ success: true, data, message: 'Draft updated' });
}

export async function submit(req: Request, res: Response): Promise<void> {
  const data = await varietiesService.submitForReview(req.params.id, req.user!);
  res.json({ success: true, data, message: 'Variety submitted for breeding committee review' });
}

export async function review(req: Request, res: Response): Promise<void> {
  const data = await varietiesService.reviewVariety(req.params.id, req.body, req.user!);
  res.json({ success: true, data, message: 'Review recorded' });
}

export async function createVersion(req: Request, res: Response): Promise<void> {
  const data = await varietiesService.createNewVersion(req.params.id, req.body, req.user!);
  res.status(201).json({ success: true, data, message: 'New season version drafted' });
}

export async function deprecate(req: Request, res: Response): Promise<void> {
  const data = await varietiesService.deprecateVariety(req.params.id, req.body?.reason, req.user!);
  res.json({ success: true, data, message: 'Variety deprecated' });
}
