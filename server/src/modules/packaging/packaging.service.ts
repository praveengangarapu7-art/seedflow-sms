import type { PoolClient } from 'pg';
import { pool } from '../../db/pool';
import { withTransaction } from '../../db/transaction';
import { ConflictError, NotFoundError, ValidationError } from '../../errors';
import type { AuthenticatedUser } from '../../middleware/requireAuth';
import { broadcast } from '../../ws/server';
import { insertAuditLog } from '../auditLogs/auditLogs.service';
import { withAvailability, type SeedLot } from '../seedLots/seedLots.types';
import type { CreatePackagingBatchInput, PackagingBatchRow, PackagingUnitRow, UnitLabelData } from './packaging.types';

async function generateBatchCode(client: PoolClient): Promise<string> {
  const year = new Date().getFullYear();
  const countResult = await client.query<{ count: string }>(
    'SELECT COUNT(*)::int AS count FROM packaging_batches WHERE batch_code LIKE $1',
    [`PKG-${year}-%`],
  );
  const next = Number(countResult.rows[0].count) + 1;
  return `PKG-${year}-${String(next).padStart(4, '0')}`;
}

export async function createPackagingBatch(
  input: CreatePackagingBatchInput,
  user: AuthenticatedUser,
): Promise<{ batch: PackagingBatchRow; units: PackagingUnitRow[] }> {
  if (!input.seedLotId) throw new ValidationError('seedLotId is required');
  if (!Number.isFinite(Number(input.unitSize)) || Number(input.unitSize) <= 0) {
    throw new ValidationError('unitSize must be a positive number');
  }
  if (!Number.isInteger(Number(input.unitCount)) || Number(input.unitCount) <= 0) {
    throw new ValidationError('unitCount must be a positive integer');
  }
  if (Number(input.unitCount) > 5000) {
    throw new ValidationError('unitCount cannot exceed 5000 in a single batch');
  }
  if (!input.storageConditions?.trim()) throw new ValidationError('storageConditions is required');
  if (!Number.isInteger(Number(input.shelfLifeMonths)) || Number(input.shelfLifeMonths) <= 0) {
    throw new ValidationError('shelfLifeMonths must be a positive integer');
  }

  const totalQuantity = Math.round(Number(input.unitSize) * Number(input.unitCount) * 100) / 100;

  const result = await withTransaction(async (client) => {
    const lotResult = await client.query<SeedLot>('SELECT * FROM seed_lots WHERE id = $1 FOR UPDATE', [input.seedLotId]);
    const lot = lotResult.rows[0];
    if (!lot) throw new NotFoundError(`Seed lot ${input.seedLotId} not found`);
    if (lot.stage !== 'Certified') {
      throw new ValidationError(`Only Certified-stage lots can be packaged (this lot is ${lot.stage})`);
    }
    if (lot.status !== 'active') {
      throw new ConflictError(`Seed lot ${lot.lot_code} is not active (status: ${lot.status})`);
    }

    const available = Number(lot.quantity_total) - Number(lot.quantity_allocated);
    if (totalQuantity > available) {
      throw new ConflictError(
        `Requested packaging quantity ${totalQuantity}${lot.unit} exceeds available quantity ${available}${lot.unit} for lot ${lot.lot_code}`,
      );
    }

    const batchCode = await generateBatchCode(client);
    const batchResult = await client.query<PackagingBatchRow>(
      `INSERT INTO packaging_batches (batch_code, seed_lot_id, unit_size, unit_count, unit_of_measure, total_quantity, storage_conditions, shelf_life_months, packaged_by)
       VALUES ($1, $2, $3, $4, COALESCE($5, 'kg'), $6, $7, $8, $9)
       RETURNING *`,
      [
        batchCode,
        input.seedLotId,
        input.unitSize,
        input.unitCount,
        input.unitOfMeasure ?? null,
        totalQuantity,
        input.storageConditions.trim(),
        input.shelfLifeMonths,
        user.email,
      ],
    );
    const batch = batchResult.rows[0];

    // Bulk-insert one row per physical bag in a single statement rather
    // than one INSERT per unit.
    const values: unknown[] = [];
    const placeholders: string[] = [];
    for (let sequence = 1; sequence <= input.unitCount; sequence += 1) {
      const unitCode = `${batchCode}-${String(sequence).padStart(4, '0')}`;
      const base = values.length;
      values.push(batch.id, unitCode, sequence);
      placeholders.push(`($${base + 1}, $${base + 2}, $${base + 3})`);
    }
    const unitsResult = await client.query<PackagingUnitRow>(
      `INSERT INTO packaging_units (packaging_batch_id, unit_code, sequence_number) VALUES ${placeholders.join(', ')} RETURNING *`,
      values,
    );

    // Same reservation mechanism as an allocation, so a lot can never be
    // packaged past what's physically available.
    const updatedLotResult = await client.query<SeedLot>(
      'UPDATE seed_lots SET quantity_allocated = quantity_allocated + $1 WHERE id = $2 RETURNING *',
      [totalQuantity, input.seedLotId],
    );
    const updatedLot = updatedLotResult.rows[0];

    await insertAuditLog(client, {
      entityType: 'packaging_batch',
      entityId: batch.id,
      action: 'CREATE',
      performedBy: user.email,
      afterState: batch,
      metadata: { seedLotId: input.seedLotId, unitCount: input.unitCount },
    });

    return { batch, units: unitsResult.rows.sort((a, b) => a.sequence_number - b.sequence_number), lot: updatedLot };
  });

  const lotWithAvailability = withAvailability(result.lot);
  broadcast('INVENTORY_UPDATE', {
    action: 'PACKAGE',
    seedLot: lotWithAvailability,
    performedBy: { email: user.email, role: user.role },
  });
  if (lotWithAvailability.is_low_stock) {
    broadcast('LOW_STOCK_ALERT', {
      seedLotId: result.lot.id,
      lotCode: result.lot.lot_code,
      crop: result.lot.crop,
      organizationId: result.lot.organization_id,
      quantityAvailable: lotWithAvailability.quantity_available,
      lowStockThreshold: result.lot.low_stock_threshold,
      unit: result.lot.unit,
    });
  }
  broadcast('PACKAGING_BATCH_CREATED', {
    id: result.batch.id,
    batchCode: result.batch.batch_code,
    seedLotId: input.seedLotId,
    unitCount: input.unitCount,
  });

  return { batch: result.batch, units: result.units };
}

export async function listPackagingBatches(filters: { seedLotId?: string; status?: string }): Promise<PackagingBatchRow[]> {
  const conditions: string[] = [];
  const values: unknown[] = [];
  if (filters.seedLotId) {
    values.push(filters.seedLotId);
    conditions.push(`seed_lot_id = $${values.length}`);
  }
  if (filters.status) {
    values.push(filters.status);
    conditions.push(`status = $${values.length}`);
  }
  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const result = await pool.query<PackagingBatchRow>(`SELECT * FROM packaging_batches ${whereClause} ORDER BY created_at DESC`, values);
  return result.rows;
}

export async function getPackagingBatch(id: string): Promise<PackagingBatchRow> {
  const result = await pool.query<PackagingBatchRow>('SELECT * FROM packaging_batches WHERE id = $1', [id]);
  const batch = result.rows[0];
  if (!batch) throw new NotFoundError(`Packaging batch ${id} not found`);
  return batch;
}

export async function listPackagingUnits(batchId: string): Promise<PackagingUnitRow[]> {
  const result = await pool.query<PackagingUnitRow>(
    'SELECT * FROM packaging_units WHERE packaging_batch_id = $1 ORDER BY sequence_number ASC',
    [batchId],
  );
  return result.rows;
}

const VALID_UNIT_STATUSES = ['packaged', 'distributed', 'sold', 'damaged'];

export async function updateUnitStatus(unitId: string, status: string, user: AuthenticatedUser): Promise<PackagingUnitRow> {
  if (!VALID_UNIT_STATUSES.includes(status)) {
    throw new ValidationError(`status must be one of: ${VALID_UNIT_STATUSES.join(', ')}`);
  }

  return withTransaction(async (client) => {
    const result = await client.query<PackagingUnitRow>('SELECT * FROM packaging_units WHERE id = $1 FOR UPDATE', [unitId]);
    const unit = result.rows[0];
    if (!unit) throw new NotFoundError(`Packaging unit ${unitId} not found`);

    const updateResult = await client.query<PackagingUnitRow>(
      'UPDATE packaging_units SET status = $1 WHERE id = $2 RETURNING *',
      [status, unitId],
    );
    const updated = updateResult.rows[0];

    await insertAuditLog(client, {
      entityType: 'packaging_unit',
      entityId: unitId,
      action: 'STATUS_CHANGE',
      performedBy: user.email,
      beforeState: { status: unit.status },
      afterState: { status: updated.status },
    });

    return updated;
  });
}

/**
 * Everything a printable label / QR code needs: lot identity, shelf-life
 * and storage conditions from the packaging batch, and a real germination
 * percentage aggregated from the lot's actual germination_tests — no
 * placeholder numbers.
 */
export async function getUnitLabelData(unitId: string): Promise<UnitLabelData> {
  const result = await pool.query<{
    unit_code: string;
    sequence_number: number;
    batch_code: string;
    unit_size: number;
    unit_of_measure: string;
    shelf_life_months: number;
    storage_conditions: string;
    packaged_at: string;
    lot_code: string;
    crop: string;
    variety: string;
    stage: string;
    seed_lot_id: string;
  }>(
    `SELECT
       u.unit_code, u.sequence_number,
       b.batch_code, b.unit_size, b.unit_of_measure, b.shelf_life_months, b.storage_conditions, b.created_at AS packaged_at,
       sl.id AS seed_lot_id, sl.lot_code, sl.crop, sl.variety, sl.stage
     FROM packaging_units u
     JOIN packaging_batches b ON b.id = u.packaging_batch_id
     JOIN seed_lots sl ON sl.id = b.seed_lot_id
     WHERE u.id = $1`,
    [unitId],
  );
  const row = result.rows[0];
  if (!row) throw new NotFoundError(`Packaging unit ${unitId} not found`);

  const germinationResult = await pool.query<{ total_sample: string; total_germinated: string }>(
    'SELECT SUM(sample_size) AS total_sample, SUM(germinated_count) AS total_germinated FROM germination_tests WHERE seed_lot_id = $1',
    [row.seed_lot_id],
  );
  const totalSample = Number(germinationResult.rows[0].total_sample ?? 0);
  const totalGerminated = Number(germinationResult.rows[0].total_germinated ?? 0);
  const germinationPercent = totalSample > 0 ? Math.round((totalGerminated / totalSample) * 1000) / 10 : null;

  const certResult = await pool.query<{ signed_at: string }>(
    "SELECT signed_at FROM quality_certificates WHERE seed_lot_id = $1 AND status = 'issued' ORDER BY signed_at DESC LIMIT 1",
    [row.seed_lot_id],
  );
  const certifiedDate = certResult.rows[0]?.signed_at ?? null;

  const qrPayload = JSON.stringify({
    unitCode: row.unit_code,
    lotCode: row.lot_code,
    crop: row.crop,
    variety: row.variety,
    stage: row.stage,
    batchCode: row.batch_code,
    certifiedDate,
  });

  return {
    unitCode: row.unit_code,
    batchCode: row.batch_code,
    sequenceNumber: row.sequence_number,
    lotCode: row.lot_code,
    crop: row.crop,
    variety: row.variety,
    stage: row.stage,
    unitSize: Number(row.unit_size),
    unitOfMeasure: row.unit_of_measure,
    shelfLifeMonths: row.shelf_life_months,
    storageConditions: row.storage_conditions,
    packagedAt: row.packaged_at,
    certifiedDate,
    germinationPercent,
    qrPayload,
  };
}
