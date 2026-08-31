import { Router } from 'express';
import { asyncHandler } from '../../middleware/asyncHandler';
import { requireAuth } from '../../middleware/requireAuth';
import * as pushNotificationsController from './pushNotifications.controller';

export const pushNotificationsRouter = Router();

pushNotificationsRouter.use(requireAuth);

// Any authenticated role may register/unregister their own device — this is
// self-service, not a privileged action.
pushNotificationsRouter.post('/register', asyncHandler(pushNotificationsController.register));
pushNotificationsRouter.post('/unregister', asyncHandler(pushNotificationsController.unregister));
