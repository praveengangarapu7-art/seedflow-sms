import type { Request, Response } from 'express';
import * as pushNotificationsService from './pushNotifications.service';

export async function register(req: Request, res: Response): Promise<void> {
  const data = await pushNotificationsService.registerDeviceToken(req.body, req.user!);
  res.status(201).json({ success: true, data, message: 'Device registered for push notifications' });
}

export async function unregister(req: Request, res: Response): Promise<void> {
  await pushNotificationsService.unregisterDeviceToken(req.body?.expoPushToken ?? '');
  res.json({ success: true, data: null, message: 'Device unregistered' });
}
