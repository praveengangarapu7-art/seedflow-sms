import { pool } from '../../db/pool';
import { NotFoundError, ValidationError } from '../../errors';
import type { CreateStorageLocationInput, StorageLocationRow } from './storage.types';

export async function listStorageLocations(filters: {
  organizationId?: string;
  status?: string;
  warehouseZone?: string;
}): Promise<StorageLocationRow[]> {
  const conditions: string[] = [];
  const values: unknown[] = [];
  if (filters.organizationId) {
    values.push(filters.organizationId);
    conditions.push(`organization_id = $${values.length}`);
  }
  if (filters.status) {
    values.push(filters.status);
    conditions.push(`status = $${values.length}`);
  }
  if (filters.warehouseZone) {
    values.push(filters.warehouseZone);
    conditions.push(`warehouse_zone = $${values.length}`);
  }
  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const result = await pool.query<StorageLocationRow>(`SELECT * FROM storage_locations ${whereClause} ORDER BY code ASC`, values);
  return result.rows;
}

export async function getStorageLocation(id: string): Promise<StorageLocationRow> {
  const result = await pool.query<StorageLocationRow>('SELECT * FROM storage_locations WHERE id = $1', [id]);
  const location = result.rows[0];
  if (!location) throw new NotFoundError(`Storage location ${id} not found`);
  return location;
}

export async function createStorageLocation(input: CreateStorageLocationInput): Promise<StorageLocationRow> {
  if (!input.organizationId) throw new ValidationError('organizationId is required');
  if (!input.code?.trim()) throw new ValidationError('code is required');
  if (!input.warehouseZone?.trim()) throw new ValidationError('warehouseZone is required');
  if (!Number.isInteger(Number(input.capacityUnits)) || Number(input.capacityUnits) <= 0) {
    throw new ValidationError('capacityUnits must be a positive integer');
  }
  if (!Number.isFinite(Number(input.targetTemperatureC))) throw new ValidationError('targetTemperatureC is required');
  if (!Number.isFinite(Number(input.targetHumidityPercent))) throw new ValidationError('targetHumidityPercent is required');

  const result = await pool.query<StorageLocationRow>(
    `INSERT INTO storage_locations (organization_id, code, warehouse_zone, shelf, capacity_units, target_temperature_c, target_humidity_percent, daily_rate_per_unit)
     VALUES ($1, $2, $3, $4, $5, $6, $7, COALESCE($8::numeric, 0))
     RETURNING *`,
    [
      input.organizationId,
      input.code.trim(),
      input.warehouseZone.trim(),
      input.shelf?.trim() || null,
      input.capacityUnits,
      input.targetTemperatureC,
      input.targetHumidityPercent,
      input.dailyRatePerUnit ?? null,
    ],
  );
  return result.rows[0];
}
