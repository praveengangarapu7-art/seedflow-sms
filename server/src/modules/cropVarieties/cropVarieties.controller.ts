import type { Request, Response } from 'express';
import * as cropVarietiesService from './cropVarieties.service';

export async function create(req: Request, res: Response): Promise<void> {
  const data = await cropVarietiesService.createCropVariety(req.body, req.user!);
  res.status(201).json({ success: true, data, message: 'Variety registered as draft' });
}

export async function list(req: Request, res: Response): Promise<void> {
  const { crop, status } = req.query;
  const data = await cropVarietiesService.listCropVarieties({
    crop: typeof crop === 'string' ? crop : undefined,
    status: typeof status === 'string' ? status : undefined,
  });
  res.json({ success: true, data });
}

export async function getById(req: Request, res: Response): Promise<void> {
  const data = await cropVarietiesService.getCropVarietyById(req.params.id);
  res.json({ success: true, data });
}

export async function update(req: Request, res: Response): Promise<void> {
  const data = await cropVarietiesService.updateCropVariety(req.params.id, req.body, req.user!);
  res.json({ success: true, data, message: 'Variety updated' });
}

export async function submitForReview(req: Request, res: Response): Promise<void> {
  const data = await cropVarietiesService.submitCropVarietyForReview(req.params.id, req.user!);
  res.json({ success: true, data, message: 'Variety submitted for review' });
}

export async function approve(req: Request, res: Response): Promise<void> {
  const data = await cropVarietiesService.approveCropVariety(req.params.id, req.user!);
  res.json({ success: true, data, message: 'Variety approved' });
}

export async function reject(req: Request, res: Response): Promise<void> {
  const data = await cropVarietiesService.rejectCropVariety(req.params.id, req.body, req.user!);
  res.json({ success: true, data, message: 'Variety sent back to draft' });
}

export async function remove(req: Request, res: Response): Promise<void> {
  await cropVarietiesService.deleteCropVariety(req.params.id, req.user!);
  res.json({ success: true, data: { deleted: true } });
}
