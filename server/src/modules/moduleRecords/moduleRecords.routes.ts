import { Router } from 'express';
import { asyncHandler } from '../../middleware/asyncHandler';
import { requireAuth } from '../../middleware/requireAuth';
import { listCollections, listRecords, syncRecords } from './moduleRecords.service';

/** /api/v1/module-records — the persistent store behind Procurement, Warehouse, Processing and R&D screens. */
export const moduleRecordsRouter = Router();
moduleRecordsRouter.use(requireAuth);

moduleRecordsRouter.get('/', asyncHandler(async (_req, res) => {
  res.json({ success: true, data: await listCollections() });
}));

moduleRecordsRouter.get('/:collection', asyncHandler(async (req, res) => {
  res.json({ success: true, data: await listRecords(String(req.params.collection)) });
}));

moduleRecordsRouter.post('/:collection/sync', asyncHandler(async (req, res) => {
  res.json({ success: true, data: await syncRecords(String(req.params.collection), req.body ?? {}, req.user!), message: 'Saved' });
}));
