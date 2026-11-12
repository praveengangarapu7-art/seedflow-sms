import type { PoolClient } from 'pg';
import { pool } from '../../db/pool';
import { withTransaction } from '../../db/transaction';
import { ConflictError, NotFoundError } from '../../errors';
import type { AuthenticatedUser } from '../../middleware/requireAuth';
import { insertAuditLog } from '../auditLogs/auditLogs.service';
import { assertSeedLotExists, requireText } from './quality.common';
import type { LotHoldRow } from './quality.types';

interface PlaceHoldParams {
  seedLotId: string;
  reason: string;
  sourceType: 'ncr' | 'complaint' | 'manual';
  sourceId?: string | null;
}

/**
 * Places a hold inside the caller's transaction. When `skipIfActive` is set
 * (used by the automatic holds raised for critical NCRs/complaints) an
 * existing active hold is left alone and returned instead of failing the
 * whole business operation that triggered it.
 */
export async function placeHoldTx(
  client: PoolClient,
  params: PlaceHoldParams,
  user: AuthenticatedUser,
  skipIfActive = false,
): Promise<LotHoldRow> {
  await assertSeedLotExists(client, params.seedLotId);

  const existing = await client.query<LotHoldRow>(
    'SELECT * FROM quality_lot_holds WHERE seed_lot_id = $1 AND released_at IS NULL',
    [params.seedLotId],
  );
  if (existing.rows[0]) {
    if (skipIfActive) return existing.rows[0];
    throw new ConflictError('This seed lot is already on quality hold');
  }

  const inserted = await client.query<LotHoldRow>(
    `INSERT INTO quality_lot_holds (seed_lot_id, reason, source_type, source_id, placed_by)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [params.seedLotId, params.reason, params.sourceType, params.sourceId ?? null, user.email],
  );
  const hold = inserted.rows[0];
  await insertAuditLog(client, {
    entityType: 'quality_lot_hold',
    entityId: hold.id,
    action: 'PLACE_HOLD',
    performedBy: user.email,
    afterState: hold,
    metadata: { seedLotId: params.seedLotId, sourceType: params.sourceType, sourceId: params.sourceId ?? null },
  });
  return hold;
}

export async function placeManualHold(input: Record<string, unknown>, user: AuthenticatedUser): Promise<LotHoldRow> {
  const seedLotId = requireText(input.seedLotId, 'seedLotId', 64);
  const reason = requireText(input.reason, 'reason', 1000);
  return withTransaction((client) => placeHoldTx(client, { seedLotId, reason, sourceType: 'manual' }, user));
}

export async function releaseHold(holdId: string, input: Record<string, unknown>, user: AuthenticatedUser): Promise<LotHoldRow> {
  const releaseNotes = requireText(input.releaseNotes, 'releaseNotes', 1000);
  return withTransaction(async (client) => {
    const found = await client.query<LotHoldRow>('SELECT * FROM quality_lot_holds WHERE id = $1 FOR UPDATE', [holdId]);
    const hold = found.rows[0];
    if (!hold) throw new NotFoundError(`Hold ${holdId} not found`);
    if (hold.released_at) throw new ConflictError('This hold has already been released');

    // A lot cannot be released while a critical NCR that put it on hold is
    // still open: the hold is the containment for that NCR.
    // Any open critical NCR on the lot blocks release, not just the one that
    // placed this hold — several may have been raised against the same lot.
    const openNcrs = await client.query<{ ncr_code: string }>(
      `SELECT ncr_code FROM non_conformances
        WHERE seed_lot_id = $1 AND severity = 'critical' AND status IN ('open', 'investigating')
        ORDER BY ncr_code`,
      [hold.seed_lot_id],
    );
    if (hold.source_type === 'ncr' && hold.source_id) {
      const src = await client.query<{ status: string; ncr_code: string }>(
        'SELECT status, ncr_code FROM non_conformances WHERE id = $1',
        [hold.source_id],
      );
      const s = src.rows[0];
      if (s && !['closed', 'cancelled'].includes(s.status) && !openNcrs.rows.some((r) => r.ncr_code === s.ncr_code)) {
        openNcrs.rows.push({ ncr_code: s.ncr_code });
      }
    }
    if (openNcrs.rows.length) {
      throw new ConflictError(
        `Close ${openNcrs.rows.map((r) => r.ncr_code).join(', ')} before releasing the hold on this lot`,
      );
    }

    const updated = await client.query<LotHoldRow>(
      `UPDATE quality_lot_holds SET released_by = $2, released_at = now(), release_notes = $3
        WHERE id = $1 RETURNING *`,
      [holdId, user.email, releaseNotes],
    );
    await insertAuditLog(client, {
      entityType: 'quality_lot_hold',
      entityId: holdId,
      action: 'RELEASE_HOLD',
      performedBy: user.email,
      beforeState: hold,
      afterState: updated.rows[0],
    });
    return updated.rows[0];
  });
}

export async function listHolds(filters: { active?: boolean; seedLotId?: string }) {
  const conditions: string[] = [];
  const values: unknown[] = [];
  if (filters.active === true) conditions.push('h.released_at IS NULL');
  if (filters.active === false) conditions.push('h.released_at IS NOT NULL');
  if (filters.seedLotId) {
    values.push(filters.seedLotId);
    conditions.push(`h.seed_lot_id = $${values.length}`);
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const result = await pool.query(
    `SELECT h.*, l.lot_code, l.crop, l.variety
       FROM quality_lot_holds h JOIN seed_lots l ON l.id = h.seed_lot_id
       ${where}
      ORDER BY h.placed_at DESC LIMIT 200`,
    values,
  );
  return result.rows;
}

/**
 * Everything downstream of a lot that a recall or stop-sale decision needs:
 * how much was packaged, how many bags have left the building, who the lot was
 * allocated to, and which quality events already reference it. This is the
 * Phase 1 foundation for Phase 3's recall management — it scopes the problem
 * before any recall workflow exists.
 */
export async function getLotImpact(seedLotId: string) {
  const lotResult = await pool.query(
    `SELECT id, lot_code, crop, variety, stage, status, testing_status, quantity_total, quantity_allocated, unit
       FROM seed_lots WHERE id = $1`,
    [seedLotId],
  );
  const lot = lotResult.rows[0];
  if (!lot) throw new NotFoundError(`Seed lot ${seedLotId} not found`);

  const [packaging, allocations, holds, ncrs, complaints] = await Promise.all([
    pool.query(
      `SELECT b.id, b.batch_code, b.unit_count, b.unit_size, b.unit_of_measure, b.total_quantity, b.status,
              COUNT(u.id) FILTER (WHERE u.status = 'packaged')::int AS units_packaged,
              COUNT(u.id) FILTER (WHERE u.status = 'distributed')::int AS units_distributed,
              COUNT(u.id) FILTER (WHERE u.status = 'sold')::int AS units_sold,
              COUNT(u.id) FILTER (WHERE u.status = 'damaged')::int AS units_damaged
         FROM packaging_batches b LEFT JOIN packaging_units u ON u.packaging_batch_id = b.id
        WHERE b.seed_lot_id = $1 GROUP BY b.id ORDER BY b.created_at`,
      [seedLotId],
    ),
    pool.query(
      `SELECT id, allocated_to, quantity, status, created_at FROM seed_lot_allocations
        WHERE seed_lot_id = $1 ORDER BY created_at`,
      [seedLotId],
    ),
    pool.query('SELECT * FROM quality_lot_holds WHERE seed_lot_id = $1 ORDER BY placed_at DESC', [seedLotId]),
    pool.query(
      'SELECT id, ncr_code, title, severity, status FROM non_conformances WHERE seed_lot_id = $1 ORDER BY created_at DESC',
      [seedLotId],
    ),
    pool.query(
      'SELECT id, complaint_code, title, severity, status, recall_recommended FROM quality_complaints WHERE seed_lot_id = $1 ORDER BY created_at DESC',
      [seedLotId],
    ),
  ]);

  const activeAllocations = allocations.rows.filter((a) => a.status === 'allocated');
  const totals = packaging.rows.reduce(
    (acc, b) => ({
      units: acc.units + Number(b.unit_count),
      distributed: acc.distributed + Number(b.units_distributed),
      sold: acc.sold + Number(b.units_sold),
    }),
    { units: 0, distributed: 0, sold: 0 },
  );

  return {
    lot,
    packagingBatches: packaging.rows,
    allocations: allocations.rows,
    holds: holds.rows,
    nonConformances: ncrs.rows,
    complaints: complaints.rows,
    summary: {
      activeHold: holds.rows.some((h) => h.released_at === null),
      packagingBatchCount: packaging.rows.length,
      unitsPackaged: totals.units,
      unitsDistributed: totals.distributed,
      unitsSold: totals.sold,
      unitsInField: totals.distributed + totals.sold,
      activeAllocationCount: activeAllocations.length,
      recipients: [...new Set(activeAllocations.map((a) => a.allocated_to))],
      recallRecommended: complaints.rows.some((c) => c.recall_recommended),
    },
  };
}
