import type { Request, Response } from 'express';
import { ValidationError } from '../../errors';
import * as conditionLogsService from './storageConditionLogs.service';
import * as assignmentsService from './storageAssignments.service';
import * as locationsService from './storageLocations.service';

export async function createLocation(req: Request, res: Response): Promise<void> {
  const data = await locationsService.createStorageLocation(req.body);
  res.status(201).json({ success: true, data, message: `Storage location ${data.code} created` });
}

export async function listLocations(req: Request, res: Response): Promise<void> {
  const { organizationId, status, warehouseZone } = req.query;
  const data = await locationsService.listStorageLocations({
    organizationId: typeof organizationId === 'string' ? organizationId : undefined,
    status: typeof status === 'string' ? status : undefined,
    warehouseZone: typeof warehouseZone === 'string' ? warehouseZone : undefined,
  });
  res.json({ success: true, data });
}

export async function getLocation(req: Request, res: Response): Promise<void> {
  const data = await locationsService.getStorageLocation(req.params.id);
  res.json({ success: true, data });
}

export async function listActiveByLocation(req: Request, res: Response): Promise<void> {
  const data = await assignmentsService.listActiveByLocation(req.params.id);
  res.json({ success: true, data });
}

export async function assign(req: Request, res: Response): Promise<void> {
  const { storageLocationId, notes } = req.body ?? {};
  const data = await assignmentsService.assignToStorage(req.params.batchId, storageLocationId, req.user!, notes);
  res.status(201).json({ success: true, data, message: 'Batch assigned to storage' });
}

export async function move(req: Request, res: Response): Promise<void> {
  const { storageLocationId, notes } = req.body ?? {};
  const data = await assignmentsService.moveBatch(req.params.batchId, storageLocationId, req.user!, notes);
  res.status(201).json({ success: true, data, message: 'Batch moved to new storage location' });
}

export async function remove(req: Request, res: Response): Promise<void> {
  const data = await assignmentsService.removeFromStorage(req.params.batchId, req.user!);
  res.json({ success: true, data, message: 'Batch removed from storage' });
}

export async function movementHistory(req: Request, res: Response): Promise<void> {
  const data = await assignmentsService.getMovementHistory(req.params.batchId);
  res.json({ success: true, data });
}

export async function expirationStatuses(_req: Request, res: Response): Promise<void> {
  const data = await assignmentsService.getExpirationStatuses();
  res.json({ success: true, data });
}

export async function criticalExpirations(_req: Request, res: Response): Promise<void> {
  const data = await assignmentsService.getCriticalExpirations();
  res.json({ success: true, data });
}

export async function fifoPickOrder(req: Request, res: Response): Promise<void> {
  const { crop, variety } = req.query;
  if (typeof crop !== 'string' || typeof variety !== 'string') {
    throw new ValidationError('crop and variety query parameters are required');
  }
  const data = await assignmentsService.getFifoPickOrder(crop, variety);
  res.json({ success: true, data });
}

export async function storageCosts(req: Request, res: Response): Promise<void> {
  const { packagingBatchId } = req.query;
  const data = await assignmentsService.getStorageCosts({
    packagingBatchId: typeof packagingBatchId === 'string' ? packagingBatchId : undefined,
  });
  res.json({ success: true, data });
}

export async function recordConditionLog(req: Request, res: Response): Promise<void> {
  const { temperature, humidity, notes } = req.body ?? {};
  const data = await conditionLogsService.recordConditionLog(req.params.id, { temperature, humidity, notes }, req.user!);
  res.status(201).json({ success: true, data, message: 'Condition log recorded' });
}

export async function listConditionLogs(req: Request, res: Response): Promise<void> {
  const data = await conditionLogsService.listConditionLogs(req.params.id);
  res.json({ success: true, data });
}
