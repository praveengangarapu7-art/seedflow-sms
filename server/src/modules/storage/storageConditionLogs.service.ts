import { pool } from '../../db/pool';
import { withTransaction } from '../../db/transaction';
import { NotFoundError, ValidationError } from '../../errors';
import type { AuthenticatedUser } from '../../middleware/requireAuth';
import { broadcast } from '../../ws/server';
import { insertAuditLog } from '../auditLogs/auditLogs.service';
import type { StorageConditionLogRow } from './storage.types';

const TEMPERATURE_DEVIATION_THRESHOLD_C = 3;
const HUMIDITY_DEVIATION_THRESHOLD_PERCENT = 10;

export async function recordConditionLog(
  storageLocationId: string,
  input: { temperature: number; humidity: number; notes?: string },
  user: AuthenticatedUser,
): Promise<StorageConditionLogRow> {
  if (!storageLocationId) throw new ValidationError('storageLocationId is required');
  if (!Number.isFinite(Number(input.temperature))) throw new ValidationError('temperature is required');
  if (!Number.isFinite(Number(input.humidity))) throw new ValidationError('humidity is required');

  const locationResult = await pool.query<{ code: string; target_temperature_c: number; target_humidity_percent: number }>(
    'SELECT code, target_temperature_c, target_humidity_percent FROM storage_locations WHERE id = $1',
    [storageLocationId],
  );
  const location = locationResult.rows[0];
  if (!location) throw new NotFoundError(`Storage location ${storageLocationId} not found`);

  const created = await withTransaction(async (client) => {
    const result = await client.query<StorageConditionLogRow>(
      `INSERT INTO storage_condition_logs (storage_location_id, recorded_temperature_c, recorded_humidity_percent, recorded_by, notes)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [storageLocationId, input.temperature, input.humidity, user.email, input.notes ?? null],
    );
    const row = result.rows[0];

    await insertAuditLog(client, {
      entityType: 'storage_condition_log',
      entityId: row.id,
      action: 'RECORD_CONDITION',
      performedBy: user.email,
      afterState: row,
      metadata: { storageLocationId },
    });

    return row;
  });

  const temperatureDeviation = Math.abs(Number(input.temperature) - Number(location.target_temperature_c));
  const humidityDeviation = Math.abs(Number(input.humidity) - Number(location.target_humidity_percent));
  const isDeviating = temperatureDeviation > TEMPERATURE_DEVIATION_THRESHOLD_C || humidityDeviation > HUMIDITY_DEVIATION_THRESHOLD_PERCENT;

  if (isDeviating) {
    broadcast('STORAGE_CONDITION_ALERT', {
      storageLocationId,
      locationCode: location.code,
      recordedTemperatureC: input.temperature,
      recordedHumidityPercent: input.humidity,
      targetTemperatureC: location.target_temperature_c,
      targetHumidityPercent: location.target_humidity_percent,
      temperatureDeviation: Math.round(temperatureDeviation * 10) / 10,
      humidityDeviation: Math.round(humidityDeviation * 10) / 10,
      recordedBy: user.email,
    });
  }

  return created;
}

export async function listConditionLogs(storageLocationId: string): Promise<StorageConditionLogRow[]> {
  const result = await pool.query<StorageConditionLogRow>(
    'SELECT * FROM storage_condition_logs WHERE storage_location_id = $1 ORDER BY created_at DESC',
    [storageLocationId],
  );
  return result.rows;
}
