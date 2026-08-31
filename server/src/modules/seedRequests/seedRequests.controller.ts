import type { Request, Response } from 'express';
import { ValidationError } from '../../errors';
import { canViewFullFarmerPII, maskDistributionListEntry } from '../privacy/piiMasking';
import { logDataAccess } from '../privacy/privacy.service';
import * as seedRequestsService from './seedRequests.service';

export async function create(req: Request, res: Response): Promise<void> {
  const data = await seedRequestsService.createSeedRequest(req.body, req.user!);
  res.status(201).json({ success: true, data, message: 'Seed request submitted' });
}

export async function list(req: Request, res: Response): Promise<void> {
  const { farmerId, status, region, crop } = req.query;
  const data = await seedRequestsService.listSeedRequests({
    farmerId: typeof farmerId === 'string' ? farmerId : undefined,
    status: typeof status === 'string' ? status : undefined,
    region: typeof region === 'string' ? region : undefined,
    crop: typeof crop === 'string' ? crop : undefined,
  });
  res.json({ success: true, data });
}

export async function getOne(req: Request, res: Response): Promise<void> {
  const data = await seedRequestsService.getSeedRequest(req.params.id);
  res.json({ success: true, data });
}

export async function approve(req: Request, res: Response): Promise<void> {
  const { seedLotId } = req.body ?? {};
  const data = await seedRequestsService.approveRequest(req.params.id, req.user!, typeof seedLotId === 'string' ? seedLotId : undefined);
  res.json({
    success: true,
    data,
    message: data.status === 'allocated' ? 'Seed request approved and allocated — ready for pickup' : 'Seed request approved',
  });
}

export async function myAllocations(req: Request, res: Response): Promise<void> {
  const { farmerId } = req.query;
  if (typeof farmerId !== 'string' || !farmerId) throw new ValidationError('farmerId is required');
  const data = await seedRequestsService.listMyAllocations(farmerId);
  res.json({ success: true, data });
}

export async function reject(req: Request, res: Response): Promise<void> {
  const { reason } = req.body ?? {};
  const data = await seedRequestsService.rejectRequest(req.params.id, reason, req.user!);
  res.json({ success: true, data, message: 'Seed request rejected' });
}

export async function cancel(req: Request, res: Response): Promise<void> {
  const data = await seedRequestsService.cancelRequest(req.params.id, req.user!);
  res.json({ success: true, data, message: 'Seed request cancelled' });
}

export async function fulfill(req: Request, res: Response): Promise<void> {
  const { seedLotId } = req.body ?? {};
  if (!seedLotId) throw new ValidationError('seedLotId is required');
  const data = await seedRequestsService.fulfillRequest(req.params.id, seedLotId, req.user!);
  res.json({ success: true, data, message: 'Seed request fulfilled (allocated)' });
}

export async function deliver(req: Request, res: Response): Promise<void> {
  const data = await seedRequestsService.markDelivered(req.params.id, req.user!);
  res.json({ success: true, data, message: 'Seed request marked delivered' });
}

export async function distributionLists(req: Request, res: Response): Promise<void> {
  const { region } = req.query;
  const lists = await seedRequestsService.getDistributionLists(typeof region === 'string' ? region : undefined);

  const wasMasked = !canViewFullFarmerPII(req.user!.role);
  const data = lists.map((entry) => ({
    ...entry,
    requests: entry.requests.map((r) => maskDistributionListEntry(r, req.user!.role)),
  }));

  for (const entry of lists) {
    for (const r of entry.requests) {
      logDataAccess({
        entityType: 'farmer',
        entityId: r.farmer_id,
        accessType: 'list',
        accessedBy: req.user!.email,
        accessedByRole: req.user!.role,
        wasMasked,
        route: '/production/seed-requests/distribution-lists',
      });
    }
  }
  res.json({ success: true, data });
}
