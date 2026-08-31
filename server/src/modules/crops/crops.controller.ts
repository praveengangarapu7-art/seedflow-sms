import type { Request, Response } from 'express';
import * as cropsService from './crops.service';

export async function list(req: Request, res: Response): Promise<void> {
  const { active } = req.query;
  const data = await cropsService.listCrops({
    active: active === 'true' ? true : active === 'false' ? false : undefined,
  });
  res.json({ success: true, data });
}

export async function getById(req: Request, res: Response): Promise<void> {
  const data = await cropsService.getCropById(req.params.id);
  res.json({ success: true, data });
}

export async function create(req: Request, res: Response): Promise<void> {
  const data = await cropsService.createCrop(req.body);
  res.status(201).json({ success: true, data, message: 'Crop created' });
}

export async function update(req: Request, res: Response): Promise<void> {
  const data = await cropsService.updateCrop(req.params.id, req.body);
  res.json({ success: true, data, message: 'Crop updated' });
}

export async function remove(req: Request, res: Response): Promise<void> {
  await cropsService.deleteCrop(req.params.id);
  res.json({ success: true, data: { deleted: true }, message: 'Crop deleted' });
}
