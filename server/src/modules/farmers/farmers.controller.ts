import type { Request, Response } from 'express';
import { canViewFullFarmerPII, maskFarmerFieldsList, maskFarmerFields } from '../privacy/piiMasking';
import { logDataAccess } from '../privacy/privacy.service';
import * as farmersService from './farmers.service';

export async function list(req: Request, res: Response): Promise<void> {
  const { region, organizationId } = req.query;
  const rows = await farmersService.listFarmers({
    region: typeof region === 'string' ? region : undefined,
    organizationId: typeof organizationId === 'string' ? organizationId : undefined,
  });

  const wasMasked = !canViewFullFarmerPII(req.user!.role);
  const data = maskFarmerFieldsList(rows, req.user!.role);
  for (const row of rows) {
    logDataAccess({
      entityType: 'farmer',
      entityId: row.id,
      accessType: 'list',
      accessedBy: req.user!.email,
      accessedByRole: req.user!.role,
      wasMasked,
      route: '/farmers',
    });
  }
  res.json({ success: true, data });
}

export async function getOne(req: Request, res: Response): Promise<void> {
  const row = await farmersService.getFarmer(req.params.id);
  const wasMasked = !canViewFullFarmerPII(req.user!.role);
  logDataAccess({
    entityType: 'farmer',
    entityId: row.id,
    accessType: 'view',
    accessedBy: req.user!.email,
    accessedByRole: req.user!.role,
    wasMasked,
    route: '/farmers/:id',
  });
  res.json({ success: true, data: maskFarmerFields(row, req.user!.role) });
}

export async function create(req: Request, res: Response): Promise<void> {
  const data = await farmersService.createFarmer(req.body, req.user!);
  res.status(201).json({ success: true, data, message: 'Farmer registered' });
}

export async function update(req: Request, res: Response): Promise<void> {
  const data = await farmersService.updateFarmer(req.params.id, req.body, req.user!);
  res.json({ success: true, data: maskFarmerFields(data, req.user!.role), message: 'Farmer updated' });
}

export async function remove(req: Request, res: Response): Promise<void> {
  await farmersService.deleteFarmer(req.params.id, req.user!);
  res.json({ success: true, data: { deleted: true }, message: 'Farmer deleted' });
}
