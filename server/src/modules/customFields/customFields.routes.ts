import { Router } from 'express';
import { asyncHandler } from '../../middleware/asyncHandler';
import { requireAuth, requireRole } from '../../middleware/requireAuth';
import * as svc from './customFields.service';

export const customFieldsRouter = Router();
customFieldsRouter.use(requireAuth);

const str = (v: unknown) => (typeof v === 'string' && v ? v : undefined);

// Definitions: anyone signed in can read (forms need them); only Admin changes them.
customFieldsRouter.get('/', asyncHandler(async (req, res) => {
  const all = req.query.all === 'true' && req.user!.role === 'Admin';
  res.json({ success: true, data: await svc.listFields({ entityType: str(req.query.entityType), includeInactive: all }) });
}));
customFieldsRouter.post('/', requireRole('Admin'), asyncHandler(async (req, res) => {
  res.status(201).json({ success: true, data: await svc.createField(req.body, req.user!), message: 'Custom field created' });
}));
customFieldsRouter.patch('/:id', requireRole('Admin'), asyncHandler(async (req, res) => {
  res.json({ success: true, data: await svc.updateField(req.params.id, req.body) });
}));

// Values for one record (+ the lot it belongs to, so lot-wide fields are shared across modules).
customFieldsRouter.get('/values', asyncHandler(async (req, res) => {
  res.json({ success: true, data: await svc.getValues(String(req.query.entityType ?? ''), String(req.query.entityId ?? ''), str(req.query.lotId)) });
}));
customFieldsRouter.put('/values', asyncHandler(async (req, res) => {
  const { entityType, entityId, lotId, values } = req.body ?? {};
  res.json({ success: true, data: await svc.saveValues(String(entityType ?? ''), String(entityId ?? ''), str(lotId), values ?? {}, req.user!), message: 'Saved' });
}));
