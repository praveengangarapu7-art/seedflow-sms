import { pool } from '../../db/pool';
import { withTransaction } from '../../db/transaction';
import { ConflictError, NotFoundError, ValidationError } from '../../errors';
import type { AuthenticatedUser } from '../../middleware/requireAuth';
import { insertAuditLog } from '../auditLogs/auditLogs.service';
import { SEED_LOT_STAGES } from '../seedLots/seedLots.types';
import type {
  CorrectionHistoryEntry,
  CorrectQuantityInput,
  InventoryCountRow,
  OrphanLotEntry,
  ReconciliationEntry,
  RecordInventoryCountInput,
  SeedLotViolation,
  ViolationType,
} from './dataGovernance.types';

const MAX_MULTIPLICATION_RATIO = 50;
// A lot is only ever a cleanup candidate once it's had this long with zero
// activity — young lots simply haven't been touched yet, that's not orphaned.
const ORPHAN_AGE_DAYS = 90;

function stageRank(stage: string): number {
  return SEED_LOT_STAGES.indexOf(stage as (typeof SEED_LOT_STAGES)[number]);
}

/**
 * node-postgres returns DATE columns as JS Date objects at local midnight.
 * toISOString() would shift by the UTC offset and can print the wrong
 * calendar day, so format from the local getters instead.
 */
function formatDate(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Re-checks every parent-child pair against the same rules the DB trigger
 * (migration 025) now enforces on new writes. Existing rows can still violate
 * them — the trigger only fires going forward — so this is what surfaces
 * lots that predate the rule (or were seeded before it existed).
 */
export async function scanForViolations(): Promise<SeedLotViolation[]> {
  const result = await pool.query<{
    id: string;
    lot_code: string;
    crop: string;
    stage: string;
    production_date: string;
    quantity_total: string;
    parent_id: string;
    parent_lot_code: string;
    parent_crop: string;
    parent_stage: string;
    parent_production_date: string;
    parent_quantity_total: string;
  }>(
    `SELECT c.id, c.lot_code, c.crop, c.stage, c.production_date, c.quantity_total,
            p.id AS parent_id, p.lot_code AS parent_lot_code, p.crop AS parent_crop,
            p.stage AS parent_stage, p.production_date AS parent_production_date,
            p.quantity_total AS parent_quantity_total
     FROM seed_lots c
     JOIN seed_lots p ON p.id = c.parent_lot_id`,
  );

  const violations: SeedLotViolation[] = [];

  for (const row of result.rows) {
    const base = {
      seedLotId: row.id,
      lotCode: row.lot_code,
      crop: row.crop,
      stage: row.stage,
      parentLotId: row.parent_id,
      parentLotCode: row.parent_lot_code,
    };

    if (row.crop !== row.parent_crop) {
      violations.push({
        ...base,
        violationType: 'CROP_MISMATCH' as ViolationType,
        description: `Crop (${row.crop}) does not match parent lot ${row.parent_lot_code}'s crop (${row.parent_crop})`,
      });
    }

    if (stageRank(row.stage) !== stageRank(row.parent_stage) + 1) {
      violations.push({
        ...base,
        violationType: 'STAGE_HIERARCHY' as ViolationType,
        description: `Stage (${row.stage}) is not exactly one step past parent lot ${row.parent_lot_code}'s stage (${row.parent_stage})`,
      });
    }

    if (row.production_date <= row.parent_production_date) {
      violations.push({
        ...base,
        violationType: 'PRODUCTION_DATE' as ViolationType,
        description: `Production date (${formatDate(row.production_date)}) is not after parent lot ${row.parent_lot_code}'s production date (${formatDate(row.parent_production_date)})`,
      });
    }

    const quantityTotal = Number(row.quantity_total);
    const parentQuantityTotal = Number(row.parent_quantity_total);
    if (parentQuantityTotal > 0 && quantityTotal > parentQuantityTotal * MAX_MULTIPLICATION_RATIO) {
      violations.push({
        ...base,
        violationType: 'QUANTITY_LIMIT' as ViolationType,
        description: `Quantity (${quantityTotal}) exceeds ${MAX_MULTIPLICATION_RATIO}x parent lot ${row.parent_lot_code}'s quantity (${parentQuantityTotal})`,
      });
    }
  }

  return violations;
}

export async function recordInventoryCount(
  input: RecordInventoryCountInput,
  user: AuthenticatedUser,
): Promise<InventoryCountRow> {
  if (!input.seedLotId) throw new ValidationError('seedLotId is required');
  const countedQuantity = Number(input.countedQuantity);
  if (!Number.isFinite(countedQuantity) || countedQuantity < 0) {
    throw new ValidationError('countedQuantity must be a non-negative number');
  }

  return withTransaction(async (client) => {
    const lotResult = await client.query<{ quantity_total: string; quantity_allocated: string }>(
      'SELECT quantity_total, quantity_allocated FROM seed_lots WHERE id = $1',
      [input.seedLotId],
    );
    const lot = lotResult.rows[0];
    if (!lot) throw new NotFoundError(`Seed lot ${input.seedLotId} not found`);

    const recordedQuantity = Number(lot.quantity_total) - Number(lot.quantity_allocated);
    const discrepancy = Math.round((countedQuantity - recordedQuantity) * 100) / 100;

    const result = await client.query<InventoryCountRow>(
      `INSERT INTO inventory_counts (seed_lot_id, counted_quantity, recorded_quantity, discrepancy, counted_by, count_date, notes)
       VALUES ($1, $2, $3, $4, $5, COALESCE($6::date, CURRENT_DATE), $7)
       RETURNING *`,
      [input.seedLotId, countedQuantity, recordedQuantity, discrepancy, user.email, input.countDate ?? null, input.notes ?? null],
    );
    const row = result.rows[0];

    await insertAuditLog(client, {
      entityType: 'inventory_count',
      entityId: row.id,
      action: 'RECORD',
      performedBy: user.email,
      afterState: row,
      metadata: { seedLotId: input.seedLotId },
    });

    return row;
  });
}

export async function getReconciliationReport(): Promise<ReconciliationEntry[]> {
  const result = await pool.query<{
    id: string;
    seed_lot_id: string;
    lot_code: string;
    crop: string;
    variety: string;
    counted_quantity: string;
    recorded_quantity: string;
    discrepancy: string;
    counted_by: string;
    count_date: string;
    notes: string | null;
  }>(
    `SELECT DISTINCT ON (ic.seed_lot_id) ic.id, ic.seed_lot_id, sl.lot_code, sl.crop, sl.variety,
            ic.counted_quantity, ic.recorded_quantity, ic.discrepancy, ic.counted_by, ic.count_date, ic.notes
     FROM inventory_counts ic
     JOIN seed_lots sl ON sl.id = ic.seed_lot_id
     ORDER BY ic.seed_lot_id, ic.count_date DESC, ic.created_at DESC`,
  );

  return result.rows.map((row) => {
    const recordedQuantity = Number(row.recorded_quantity);
    const discrepancy = Number(row.discrepancy);
    return {
      id: row.id,
      seedLotId: row.seed_lot_id,
      lotCode: row.lot_code,
      crop: row.crop,
      variety: row.variety,
      countedQuantity: Number(row.counted_quantity),
      recordedQuantity,
      discrepancy,
      discrepancyPct: recordedQuantity !== 0 ? Math.round((discrepancy / recordedQuantity) * 1000) / 10 : null,
      countedBy: row.counted_by,
      countDate: row.count_date,
      notes: row.notes,
    };
  });
}

/**
 * A lot qualifies as an orphan only once it's had ORPHAN_AGE_DAYS with zero
 * allocation activity AND zero packaging activity — not merely "unused
 * today," since a fresh Breeder lot is normal, not orphaned.
 */
export async function listOrphanLots(): Promise<OrphanLotEntry[]> {
  const result = await pool.query<{
    id: string;
    lot_code: string;
    crop: string;
    variety: string;
    stage: string;
    status: string;
    created_at: string;
    days_since_created: string;
  }>(
    `SELECT sl.id, sl.lot_code, sl.crop, sl.variety, sl.stage, sl.status, sl.created_at,
            EXTRACT(DAY FROM now() - sl.created_at)::int AS days_since_created
     FROM seed_lots sl
     WHERE sl.status = 'active'
       AND sl.created_at < now() - ($1 || ' days')::interval
       AND NOT EXISTS (SELECT 1 FROM seed_lot_allocations a WHERE a.seed_lot_id = sl.id)
       AND NOT EXISTS (SELECT 1 FROM packaging_batches pb WHERE pb.seed_lot_id = sl.id)
       AND NOT EXISTS (SELECT 1 FROM seed_lots child WHERE child.parent_lot_id = sl.id)
     ORDER BY sl.created_at ASC`,
    [ORPHAN_AGE_DAYS],
  );

  return result.rows.map((row) => ({
    seedLotId: row.id,
    lotCode: row.lot_code,
    crop: row.crop,
    variety: row.variety,
    stage: row.stage,
    status: row.status,
    createdAt: row.created_at,
    daysSinceCreated: Number(row.days_since_created),
  }));
}

export async function archiveOrphanLot(id: string, reason: string, user: AuthenticatedUser) {
  if (!reason?.trim()) throw new ValidationError('reason is required to archive a seed lot');

  return withTransaction(async (client) => {
    const existingResult = await client.query('SELECT * FROM seed_lots WHERE id = $1 FOR UPDATE', [id]);
    const existing = existingResult.rows[0];
    if (!existing) throw new NotFoundError(`Seed lot ${id} not found`);
    if (existing.status !== 'active') {
      throw new ConflictError(`Seed lot ${id} is not active (status: ${existing.status})`);
    }

    const [allocationCheck, packagingCheck, childCheck] = await Promise.all([
      client.query('SELECT 1 FROM seed_lot_allocations WHERE seed_lot_id = $1 LIMIT 1', [id]),
      client.query('SELECT 1 FROM packaging_batches WHERE seed_lot_id = $1 LIMIT 1', [id]),
      client.query('SELECT 1 FROM seed_lots WHERE parent_lot_id = $1 LIMIT 1', [id]),
    ]);
    if (allocationCheck.rows.length > 0 || packagingCheck.rows.length > 0 || childCheck.rows.length > 0) {
      throw new ConflictError(`Seed lot ${id} has allocation, packaging, or child-lot activity — it is not an orphan`);
    }

    const result = await client.query('UPDATE seed_lots SET status = $1 WHERE id = $2 RETURNING *', ['archived', id]);
    const updated = result.rows[0];

    await insertAuditLog(client, {
      entityType: 'seed_lot',
      entityId: id,
      action: 'ARCHIVE_ORPHAN',
      performedBy: user.email,
      beforeState: existing,
      afterState: updated,
      metadata: { reason: reason.trim() },
    });

    return updated;
  });
}

export async function correctSeedLotQuantity(id: string, input: CorrectQuantityInput, user: AuthenticatedUser) {
  if (!input.reason?.trim()) throw new ValidationError('reason is required for a data correction');
  const quantityTotal = Number(input.quantityTotal);
  if (!Number.isFinite(quantityTotal) || quantityTotal < 0) {
    throw new ValidationError('quantityTotal must be a non-negative number');
  }

  return withTransaction(async (client) => {
    const existingResult = await client.query('SELECT * FROM seed_lots WHERE id = $1 FOR UPDATE', [id]);
    const existing = existingResult.rows[0];
    if (!existing) throw new NotFoundError(`Seed lot ${id} not found`);

    if (quantityTotal < Number(existing.quantity_allocated)) {
      throw new ConflictError(
        `quantityTotal (${quantityTotal}) cannot be less than the already allocated quantity (${existing.quantity_allocated})`,
      );
    }

    const result = await client.query(
      'UPDATE seed_lots SET quantity_total = $1 WHERE id = $2 RETURNING *',
      [quantityTotal, id],
    );
    const updated = result.rows[0];

    await insertAuditLog(client, {
      entityType: 'seed_lot',
      entityId: id,
      action: 'DATA_CORRECTION',
      performedBy: user.email,
      beforeState: existing,
      afterState: updated,
      metadata: { reason: input.reason.trim() },
    });

    return updated;
  });
}

export async function getCorrectionHistory(seedLotId?: string): Promise<CorrectionHistoryEntry[]> {
  const conditions = [`action IN ('DATA_CORRECTION', 'ARCHIVE_ORPHAN')`, `entity_type = 'seed_lot'`];
  const values: unknown[] = [];
  if (seedLotId) {
    values.push(seedLotId);
    conditions.push(`entity_id = $${values.length}`);
  }

  const result = await pool.query<{
    id: string;
    entity_id: string;
    action: string;
    performed_by: string;
    before_state: unknown;
    after_state: unknown;
    metadata: unknown;
    created_at: string;
  }>(
    `SELECT id, entity_id, action, performed_by, before_state, after_state, metadata, created_at
     FROM audit_logs WHERE ${conditions.join(' AND ')} ORDER BY created_at DESC`,
    values,
  );

  return result.rows.map((row) => ({
    id: row.id,
    entityId: row.entity_id,
    action: row.action,
    performedBy: row.performed_by,
    beforeState: row.before_state,
    afterState: row.after_state,
    metadata: row.metadata,
    createdAt: row.created_at,
  }));
}
