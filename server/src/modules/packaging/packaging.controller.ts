import type { Request, Response } from 'express';
import { ValidationError } from '../../errors';
import * as packagingService from './packaging.service';

export async function create(req: Request, res: Response): Promise<void> {
  const data = await packagingService.createPackagingBatch(req.body, req.user!);
  res.status(201).json({ success: true, data, message: `Packaging batch ${data.batch.batch_code} created` });
}

export async function list(req: Request, res: Response): Promise<void> {
  const { seedLotId, status } = req.query;
  const data = await packagingService.listPackagingBatches({
    seedLotId: typeof seedLotId === 'string' ? seedLotId : undefined,
    status: typeof status === 'string' ? status : undefined,
  });
  res.json({ success: true, data });
}

export async function getOne(req: Request, res: Response): Promise<void> {
  const data = await packagingService.getPackagingBatch(req.params.id);
  res.json({ success: true, data });
}

export async function listUnits(req: Request, res: Response): Promise<void> {
  const data = await packagingService.listPackagingUnits(req.params.id);
  res.json({ success: true, data });
}

export async function updateUnitStatus(req: Request, res: Response): Promise<void> {
  const { status } = req.body ?? {};
  if (!status) throw new ValidationError('status is required');
  const data = await packagingService.updateUnitStatus(req.params.unitId, status, req.user!);
  res.json({ success: true, data, message: `Unit marked ${status}` });
}

export async function getUnitLabel(req: Request, res: Response): Promise<void> {
  const data = await packagingService.getUnitLabelData(req.params.unitId);
  res.json({ success: true, data });
}
