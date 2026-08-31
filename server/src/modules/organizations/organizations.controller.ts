import type { Request, Response } from 'express';
import * as organizationsService from './organizations.service';

export async function list(req: Request, res: Response): Promise<void> {
  const { type } = req.query;
  const data = await organizationsService.listOrganizations({
    type: typeof type === 'string' ? type : undefined,
  });
  res.json({ success: true, data });
}

export async function getById(req: Request, res: Response): Promise<void> {
  const data = await organizationsService.getOrganizationById(req.params.id);
  res.json({ success: true, data });
}

export async function create(req: Request, res: Response): Promise<void> {
  const data = await organizationsService.createOrganization(req.body);
  res.status(201).json({ success: true, data, message: 'Organization created' });
}

export async function update(req: Request, res: Response): Promise<void> {
  const data = await organizationsService.updateOrganization(req.params.id, req.body);
  res.json({ success: true, data, message: 'Organization updated' });
}

export async function remove(req: Request, res: Response): Promise<void> {
  await organizationsService.deleteOrganization(req.params.id);
  res.json({ success: true, data: { deleted: true }, message: 'Organization deleted' });
}
