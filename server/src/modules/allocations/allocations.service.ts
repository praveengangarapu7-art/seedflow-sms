import { assertOwnsOrganization } from '../../auth/ownership';
import { pool } from '../../db/pool';
import { withTransaction } from '../../db/transaction';
import { ConflictError, InsufficientQuantityError, NotFoundError, ValidationError } from '../../errors';
import type { AuthenticatedUser } from '../../middleware/requireAuth';
import { broadcast } from '../../ws/server';
import { insertAuditLog } from '../auditLogs/auditLogs.service';
import { appendHashChainEntry } from '../authenticity/authenticity.service';
import { sendPushToAllDevices } from '../pushNotifications/pushNotifications.service';
import { withAvailability, type SeedLot } from '../seedLots/seedLots.types';
import type { AllocateInput, AllocationHistoryEntry, ReleaseInput, SeedLotAllocation } from './allocations.types';

// Warehouse Manager distributes stock across organizations, so it isn't
// subject to the ownership check; Breeder/Producer may only touch their own
// organization's lots (Admin bypasses ownership entirely, see assertOwnsOrganization).
const OWNERSHIP_EXEMPT_ROLES = ['Admin', 'Warehouse Manager'];

/**
 * Pushed to every connected WebSocket client after a committed allocate or
 * release, so "show available quantity live across the app" doesn't depend
 * on anyone polling. A second, distinct LOW_STOCK_ALERT event follows
 * whenever the resulting available quantity is at or below the lot's
 * configured threshold.
 */
function broadcastInventoryChange(
  action: 'ALLOCATE' | 'RELEASE',
  lot: SeedLot,
  allocation: SeedLotAllocation,
  performedBy: AuthenticatedUser,
): void {
  const lotWithAvailability = withAvailability(lot);

  broadcast('INVENTORY_UPDATE', {
    action,
    seedLot: lotWithAvailability,
    allocation,
    performedBy: { email: performedBy.email, role: performedBy.role },
  });

  if (lotWithAvailability.is_low_stock) {
    broadcast('LOW_STOCK_ALERT', {
      seedLotId: lot.id,
      lotCode: lot.lot_code,
      crop: lot.crop,
      organizationId: lot.organization_id,
      quantityAvailable: lotWithAvailability.quantity_available,
      lowStockThreshold: lot.low_stock_threshold,
      unit: lot.unit,
    });

    // Fire-and-forget: sendPushToAllDevices swallows its own errors and must
    // never delay or fail this already-committed allocation.
    void sendPushToAllDevices(
      'Low Stock Alert',
      `${lot.lot_code} (${lot.crop}) is low: ${lotWithAvailability.quantity_available}${lot.unit} available`,
      { type: 'LOW_STOCK_ALERT', seedLotId: lot.id },
    );
  }
}

/**
 * Allocates `quantity` from a seed lot to `allocatedTo` inside one transaction:
 * lock the lot row, verify enough unallocated quantity remains, insert the
 * allocation, bump the lot's quantity_allocated, and audit-log both writes.
 * If the quantity check fails (or the DB's own CHECK constraint catches a
 * race the lock didn't), the transaction rolls back and nothing is written.
 */
export async function allocate(
  seedLotId: string,
  input: AllocateInput,
  user: AuthenticatedUser,
): Promise<{ allocation: SeedLotAllocation; seedLot: SeedLot }> {
  if (!input.allocatedTo?.trim()) throw new ValidationError('allocatedTo is required');
  if (!Number.isFinite(Number(input.quantity)) || Number(input.quantity) <= 0) {
    throw new ValidationError('quantity must be a positive number');
  }

  return withTransaction(async (client) => {
    const lotResult = await client.query<SeedLot>('SELECT * FROM seed_lots WHERE id = $1 FOR UPDATE', [seedLotId]);
    const lot = lotResult.rows[0];
    if (!lot) throw new NotFoundError(`Seed lot ${seedLotId} not found`);
    if (lot.status !== 'active') {
      throw new ConflictError(`Seed lot ${lot.lot_code} is not active (status: ${lot.status})`);
    }
    if (!OWNERSHIP_EXEMPT_ROLES.includes(user.role)) {
      assertOwnsOrganization(user, lot.organization_id, 'You can only allocate from seed lots owned by your organization');
    }

    const quantity = Number(input.quantity);
    const available = Number(lot.quantity_total) - Number(lot.quantity_allocated);
    if (quantity > available) {
      throw new InsufficientQuantityError(
        `Requested quantity ${quantity}${lot.unit} exceeds available quantity ${available}${lot.unit} for lot ${lot.lot_code}`,
      );
    }

    const allocationResult = await client.query<SeedLotAllocation>(
      `INSERT INTO seed_lot_allocations (seed_lot_id, allocated_to, quantity, performed_by, crop_plan_id, notes)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [seedLotId, input.allocatedTo.trim(), quantity, user.email, input.cropPlanId?.trim() || null, input.notes ?? null],
    );
    const allocation = allocationResult.rows[0];

    // This UPDATE is also guarded by the chk_seed_lots_allocated_within_total
    // CHECK constraint — if a concurrent allocation slipped past the lock
    // above, the constraint fires here and the whole transaction (including
    // the allocation row just inserted) is rolled back.
    const updatedLotResult = await client.query<SeedLot>(
      'UPDATE seed_lots SET quantity_allocated = quantity_allocated + $1 WHERE id = $2 RETURNING *',
      [quantity, seedLotId],
    );
    const updatedLot = updatedLotResult.rows[0];

    await insertAuditLog(client, {
      entityType: 'seed_lot_allocation',
      entityId: allocation.id,
      action: 'ALLOCATE',
      performedBy: user.email,
      afterState: allocation,
      metadata: { seedLotId, lotCode: lot.lot_code },
    });
    await insertAuditLog(client, {
      entityType: 'seed_lot',
      entityId: seedLotId,
      action: 'QUANTITY_ALLOCATED',
      performedBy: user.email,
      beforeState: { quantityAllocated: lot.quantity_allocated },
      afterState: { quantityAllocated: updatedLot.quantity_allocated },
      metadata: { allocationId: allocation.id, quantity },
    });

    await appendHashChainEntry(client, seedLotId, 'ALLOCATE', { allocation, seedLot: updatedLot }, user);

    return { allocation, seedLot: updatedLot };
  }).then((result) => {
    broadcastInventoryChange('ALLOCATE', result.seedLot, result.allocation, user);
    return result;
  });
}

export async function release(
  allocationId: string,
  input: ReleaseInput,
  user: AuthenticatedUser,
): Promise<{ allocation: SeedLotAllocation; seedLot: SeedLot }> {
  return withTransaction(async (client) => {
    const allocationResult = await client.query<SeedLotAllocation>(
      'SELECT * FROM seed_lot_allocations WHERE id = $1 FOR UPDATE',
      [allocationId],
    );
    const allocation = allocationResult.rows[0];
    if (!allocation) throw new NotFoundError(`Allocation ${allocationId} not found`);
    if (allocation.status !== 'allocated') {
      throw new ConflictError(`Allocation ${allocationId} is already ${allocation.status}`);
    }

    const lotResult = await client.query<SeedLot>('SELECT * FROM seed_lots WHERE id = $1 FOR UPDATE', [
      allocation.seed_lot_id,
    ]);
    const lot = lotResult.rows[0];
    if (!lot) throw new NotFoundError(`Seed lot ${allocation.seed_lot_id} not found`);
    if (!OWNERSHIP_EXEMPT_ROLES.includes(user.role)) {
      assertOwnsOrganization(user, lot.organization_id, 'You can only release allocations for seed lots owned by your organization');
    }

    const updatedAllocationResult = await client.query<SeedLotAllocation>(
      `UPDATE seed_lot_allocations SET status = 'released', notes = COALESCE($1, notes) WHERE id = $2 RETURNING *`,
      [input.notes ?? null, allocationId],
    );
    const updatedAllocation = updatedAllocationResult.rows[0];

    const updatedLotResult = await client.query<SeedLot>(
      'UPDATE seed_lots SET quantity_allocated = quantity_allocated - $1 WHERE id = $2 RETURNING *',
      [allocation.quantity, allocation.seed_lot_id],
    );
    const updatedLot = updatedLotResult.rows[0];

    await insertAuditLog(client, {
      entityType: 'seed_lot_allocation',
      entityId: allocationId,
      action: 'RELEASE',
      performedBy: user.email,
      beforeState: allocation,
      afterState: updatedAllocation,
    });
    await insertAuditLog(client, {
      entityType: 'seed_lot',
      entityId: lot.id,
      action: 'QUANTITY_RELEASED',
      performedBy: user.email,
      beforeState: { quantityAllocated: lot.quantity_allocated },
      afterState: { quantityAllocated: updatedLot.quantity_allocated },
      metadata: { allocationId },
    });

    await appendHashChainEntry(client, lot.id, 'RELEASE', { allocation: updatedAllocation, seedLot: updatedLot }, user);

    return { allocation: updatedAllocation, seedLot: updatedLot };
  }).then((result) => {
    broadcastInventoryChange('RELEASE', result.seedLot, result.allocation, user);
    return result;
  });
}

export async function listBySeedLot(seedLotId: string): Promise<SeedLotAllocation[]> {
  const result = await pool.query<SeedLotAllocation>(
    'SELECT * FROM seed_lot_allocations WHERE seed_lot_id = $1 ORDER BY created_at DESC',
    [seedLotId],
  );
  return result.rows;
}

/**
 * Allocation history enriched with the acting user's name/role (joined on
 * email, since performed_by stores the email string, not a user id) — the
 * "timestamps and user details" half of the tracking requirement; the audit
 * log covers the before/after state half.
 */
export async function getAllocationHistory(seedLotId: string): Promise<AllocationHistoryEntry[]> {
  const result = await pool.query<AllocationHistoryEntry>(
    `SELECT a.*, u.name AS performed_by_name, u.role AS performed_by_role
     FROM seed_lot_allocations a
     LEFT JOIN users u ON u.email = a.performed_by
     WHERE a.seed_lot_id = $1
     ORDER BY a.created_at DESC`,
    [seedLotId],
  );
  return result.rows;
}
