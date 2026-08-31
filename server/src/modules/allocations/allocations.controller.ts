import type { Request, Response } from 'express';
import * as allocationsBatchService from './allocationsBatch.service';
import * as allocationsService from './allocations.service';

export async function allocate(req: Request, res: Response): Promise<void> {
  const data = await allocationsService.allocate(req.params.id, req.body, req.user!);
  res.status(201).json({ success: true, data, message: 'Quantity allocated' });
}

export async function release(req: Request, res: Response): Promise<void> {
  const data = await allocationsService.release(req.params.id, req.body, req.user!);
  res.json({ success: true, data, message: 'Allocation released' });
}

export async function listBySeedLot(req: Request, res: Response): Promise<void> {
  const data = await allocationsService.listBySeedLot(req.params.id);
  res.json({ success: true, data });
}

export async function history(req: Request, res: Response): Promise<void> {
  const data = await allocationsService.getAllocationHistory(req.params.id);
  res.json({ success: true, data });
}

export async function bulkAllocate(req: Request, res: Response): Promise<void> {
  const requests = Array.isArray(req.body?.requests) ? req.body.requests : [];
  const result = await allocationsBatchService.batchAllocate(requests, req.user!);
  res.json({ success: true, data: result, message: `Batch allocation: ${result.allocated}/${result.total} allocated` });
}
