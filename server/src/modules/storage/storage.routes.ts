import { Router } from 'express';
import { asyncHandler } from '../../middleware/asyncHandler';
import { requireAuth, requireRole } from '../../middleware/requireAuth';
import * as storageController from './storage.controller';

export const storageRouter = Router();

storageRouter.use(requireAuth);

// Reads are open to every role, consistent with the rest of the backend.
storageRouter.get('/locations', asyncHandler(storageController.listLocations));
storageRouter.get('/locations/:id', asyncHandler(storageController.getLocation));
storageRouter.get('/locations/:id/active-batches', asyncHandler(storageController.listActiveByLocation));
storageRouter.get('/locations/:id/condition-logs', asyncHandler(storageController.listConditionLogs));
storageRouter.get('/batches/:batchId/movement-history', asyncHandler(storageController.movementHistory));
storageRouter.get('/expiration-status', asyncHandler(storageController.expirationStatuses));
storageRouter.get('/expiration-status/critical', asyncHandler(storageController.criticalExpirations));
storageRouter.get('/fifo', asyncHandler(storageController.fifoPickOrder));
storageRouter.get('/costs', asyncHandler(storageController.storageCosts));

storageRouter.post(
  '/locations',
  requireRole('Admin', 'Warehouse Manager'),
  asyncHandler(storageController.createLocation),
);
storageRouter.post(
  '/batches/:batchId/assign',
  requireRole('Admin', 'Warehouse Manager'),
  asyncHandler(storageController.assign),
);
storageRouter.post(
  '/batches/:batchId/move',
  requireRole('Admin', 'Warehouse Manager'),
  asyncHandler(storageController.move),
);
storageRouter.post(
  '/batches/:batchId/remove',
  requireRole('Admin', 'Warehouse Manager'),
  asyncHandler(storageController.remove),
);
// Recording a condition reading is a QA activity too — Inspector included,
// same reasoning as the compliance module's test-recording permissions.
storageRouter.post(
  '/locations/:id/condition-logs',
  requireRole('Admin', 'Warehouse Manager', 'Inspector'),
  asyncHandler(storageController.recordConditionLog),
);
