import { pool } from '../../db/pool';
import { withTransaction } from '../../db/transaction';
import { ConflictError, NotFoundError, ValidationError } from '../../errors';
import type { AuthenticatedUser } from '../../middleware/requireAuth';
import { broadcast } from '../../ws/server';
import { allocate } from '../allocations/allocations.service';
import { insertAuditLog } from '../auditLogs/auditLogs.service';
import { getFarmer } from '../farmers/farmers.service';
import type {
  CreateSeedRequestInput,
  DistributionListEntry,
  MyAllocationEntry,
  SeedRequestRow,
  SeedRequestWithFarmer,
} from './seedRequests.types';

// Mirrors the fulfill/deliver role gate in seedRequests.routes.ts. Approving
// a request must not silently perform the equivalent of a real inventory
// allocation for a role (Producer) that isn't allowed to fulfill requests
// directly — see approveRequest below.
const FULFILL_ROLES = ['Admin', 'Warehouse Manager'];

export async function createSeedRequest(input: CreateSeedRequestInput, user: AuthenticatedUser): Promise<SeedRequestRow> {
  if (!input.farmerId) throw new ValidationError('farmerId is required');
  if (!input.crop?.trim()) throw new ValidationError('crop is required');
  if (!input.variety?.trim()) throw new ValidationError('variety is required');
  if (!Number.isFinite(Number(input.quantity)) || Number(input.quantity) <= 0) {
    throw new ValidationError('quantity must be a positive number');
  }

  const farmer = await getFarmer(input.farmerId);

  let requestedSeedLotId: string | null = null;
  if (input.seedLotId) {
    // A light existence/crop-variety-match check — real availability
    // (enough quantity, Certified/active) is re-checked for real when this
    // lot is actually allocated at approve/fulfill time, same as any other
    // request. This is just enough validation to reject an obviously wrong
    // lot (typo'd id, or a lot of a different crop) at request time.
    const lotResult = await pool.query('SELECT id, crop, variety FROM seed_lots WHERE id = $1', [input.seedLotId]);
    const lot = lotResult.rows[0];
    if (!lot) throw new ValidationError(`Seed lot ${input.seedLotId} not found`);
    if (lot.crop !== input.crop.trim() || lot.variety !== input.variety.trim()) {
      throw new ValidationError(`Seed lot ${input.seedLotId} is ${lot.crop} — ${lot.variety}, not ${input.crop} — ${input.variety}`);
    }
    requestedSeedLotId = input.seedLotId;
  }

  const created = await withTransaction(async (client) => {
    const result = await client.query<SeedRequestRow>(
      `INSERT INTO seed_requests (farmer_id, crop, variety, quantity_requested, region, requested_by, notes, requested_seed_lot_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [farmer.id, input.crop.trim(), input.variety.trim(), input.quantity, farmer.region, user.email, input.notes ?? null, requestedSeedLotId],
    );
    const row = result.rows[0];
    await insertAuditLog(client, {
      entityType: 'seed_request',
      entityId: row.id,
      action: 'CREATE',
      performedBy: user.email,
      afterState: row,
      metadata: { farmerId: farmer.id, requestedSeedLotId },
    });
    return row;
  });

  broadcast('SEED_REQUEST_CREATED', { id: created.id, farmerId: created.farmer_id, crop: created.crop, variety: created.variety });
  return created;
}

async function transitionStatus(
  id: string,
  fromStatuses: string[],
  toStatus: string,
  user: AuthenticatedUser,
  action: string,
  extraSet?: { column: string; value: unknown },
): Promise<SeedRequestRow> {
  const updated = await withTransaction(async (client) => {
    const result = await client.query<SeedRequestRow>('SELECT * FROM seed_requests WHERE id = $1 FOR UPDATE', [id]);
    const request = result.rows[0];
    if (!request) throw new NotFoundError(`Seed request ${id} not found`);
    if (!fromStatuses.includes(request.status)) {
      throw new ConflictError(`Seed request is "${request.status}" — expected one of: ${fromStatuses.join(', ')}`);
    }

    const setClauses = ['status = $1'];
    const values: unknown[] = [toStatus];
    if (extraSet) {
      values.push(extraSet.value);
      setClauses.push(`${extraSet.column} = $${values.length}`);
    }
    values.push(id);

    const updateResult = await client.query<SeedRequestRow>(
      `UPDATE seed_requests SET ${setClauses.join(', ')} WHERE id = $${values.length} RETURNING *`,
      values,
    );
    const row = updateResult.rows[0];

    await insertAuditLog(client, {
      entityType: 'seed_request',
      entityId: id,
      action,
      performedBy: user.email,
      beforeState: { status: request.status },
      afterState: { status: row.status },
    });

    return row;
  });

  broadcast('SEED_REQUEST_STATUS_CHANGED', { id, status: updated.status, farmerId: updated.farmer_id });
  return updated;
}

/**
 * Approving a request that already names a farmer-picked lot (Extend #9's
 * Farmer Portal cart flow — `requested_seed_lot_id`) allocates it
 * immediately, so "Approve" alone is what carries the request straight to
 * "Ready for Pickup" (status `allocated`) — exactly the one-click flow the
 * feature asks for. This only happens when the approving user also holds a
 * fulfill-capable role (Admin/Warehouse Manager, same as the /fulfill route
 * itself requires) — a Producer approving a cart-originated request still
 * only reaches `approved`, leaving the real inventory allocation to staff
 * with fulfill permission, same as the original two-step flow. Requests
 * with no requested lot (the older crop/variety-only staff form) are
 * unaffected either way and stop at `approved` as before.
 */
export async function approveRequest(id: string, user: AuthenticatedUser, seedLotIdOverride?: string): Promise<SeedRequestRow> {
  const approved = await transitionStatus(id, ['requested'], 'approved', user, 'APPROVE', { column: 'approved_by', value: user.email });
  const seedLotId = seedLotIdOverride ?? approved.requested_seed_lot_id;
  if (seedLotId && FULFILL_ROLES.includes(user.role)) {
    return fulfillRequest(approved.id, seedLotId, user);
  }
  return approved;
}

export async function rejectRequest(id: string, reason: string, user: AuthenticatedUser): Promise<SeedRequestRow> {
  if (!reason?.trim()) throw new ValidationError('A rejection reason is required');
  return transitionStatus(id, ['requested', 'approved'], 'rejected', user, 'REJECT', {
    column: 'rejection_reason',
    value: reason.trim(),
  });
}

export async function cancelRequest(id: string, user: AuthenticatedUser): Promise<SeedRequestRow> {
  return transitionStatus(id, ['requested', 'approved'], 'cancelled', user, 'CANCEL');
}

/**
 * Fulfilling a request reuses the real allocations.allocate() call — it's
 * a self-contained transaction with its own broadcast, so it commits on
 * its own; linking the resulting allocation back to this request is a
 * second, separate transaction just below. Not perfectly atomic across the
 * two tables, but the alternative (refactoring allocate()'s signature to
 * accept a shared client) would ripple into every existing caller for a
 * demo-scale correctness edge case that's cheaply recoverable if it ever hit.
 */
export async function fulfillRequest(id: string, seedLotId: string, user: AuthenticatedUser): Promise<SeedRequestRow> {
  if (!seedLotId) throw new ValidationError('seedLotId is required');

  const requestResult = await pool.query<SeedRequestRow>('SELECT * FROM seed_requests WHERE id = $1', [id]);
  const request = requestResult.rows[0];
  if (!request) throw new NotFoundError(`Seed request ${id} not found`);
  if (request.status !== 'approved') {
    throw new ConflictError(`Seed request is "${request.status}" — must be "approved" before it can be fulfilled`);
  }

  const farmer = await getFarmer(request.farmer_id);
  const { allocation } = await allocate(
    seedLotId,
    {
      quantity: Number(request.quantity_requested),
      allocatedTo: `Farmer: ${farmer.name}`,
      notes: `Fulfilling seed request ${request.id}`,
    },
    user,
  );

  const updated = await withTransaction(async (client) => {
    const updateResult = await client.query<SeedRequestRow>(
      "UPDATE seed_requests SET status = 'allocated', allocation_id = $1 WHERE id = $2 RETURNING *",
      [allocation.id, id],
    );
    const row = updateResult.rows[0];
    await insertAuditLog(client, {
      entityType: 'seed_request',
      entityId: id,
      action: 'FULFILL',
      performedBy: user.email,
      beforeState: { status: request.status },
      afterState: { status: row.status, allocationId: allocation.id },
    });
    return row;
  });

  broadcast('SEED_REQUEST_STATUS_CHANGED', { id, status: updated.status, farmerId: updated.farmer_id });
  return updated;
}

export async function markDelivered(id: string, user: AuthenticatedUser): Promise<SeedRequestRow> {
  return transitionStatus(id, ['allocated'], 'delivered', user, 'DELIVER');
}

export async function listSeedRequests(filters: {
  farmerId?: string;
  status?: string;
  region?: string;
  crop?: string;
}): Promise<SeedRequestRow[]> {
  const conditions: string[] = [];
  const values: unknown[] = [];
  if (filters.farmerId) {
    values.push(filters.farmerId);
    conditions.push(`farmer_id = $${values.length}`);
  }
  if (filters.status) {
    values.push(filters.status);
    conditions.push(`status = $${values.length}`);
  }
  if (filters.region) {
    values.push(filters.region);
    conditions.push(`region = $${values.length}`);
  }
  if (filters.crop) {
    values.push(filters.crop);
    conditions.push(`crop = $${values.length}`);
  }
  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const result = await pool.query<SeedRequestRow>(`SELECT * FROM seed_requests ${whereClause} ORDER BY created_at DESC`, values);
  return result.rows;
}

export async function getSeedRequest(id: string): Promise<SeedRequestRow> {
  const result = await pool.query<SeedRequestRow>('SELECT * FROM seed_requests WHERE id = $1', [id]);
  const request = result.rows[0];
  if (!request) throw new NotFoundError(`Seed request ${id} not found`);
  return request;
}

/**
 * "Allocated" requests are the ones a distribution partner still needs to
 * physically deliver — this is the working list for that logistics run,
 * grouped by region so a partner can plan by route.
 */
export async function getDistributionLists(regionFilter?: string): Promise<DistributionListEntry[]> {
  const conditions = ["sr.status = 'allocated'"];
  const values: unknown[] = [];
  if (regionFilter) {
    values.push(regionFilter);
    conditions.push(`sr.region = $${values.length}`);
  }

  const result = await pool.query<SeedRequestWithFarmer>(
    `SELECT sr.*, f.name AS farmer_name, f.phone AS farmer_phone, f.location AS farmer_location
     FROM seed_requests sr
     JOIN farmers f ON f.id = sr.farmer_id
     WHERE ${conditions.join(' AND ')}
     ORDER BY sr.region ASC, sr.created_at ASC`,
    values,
  );

  const grouped = new Map<string, SeedRequestWithFarmer[]>();
  for (const row of result.rows) {
    const list = grouped.get(row.region) ?? [];
    list.push(row);
    grouped.set(row.region, list);
  }

  return Array.from(grouped.entries()).map(([region, requests]) => ({
    region,
    requests,
    totalQuantity: Math.round(requests.reduce((sum, r) => sum + Number(r.quantity_requested), 0) * 100) / 100,
  }));
}

/**
 * Farmer Portal "My Allocations" (Extend #9) — a farmer-scoped, pickup-
 * oriented view of their own requests, distinct from listSeedRequests (the
 * staff dashboard's cross-farmer list, built for region-level distribution
 * planning). `lot_code` prefers the actual allocated lot once one exists
 * (joined via the request's allocation_id -> seed_lot_allocations ->
 * seed_lots), falling back to the farmer's originally-requested lot so
 * their cart choice stays visible while the request is still pending.
 * `ready_since` and the storage-zone lookup only apply once truly
 * `allocated` — see the type's doc comment for why "pickup schedule" is
 * represented this way rather than as a bookable slot.
 */
export async function listMyAllocations(farmerId: string): Promise<MyAllocationEntry[]> {
  if (!farmerId) throw new ValidationError('farmerId is required');

  const result = await pool.query(
    `SELECT sr.*,
            COALESCE(alloc_lot.lot_code, req_lot.lot_code) AS lot_code,
            COALESCE(storage.zones, ARRAY[]::text[]) AS storage_zones
     FROM seed_requests sr
     LEFT JOIN seed_lot_allocations sla ON sla.id = sr.allocation_id
     LEFT JOIN seed_lots alloc_lot ON alloc_lot.id = sla.seed_lot_id
     LEFT JOIN seed_lots req_lot ON req_lot.id = sr.requested_seed_lot_id
     LEFT JOIN LATERAL (
       SELECT array_agg(DISTINCT sloc.warehouse_zone) AS zones
       FROM packaging_batches pb
       JOIN storage_assignments sa ON sa.packaging_batch_id = pb.id AND sa.status = 'active'
       JOIN storage_locations sloc ON sloc.id = sa.storage_location_id
       WHERE pb.seed_lot_id = COALESCE(alloc_lot.id, req_lot.id)
     ) storage ON true
     WHERE sr.farmer_id = $1
     ORDER BY sr.created_at DESC`,
    [farmerId],
  );

  return result.rows.map((row): MyAllocationEntry => ({
    ...row,
    quantity_requested: Number(row.quantity_requested),
    storage_zones: row.storage_zones ?? [],
    ready_since: row.status === 'allocated' ? row.updated_at : null,
  }));
}
