import type { PoolClient } from 'pg';
import { pool } from '../../db/pool';
import { withTransaction } from '../../db/transaction';
import { ConflictError, NotFoundError, ValidationError } from '../../errors';
import type { AuthenticatedUser } from '../../middleware/requireAuth';
import { broadcast } from '../../ws/server';
import { insertAuditLog } from '../auditLogs/auditLogs.service';
import type {
  ExpirationEntry,
  ExpirationStatus,
  FifoPickEntry,
  StorageAssignmentRow,
  StorageCostEntry,
} from './storage.types';

async function getCurrentAssignment(client: PoolClient, packagingBatchId: string): Promise<StorageAssignmentRow | null> {
  const result = await client.query<StorageAssignmentRow>(
    "SELECT * FROM storage_assignments WHERE packaging_batch_id = $1 AND status = 'active' ORDER BY stored_at DESC LIMIT 1",
    [packagingBatchId],
  );
  return result.rows[0] ?? null;
}

async function assertCapacity(client: PoolClient, storageLocationId: string, additionalUnits: number): Promise<void> {
  const locationResult = await client.query<{ capacity_units: number }>(
    'SELECT capacity_units FROM storage_locations WHERE id = $1 FOR UPDATE',
    [storageLocationId],
  );
  const location = locationResult.rows[0];
  if (!location) throw new NotFoundError(`Storage location ${storageLocationId} not found`);

  const usedResult = await client.query<{ used: string }>(
    `SELECT COALESCE(SUM(pb.unit_count), 0) AS used
     FROM storage_assignments sa
     JOIN packaging_batches pb ON pb.id = sa.packaging_batch_id
     WHERE sa.storage_location_id = $1 AND sa.status = 'active'`,
    [storageLocationId],
  );
  const used = Number(usedResult.rows[0].used);
  if (used + additionalUnits > Number(location.capacity_units)) {
    throw new ConflictError(
      `Storage location capacity exceeded: ${used}/${location.capacity_units} units used, cannot add ${additionalUnits} more`,
    );
  }
}

export async function assignToStorage(
  packagingBatchId: string,
  storageLocationId: string,
  user: AuthenticatedUser,
  notes?: string,
): Promise<StorageAssignmentRow> {
  if (!storageLocationId) throw new ValidationError('storageLocationId is required');

  const created = await withTransaction(async (client) => {
    const batchResult = await client.query('SELECT * FROM packaging_batches WHERE id = $1', [packagingBatchId]);
    const batch = batchResult.rows[0];
    if (!batch) throw new NotFoundError(`Packaging batch ${packagingBatchId} not found`);

    const existing = await getCurrentAssignment(client, packagingBatchId);
    if (existing) {
      throw new ConflictError(`Batch ${batch.batch_code} is already stored at a location — use "move" instead`);
    }

    await assertCapacity(client, storageLocationId, batch.unit_count);

    const result = await client.query<StorageAssignmentRow>(
      `INSERT INTO storage_assignments (packaging_batch_id, storage_location_id, performed_by, notes)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [packagingBatchId, storageLocationId, user.email, notes ?? null],
    );
    const row = result.rows[0];

    await insertAuditLog(client, {
      entityType: 'storage_assignment',
      entityId: row.id,
      action: 'ASSIGN',
      performedBy: user.email,
      afterState: row,
      metadata: { packagingBatchId, storageLocationId },
    });

    return row;
  });

  broadcast('STORAGE_ASSIGNMENT_CHANGED', {
    packagingBatchId,
    storageLocationId,
    action: 'ASSIGNED',
    performedBy: user.email,
  });
  return created;
}

export async function moveBatch(
  packagingBatchId: string,
  newLocationId: string,
  user: AuthenticatedUser,
  notes?: string,
): Promise<StorageAssignmentRow> {
  if (!newLocationId) throw new ValidationError('newLocationId is required');

  const created = await withTransaction(async (client) => {
    const batchResult = await client.query('SELECT * FROM packaging_batches WHERE id = $1', [packagingBatchId]);
    const batch = batchResult.rows[0];
    if (!batch) throw new NotFoundError(`Packaging batch ${packagingBatchId} not found`);

    const current = await getCurrentAssignment(client, packagingBatchId);
    if (!current) {
      throw new ConflictError(`Batch ${batch.batch_code} is not currently in storage — use "assign" instead`);
    }
    if (current.storage_location_id === newLocationId) {
      throw new ValidationError('Batch is already at this location');
    }

    await assertCapacity(client, newLocationId, batch.unit_count);

    await client.query("UPDATE storage_assignments SET status = 'moved', ended_at = now() WHERE id = $1", [current.id]);

    const result = await client.query<StorageAssignmentRow>(
      `INSERT INTO storage_assignments (packaging_batch_id, storage_location_id, performed_by, notes)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [packagingBatchId, newLocationId, user.email, notes ?? null],
    );
    const row = result.rows[0];

    await insertAuditLog(client, {
      entityType: 'storage_assignment',
      entityId: row.id,
      action: 'MOVE',
      performedBy: user.email,
      beforeState: { storageLocationId: current.storage_location_id },
      afterState: { storageLocationId: newLocationId },
      metadata: { packagingBatchId },
    });

    return row;
  });

  broadcast('STORAGE_ASSIGNMENT_CHANGED', {
    packagingBatchId,
    storageLocationId: newLocationId,
    action: 'MOVED',
    performedBy: user.email,
  });
  return created;
}

export async function removeFromStorage(packagingBatchId: string, user: AuthenticatedUser): Promise<StorageAssignmentRow> {
  const updated = await withTransaction(async (client) => {
    const current = await getCurrentAssignment(client, packagingBatchId);
    if (!current) throw new NotFoundError(`Batch ${packagingBatchId} is not currently in storage`);

    const result = await client.query<StorageAssignmentRow>(
      "UPDATE storage_assignments SET status = 'removed', ended_at = now() WHERE id = $1 RETURNING *",
      [current.id],
    );

    await insertAuditLog(client, {
      entityType: 'storage_assignment',
      entityId: current.id,
      action: 'REMOVE',
      performedBy: user.email,
      beforeState: { status: 'active' },
      afterState: { status: 'removed' },
    });

    return result.rows[0];
  });

  broadcast('STORAGE_ASSIGNMENT_CHANGED', {
    packagingBatchId,
    storageLocationId: updated.storage_location_id,
    action: 'REMOVED',
    performedBy: user.email,
  });
  return updated;
}

export async function getMovementHistory(packagingBatchId: string): Promise<StorageAssignmentRow[]> {
  const result = await pool.query<StorageAssignmentRow>(
    'SELECT * FROM storage_assignments WHERE packaging_batch_id = $1 ORDER BY stored_at ASC',
    [packagingBatchId],
  );
  return result.rows;
}

export async function listActiveByLocation(storageLocationId: string) {
  const result = await pool.query(
    `SELECT sa.*, pb.batch_code, pb.unit_count, pb.total_quantity, pb.unit_of_measure
     FROM storage_assignments sa
     JOIN packaging_batches pb ON pb.id = sa.packaging_batch_id
     WHERE sa.storage_location_id = $1 AND sa.status = 'active'
     ORDER BY sa.stored_at ASC`,
    [storageLocationId],
  );
  return result.rows;
}

const EXPIRATION_CRITICAL_DAYS = 7;
const EXPIRATION_WARNING_DAYS = 30;

function classifyExpiration(daysRemaining: number): ExpirationStatus {
  if (daysRemaining < 0) return 'expired';
  if (daysRemaining <= EXPIRATION_CRITICAL_DAYS) return 'critical';
  if (daysRemaining <= EXPIRATION_WARNING_DAYS) return 'warning';
  return 'ok';
}

/**
 * Expiration is computed live from packaged_at + shelf_life_months for
 * every active packaging batch — no separate "expiration date" column to
 * drift out of sync with the batch it describes.
 */
export async function getExpirationStatuses(): Promise<ExpirationEntry[]> {
  const result = await pool.query<{
    packaging_batch_id: string;
    batch_code: string;
    seed_lot_id: string;
    packaged_at: string;
    shelf_life_months: number;
    lot_code: string;
    crop: string;
    variety: string;
    location_code: string | null;
    location_zone: string | null;
    location_shelf: string | null;
    location_temperature_c: string | null;
  }>(
    `SELECT pb.id AS packaging_batch_id, pb.batch_code, pb.seed_lot_id, pb.created_at AS packaged_at, pb.shelf_life_months,
            sl.lot_code, sl.crop, sl.variety,
            loc.code AS location_code, loc.warehouse_zone AS location_zone, loc.shelf AS location_shelf,
            loc.target_temperature_c AS location_temperature_c
     FROM packaging_batches pb
     JOIN seed_lots sl ON sl.id = pb.seed_lot_id
     LEFT JOIN storage_assignments sa ON sa.packaging_batch_id = pb.id AND sa.status = 'active'
     LEFT JOIN storage_locations loc ON loc.id = sa.storage_location_id
     WHERE pb.status = 'active'
     ORDER BY pb.created_at ASC`,
  );

  const now = Date.now();
  return result.rows
    .map((row) => {
      const packagedAt = new Date(row.packaged_at);
      const expirationDate = new Date(packagedAt);
      expirationDate.setMonth(expirationDate.getMonth() + row.shelf_life_months);
      const daysRemaining = Math.floor((expirationDate.getTime() - now) / (1000 * 60 * 60 * 24));

      return {
        packagingBatchId: row.packaging_batch_id,
        batchCode: row.batch_code,
        seedLotId: row.seed_lot_id,
        lotCode: row.lot_code,
        crop: row.crop,
        variety: row.variety,
        packagedAt: row.packaged_at,
        shelfLifeMonths: row.shelf_life_months,
        expirationDate: expirationDate.toISOString(),
        daysRemaining,
        status: classifyExpiration(daysRemaining),
        currentLocationCode: row.location_code,
        currentLocationZone: row.location_zone,
        currentLocationShelf: row.location_shelf,
        currentLocationTemperatureC: row.location_temperature_c === null ? null : Number(row.location_temperature_c),
      };
    })
    .sort((a, b) => a.daysRemaining - b.daysRemaining);
}

export async function getCriticalExpirations(): Promise<ExpirationEntry[]> {
  const all = await getExpirationStatuses();
  return all.filter((entry) => entry.status === 'critical' || entry.status === 'expired');
}

/**
 * The FIFO pick recommendation for a crop+variety — oldest packaged batch
 * first, regardless of which warehouse it's currently sitting in.
 */
export async function getFifoPickOrder(crop: string, variety: string): Promise<FifoPickEntry[]> {
  if (!crop?.trim() || !variety?.trim()) throw new ValidationError('crop and variety are required');

  const result = await pool.query<{
    packaging_batch_id: string;
    batch_code: string;
    packaged_at: string;
    unit_count: number;
    total_quantity: number;
    unit_of_measure: string;
    lot_code: string;
    location_code: string | null;
    location_zone: string | null;
  }>(
    `SELECT pb.id AS packaging_batch_id, pb.batch_code, pb.created_at AS packaged_at, pb.unit_count, pb.total_quantity, pb.unit_of_measure,
            sl.lot_code,
            loc.code AS location_code, loc.warehouse_zone AS location_zone
     FROM packaging_batches pb
     JOIN seed_lots sl ON sl.id = pb.seed_lot_id
     LEFT JOIN storage_assignments sa ON sa.packaging_batch_id = pb.id AND sa.status = 'active'
     LEFT JOIN storage_locations loc ON loc.id = sa.storage_location_id
     WHERE pb.status = 'active' AND sl.crop = $1 AND sl.variety = $2
     ORDER BY pb.created_at ASC`,
    [crop.trim(), variety.trim()],
  );

  const now = Date.now();
  return result.rows.map((row) => ({
    packagingBatchId: row.packaging_batch_id,
    batchCode: row.batch_code,
    lotCode: row.lot_code,
    packagedAt: row.packaged_at,
    unitCount: row.unit_count,
    totalQuantity: Number(row.total_quantity),
    unitOfMeasure: row.unit_of_measure,
    currentLocationCode: row.location_code,
    currentLocationZone: row.location_zone,
    daysInStorage: Math.floor((now - new Date(row.packaged_at).getTime()) / (1000 * 60 * 60 * 24)),
  }));
}

/**
 * Cost per stay (one entry per storage_assignments row) — daily_rate_per_unit
 * (set on the location) times the batch's unit_count times days stored.
 * Summing entries for one packagingBatchId across moves gives its
 * lifetime storage cost.
 */
export async function getStorageCosts(filters: { packagingBatchId?: string }): Promise<StorageCostEntry[]> {
  const conditions: string[] = [];
  const values: unknown[] = [];
  if (filters.packagingBatchId) {
    values.push(filters.packagingBatchId);
    conditions.push(`sa.packaging_batch_id = $${values.length}`);
  }
  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const result = await pool.query<{
    packaging_batch_id: string;
    batch_code: string;
    unit_count: number;
    storage_location_id: string;
    location_code: string;
    daily_rate_per_unit: number;
    stored_at: string;
    ended_at: string | null;
    status: string;
  }>(
    `SELECT pb.id AS packaging_batch_id, pb.batch_code, pb.unit_count,
            sa.storage_location_id, loc.code AS location_code, loc.daily_rate_per_unit,
            sa.stored_at, sa.ended_at, sa.status
     FROM storage_assignments sa
     JOIN packaging_batches pb ON pb.id = sa.packaging_batch_id
     JOIN storage_locations loc ON loc.id = sa.storage_location_id
     ${whereClause}
     ORDER BY sa.stored_at DESC`,
    values,
  );

  const now = Date.now();
  return result.rows.map((row) => {
    const start = new Date(row.stored_at).getTime();
    const end = row.ended_at ? new Date(row.ended_at).getTime() : now;
    const daysStored = Math.max(0, Math.ceil((end - start) / (1000 * 60 * 60 * 24)));
    const accruedCost = Math.round(Number(row.daily_rate_per_unit) * row.unit_count * daysStored * 100) / 100;

    return {
      packagingBatchId: row.packaging_batch_id,
      batchCode: row.batch_code,
      storageLocationId: row.storage_location_id,
      locationCode: row.location_code,
      dailyRatePerUnit: Number(row.daily_rate_per_unit),
      unitCount: row.unit_count,
      daysStored,
      accruedCost,
      status: row.status,
    };
  });
}
