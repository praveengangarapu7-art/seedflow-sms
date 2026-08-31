import { assertOwnsOrganization } from '../../auth/ownership';
import { pool } from '../../db/pool';
import { withTransaction } from '../../db/transaction';
import { ConflictError, NotFoundError, ValidationError } from '../../errors';
import type { AuthenticatedUser } from '../../middleware/requireAuth';
import { insertAuditLog } from '../auditLogs/auditLogs.service';
import { appendHashChainEntry } from '../authenticity/authenticity.service';
import { refreshGenealogyView } from './genealogy.service';
import { SEED_LOT_STAGES, nextStage, type CreateSeedLotInput, type SeedLot, type SeedLotStage, type UpdateSeedLotInput } from './seedLots.types';

function assertValidQuantity(quantity: number, field = 'quantityTotal'): void {
  if (!Number.isFinite(quantity) || quantity < 0) {
    throw new ValidationError(`${field} must be a non-negative number`);
  }
}

export async function listSeedLots(filters: {
  crop?: string;
  status?: string;
  parentLotId?: string;
  limit?: number;
  offset?: number;
}): Promise<SeedLot[]> {
  const conditions: string[] = [];
  const values: unknown[] = [];

  if (filters.crop) {
    values.push(filters.crop);
    conditions.push(`crop = $${values.length}`);
  }
  if (filters.status) {
    values.push(filters.status);
    conditions.push(`status = $${values.length}`);
  }
  if (filters.parentLotId) {
    values.push(filters.parentLotId);
    conditions.push(`parent_lot_id = $${values.length}`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  // limit/offset are opt-in and unbounded by default — every existing
  // caller that doesn't pass them keeps getting the full result set, same
  // as before this was added. A load test against 20k+ rows found the
  // unbounded path taking several seconds (JSON-serializing the whole
  // table, not a query-plan problem — see EXPLAIN ANALYZE in the perf test
  // notes), which is what pagination here is for.
  let paginationClause = '';
  if (filters.limit !== undefined) {
    values.push(filters.limit);
    paginationClause += ` LIMIT $${values.length}`;
  }
  if (filters.offset !== undefined) {
    values.push(filters.offset);
    paginationClause += ` OFFSET $${values.length}`;
  }

  const result = await pool.query<SeedLot>(
    `SELECT * FROM seed_lots ${whereClause} ORDER BY created_at DESC${paginationClause}`,
    values,
  );
  return result.rows;
}

export async function getSeedLotById(id: string): Promise<SeedLot> {
  const result = await pool.query<SeedLot>('SELECT * FROM seed_lots WHERE id = $1', [id]);
  const lot = result.rows[0];
  if (!lot) throw new NotFoundError(`Seed lot ${id} not found`);
  return lot;
}

export async function getChildLots(id: string): Promise<SeedLot[]> {
  const result = await pool.query<SeedLot>('SELECT * FROM seed_lots WHERE parent_lot_id = $1 ORDER BY created_at ASC', [id]);
  return result.rows;
}

/**
 * Admin must specify which organization owns the new lot; every other role
 * can only create lots for the organization their account belongs to (which
 * requireRole + ROLES_REQUIRING_ORGANIZATION already guarantee is set).
 */
function resolveOwningOrganizationId(user: AuthenticatedUser, requestedOrganizationId?: string | null): string {
  if (user.role === 'Admin') {
    if (!requestedOrganizationId) {
      throw new ValidationError('organizationId is required when creating a seed lot as Admin');
    }
    return requestedOrganizationId;
  }
  if (!user.organizationId) {
    throw new ValidationError('Your account is not linked to an organization');
  }
  return user.organizationId;
}

/**
 * A lot with a parent always gets the next stage after its parent's — the
 * `stage` field in the request is ignored in that case, mirroring how
 * organizationId is ignored for non-Admins. A root lot (no parent) uses the
 * requested stage, defaulting to Breeder (the origin of a chain).
 */
function resolveStage(requestedStage: string | undefined, parent: SeedLot | null): SeedLotStage {
  if (parent) {
    if (parent.stage === 'Certified') {
      throw new ValidationError(`Seed lot ${parent.lot_code} is already Certified — the terminal stage, it cannot have child lots`);
    }
    return nextStage(parent.stage);
  }
  if (requestedStage && (SEED_LOT_STAGES as readonly string[]).includes(requestedStage)) {
    return requestedStage as SeedLotStage;
  }
  return 'Breeder';
}

export async function createSeedLot(input: CreateSeedLotInput, user: AuthenticatedUser): Promise<SeedLot> {
  if (!input.lotCode?.trim()) throw new ValidationError('lotCode is required');
  if (!input.crop?.trim()) throw new ValidationError('crop is required');
  if (!input.variety?.trim()) throw new ValidationError('variety is required');
  assertValidQuantity(Number(input.quantityTotal));

  const organizationId = resolveOwningOrganizationId(user, input.organizationId);

  let parent: SeedLot | null = null;
  if (input.parentLotId) {
    parent = await getSeedLotById(input.parentLotId);
    if (parent.crop !== input.crop) {
      throw new ValidationError(`Child seed lot crop (${input.crop}) must match parent seed lot crop (${parent.crop})`);
    }
  }
  const stage = resolveStage(input.stage, parent);

  return withTransaction(async (client) => {
    let result;
    try {
      result = await client.query<SeedLot>(
        `INSERT INTO seed_lots (lot_code, crop, variety, parent_lot_id, stage, quantity_total, unit, source_farm_id, notes, organization_id, low_stock_threshold, production_date)
         VALUES ($1, $2, $3, $4, $5, $6, COALESCE($7, 'kg'), $8, $9, $10, COALESCE($11::numeric, 100), COALESCE($12::date, CURRENT_DATE))
         RETURNING *`,
        [
          input.lotCode.trim(),
          input.crop.trim(),
          input.variety.trim(),
          input.parentLotId ?? null,
          stage,
          input.quantityTotal,
          input.unit ?? null,
          input.sourceFarmId ?? null,
          input.notes ?? null,
          organizationId,
          input.lowStockThreshold ?? null,
          input.productionDate ?? null,
        ],
      );
    } catch (err) {
      // A duplicate lot code is common in bulk/CSV workflows (re-imports,
      // copy-paste mistakes) — worth a clean message instead of the raw
      // constraint-violation text the generic error handler would otherwise
      // pass through.
      if ((err as { code?: string; constraint?: string }).code === '23505' && (err as { constraint?: string }).constraint === 'seed_lots_lot_code_key') {
        throw new ConflictError(`Seed lot code "${input.lotCode.trim()}" already exists`);
      }
      throw err;
    }
    const created = result.rows[0];

    await insertAuditLog(client, {
      entityType: 'seed_lot',
      entityId: created.id,
      action: 'CREATE',
      performedBy: user.email,
      afterState: created,
    });

    // The chain's genesis entry — appended in the same transaction as the
    // INSERT it records, since a lot that exists without one can never be
    // backfilled into the same guarantee (see authenticity.service.ts).
    await appendHashChainEntry(client, created.id, 'CREATE', created, user);

    return created;
  }).then((created) => {
    // Fire-and-forget, outside the transaction that just committed — see
    // genealogy.service.ts for why this can't run inside one.
    refreshGenealogyView();
    return created;
  });
}

export async function updateSeedLot(id: string, input: UpdateSeedLotInput, user: AuthenticatedUser): Promise<SeedLot> {
  return withTransaction(async (client) => {
    const existingResult = await client.query<SeedLot>('SELECT * FROM seed_lots WHERE id = $1 FOR UPDATE', [id]);
    const existing = existingResult.rows[0];
    if (!existing) throw new NotFoundError(`Seed lot ${id} not found`);
    assertOwnsOrganization(user, existing.organization_id, 'You can only update seed lots owned by your organization');

    if (input.quantityTotal !== undefined) {
      assertValidQuantity(Number(input.quantityTotal));
      if (Number(input.quantityTotal) < Number(existing.quantity_allocated)) {
        throw new ConflictError(
          `quantityTotal (${input.quantityTotal}) cannot be less than the already allocated quantity (${existing.quantity_allocated})`,
        );
      }
    }

    const result = await client.query<SeedLot>(
      `UPDATE seed_lots SET
         variety = COALESCE($1, variety),
         quantity_total = COALESCE($2, quantity_total),
         unit = COALESCE($3, unit),
         status = COALESCE($4, status),
         source_farm_id = COALESCE($5, source_farm_id),
         notes = COALESCE($6, notes),
         low_stock_threshold = COALESCE($7, low_stock_threshold),
         available_for_partner_order = COALESCE($8, available_for_partner_order),
         storage_zone = COALESCE($9, storage_zone),
         approved_for_sale = COALESCE($10, approved_for_sale)
       WHERE id = $11
       RETURNING *`,
      [
        input.variety ?? null,
        input.quantityTotal ?? null,
        input.unit ?? null,
        input.status ?? null,
        input.sourceFarmId ?? null,
        input.notes ?? null,
        input.lowStockThreshold ?? null,
        input.availableForPartnerOrder ?? null,
        input.storageZone ?? null,
        input.approvedForSale ?? null,
        id,
      ],
    );
    const updated = result.rows[0];

    await insertAuditLog(client, {
      entityType: 'seed_lot',
      entityId: id,
      action: 'UPDATE',
      performedBy: user.email,
      beforeState: existing,
      afterState: updated,
    });

    await appendHashChainEntry(client, id, 'UPDATE', updated, user);

    return updated;
  });
}

export async function deleteSeedLot(id: string, user: AuthenticatedUser): Promise<void> {
  await withTransaction(async (client) => {
    const existingResult = await client.query<SeedLot>('SELECT * FROM seed_lots WHERE id = $1 FOR UPDATE', [id]);
    const existing = existingResult.rows[0];
    if (!existing) throw new NotFoundError(`Seed lot ${id} not found`);
    assertOwnsOrganization(user, existing.organization_id, 'You can only delete seed lots owned by your organization');

    const childrenResult = await client.query<{ count: number }>(
      'SELECT COUNT(*)::int AS count FROM seed_lots WHERE parent_lot_id = $1',
      [id],
    );
    if (childrenResult.rows[0].count > 0) {
      throw new ConflictError(`Cannot delete seed lot ${id}: it has ${childrenResult.rows[0].count} child lot(s)`);
    }

    // seed_lot_allocations.seed_lot_id is ON DELETE RESTRICT, so any allocation
    // row — allocated OR released — blocks deletion at the DB level; this
    // preserves allocation/audit history. Check the same condition here so
    // the caller gets a clear 409 instead of a raw foreign-key-violation error.
    const allocationsResult = await client.query<{ count: number }>(
      'SELECT COUNT(*)::int AS count FROM seed_lot_allocations WHERE seed_lot_id = $1',
      [id],
    );
    if (allocationsResult.rows[0].count > 0) {
      throw new ConflictError(
        `Cannot delete seed lot ${id}: it has ${allocationsResult.rows[0].count} allocation record(s) (active or historical)`,
      );
    }

    // seed_lot_hash_chain.seed_lot_id is also ON DELETE RESTRICT, and every
    // lot gets a genesis entry at creation (see createSeedLot), so this
    // check always fires for a normally-created lot — deleting it would
    // erase part of its tamper-evident audit trail, which is exactly what
    // the hash chain exists to prevent. Checked here for the same reason as
    // the allocations check above: a clear 409, not a raw FK-violation error.
    const hashChainResult = await client.query<{ count: number }>(
      'SELECT COUNT(*)::int AS count FROM seed_lot_hash_chain WHERE seed_lot_id = $1',
      [id],
    );
    if (hashChainResult.rows[0].count > 0) {
      throw new ConflictError(`Cannot delete seed lot ${id}: it has an authenticity hash chain record — deleting it would destroy tamper-evident history`);
    }

    await client.query('DELETE FROM seed_lots WHERE id = $1', [id]);

    await insertAuditLog(client, {
      entityType: 'seed_lot',
      entityId: id,
      action: 'DELETE',
      performedBy: user.email,
      beforeState: existing,
    });
  });
}
