import type { Request, Response } from 'express';
import { NotFoundError, UnauthorizedError, ValidationError } from '../../errors';
import { getGenealogy, refreshGenealogyViewNow } from './genealogy.service';
import {
  createSavedSearch,
  deleteSavedSearch,
  getSearchFilterOptions,
  listSavedSearches,
  searchSeedLots,
} from './seedLotSearch.service';
import * as seedLotsBatchService from './seedLotsBatch.service';
import * as seedLotsService from './seedLots.service';
import { withAvailability } from './seedLots.types';

function parseNumberQueryParam(value: unknown): number | undefined {
  if (typeof value !== 'string' || value.trim() === '') return undefined;
  const num = Number(value);
  return Number.isFinite(num) ? num : undefined;
}

export async function list(req: Request, res: Response): Promise<void> {
  const { crop, status, parentLotId, limit, offset } = req.query;
  const lots = await seedLotsService.listSeedLots({
    crop: typeof crop === 'string' ? crop : undefined,
    status: typeof status === 'string' ? status : undefined,
    parentLotId: typeof parentLotId === 'string' ? parentLotId : undefined,
    limit: parseNumberQueryParam(limit),
    offset: parseNumberQueryParam(offset),
  });
  res.json({ success: true, data: lots.map(withAvailability) });
}

export async function getOne(req: Request, res: Response): Promise<void> {
  const lot = await seedLotsService.getSeedLotById(req.params.id);
  res.json({ success: true, data: withAvailability(lot) });
}

export async function getChildren(req: Request, res: Response): Promise<void> {
  const lots = await seedLotsService.getChildLots(req.params.id);
  res.json({ success: true, data: lots.map(withAvailability) });
}

export async function create(req: Request, res: Response): Promise<void> {
  const lot = await seedLotsService.createSeedLot(req.body, req.user!);
  res.status(201).json({ success: true, data: withAvailability(lot), message: 'Seed lot created' });
}

export async function update(req: Request, res: Response): Promise<void> {
  const lot = await seedLotsService.updateSeedLot(req.params.id, req.body, req.user!);
  res.json({ success: true, data: withAvailability(lot), message: 'Seed lot updated' });
}

export async function remove(req: Request, res: Response): Promise<void> {
  await seedLotsService.deleteSeedLot(req.params.id, req.user!);
  res.json({ success: true, data: { deleted: true } });
}

export async function genealogy(req: Request, res: Response): Promise<void> {
  const data = await getGenealogy(req.params.id);
  res.json({ success: true, data });
}

export async function refreshGenealogy(_req: Request, res: Response): Promise<void> {
  await refreshGenealogyViewNow();
  res.json({ success: true, data: null, message: 'Genealogy materialized view refreshed' });
}

export async function search(req: Request, res: Response): Promise<void> {
  const q = req.query;
  const data = await searchSeedLots({
    q: typeof q.q === 'string' ? q.q : undefined,
    variety: typeof q.variety === 'string' ? q.variety : undefined,
    crop: typeof q.crop === 'string' ? q.crop : undefined,
    seedClass: typeof q.seedClass === 'string' ? q.seedClass : undefined,
    sourceOrganizationId: typeof q.sourceOrganizationId === 'string' ? q.sourceOrganizationId : undefined,
    productionDateFrom: typeof q.productionDateFrom === 'string' ? q.productionDateFrom : undefined,
    productionDateTo: typeof q.productionDateTo === 'string' ? q.productionDateTo : undefined,
    minAvailableQuantity: parseNumberQueryParam(q.minAvailableQuantity),
    storageZone: typeof q.storageZone === 'string' ? q.storageZone : undefined,
    certificationStatus:
      q.certificationStatus === 'certified' || q.certificationStatus === 'not_certified' ? q.certificationStatus : undefined,
    testingStatus:
      q.testingStatus === 'not_submitted' || q.testingStatus === 'testing' || q.testingStatus === 'certified' || q.testingStatus === 'rejected'
        ? q.testingStatus
        : undefined,
    agroClimaticZone: typeof q.agroClimaticZone === 'string' ? q.agroClimaticZone : undefined,
    diseaseResistanceTrait: typeof q.diseaseResistanceTrait === 'string' ? q.diseaseResistanceTrait : undefined,
    minYieldBenchmark: parseNumberQueryParam(q.minYieldBenchmark),
    limit: parseNumberQueryParam(q.limit),
    offset: parseNumberQueryParam(q.offset),
  });
  res.json({ success: true, data });
}

export async function searchFilterOptions(_req: Request, res: Response): Promise<void> {
  const data = await getSearchFilterOptions();
  res.json({ success: true, data });
}

export async function listMySavedSearches(req: Request, res: Response): Promise<void> {
  if (!req.user) throw new UnauthorizedError();
  const data = await listSavedSearches(req.user.id);
  res.json({ success: true, data });
}

export async function saveSearch(req: Request, res: Response): Promise<void> {
  if (!req.user) throw new UnauthorizedError();
  const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
  if (!name) throw new ValidationError('name is required');
  const filters = req.body?.filters && typeof req.body.filters === 'object' ? req.body.filters : {};
  const data = await createSavedSearch(req.user.id, name, filters);
  res.status(201).json({ success: true, data, message: `Saved search "${name}"` });
}

export async function removeSavedSearch(req: Request, res: Response): Promise<void> {
  if (!req.user) throw new UnauthorizedError();
  const deleted = await deleteSavedSearch(req.user.id, req.params.id);
  if (!deleted) throw new NotFoundError('Saved search not found');
  res.json({ success: true, data: null, message: 'Saved search deleted' });
}

export async function bulkCreate(req: Request, res: Response): Promise<void> {
  const items = Array.isArray(req.body?.items) ? req.body.items : [];
  const result = await seedLotsBatchService.bulkCreateSeedLots(items, req.user!);
  res.json({ success: true, data: result, message: `Bulk create: ${result.succeeded}/${result.total} succeeded` });
}

export async function bulkUpdate(req: Request, res: Response): Promise<void> {
  const items = Array.isArray(req.body?.items) ? req.body.items : [];
  const result = await seedLotsBatchService.bulkUpdateSeedLots(items, req.user!);
  res.json({ success: true, data: result, message: `Bulk update: ${result.succeeded}/${result.total} succeeded` });
}

export async function bulkDelete(req: Request, res: Response): Promise<void> {
  const ids = Array.isArray(req.body?.ids) ? req.body.ids : [];
  const result = await seedLotsBatchService.bulkDeleteSeedLots(ids, req.user!);
  res.json({ success: true, data: result, message: `Bulk delete: ${result.succeeded}/${result.total} succeeded` });
}

export async function importCsv(req: Request, res: Response): Promise<void> {
  const csvText = typeof req.body?.csvText === 'string' ? req.body.csvText : '';
  const result = await seedLotsBatchService.importSeedLotsFromCsv(csvText, req.user!);
  res.json({ success: true, data: result, message: `CSV import: ${result.succeeded}/${result.total} row(s) created` });
}

export async function bulkQuickAction(req: Request, res: Response): Promise<void> {
  const ids = Array.isArray(req.body?.ids) ? req.body.ids : [];
  const action = typeof req.body?.action === 'string' ? req.body.action : '';
  const zone = typeof req.body?.zone === 'string' ? req.body.zone : undefined;
  const actionId = typeof req.body?.actionId === 'string' ? req.body.actionId : undefined;
  const result = await seedLotsBatchService.bulkQuickAction(
    action as seedLotsBatchService.QuickActionType,
    ids,
    req.user!,
    { zone, actionId },
  );
  res.json({ success: true, data: result, message: `${action}: ${result.succeeded}/${result.total} succeeded` });
}

export async function bulkPrintLabels(req: Request, res: Response): Promise<void> {
  const ids = Array.isArray(req.body?.ids) ? req.body.ids : [];
  const actionId = typeof req.body?.actionId === 'string' ? req.body.actionId : undefined;
  const result = await seedLotsBatchService.bulkPrintLabels(ids, req.user!, { actionId });
  res.json({ success: true, data: result, message: `Print labels: ${result.succeeded}/${result.total} ready` });
}
