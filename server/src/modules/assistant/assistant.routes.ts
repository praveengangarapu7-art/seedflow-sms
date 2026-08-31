import { Router } from 'express';
import { asyncHandler } from '../../middleware/asyncHandler';
import { requireAuth } from '../../middleware/requireAuth';
import * as assistantController from './assistant.controller';

export const assistantRouter = Router();

assistantRouter.use(requireAuth);

// No requireRole gate: the assistant is read-only for every authenticated
// role, and the data it can surface is data those roles can already read
// through the ordinary list endpoints. Adding a role gate here would only
// hide the convenience layer, not protect anything.
assistantRouter.get('/status', asyncHandler(assistantController.status));
assistantRouter.post('/ask', asyncHandler(assistantController.ask));
