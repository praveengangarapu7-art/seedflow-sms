import { pool } from '../../db/pool';
import { ValidationError } from '../../errors';
import type { AuthenticatedUser } from '../../middleware/requireAuth';
import type { DeviceTokenRow, RegisterDeviceTokenInput } from './pushNotifications.types';

const EXPO_PUSH_ENDPOINT = 'https://exp.host/--/api/v2/push/send';

export async function registerDeviceToken(input: RegisterDeviceTokenInput, user: AuthenticatedUser): Promise<DeviceTokenRow> {
  if (!input.expoPushToken?.trim()) throw new ValidationError('expoPushToken is required');

  const result = await pool.query<DeviceTokenRow>(
    `INSERT INTO device_push_tokens (user_email, expo_push_token, platform)
     VALUES ($1, $2, $3)
     ON CONFLICT (expo_push_token)
     DO UPDATE SET user_email = EXCLUDED.user_email, platform = EXCLUDED.platform, updated_at = now()
     RETURNING *`,
    [user.email, input.expoPushToken.trim(), input.platform ?? null],
  );
  return result.rows[0];
}

export async function unregisterDeviceToken(expoPushToken: string): Promise<void> {
  await pool.query('DELETE FROM device_push_tokens WHERE expo_push_token = $1', [expoPushToken]);
}

/**
 * Best-effort fan-out to every registered device via Expo's push service
 * (no API key required for the basic send endpoint). This is deliberately
 * fire-and-forget from the caller's point of view — a push-delivery failure
 * must never roll back or block the business transaction (a quality-flag
 * insert, a low-stock allocation update) that triggered it, so every error
 * here is caught and logged, not thrown.
 */
export async function sendPushToAllDevices(title: string, body: string, data?: Record<string, unknown>): Promise<void> {
  try {
    const tokensResult = await pool.query<{ expo_push_token: string }>('SELECT expo_push_token FROM device_push_tokens');
    if (tokensResult.rows.length === 0) return;

    const messages = tokensResult.rows.map((row) => ({
      to: row.expo_push_token,
      title,
      body,
      data: data ?? {},
      sound: 'default',
      priority: 'high',
    }));

    await fetch(EXPO_PUSH_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(messages),
    });
  } catch (error) {
    console.error('[pushNotifications] failed to send push notification:', error);
  }
}
