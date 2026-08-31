import { pool } from '../../db/pool';
import { ValidationError } from '../../errors';
import type { AuthenticatedUser } from '../../middleware/requireAuth';
import type { SeedLot } from '../seedLots/seedLots.types';
import { allocate } from './allocations.service';
import { resolveBatchAllocationConflicts, type BatchAllocationRequestItem } from './batchConflictResolution';
import type { SeedLotAllocation } from './allocations.types';

export const MAX_BATCH_ALLOCATION_SIZE = 200;

export interface BatchAllocationItemResult {
  index: number;
  seedLotId: string;
  status: 'allocated' | 'skipped' | 'failed';
  allocation?: SeedLotAllocation;
  seedLot?: SeedLot;
  reason?: string;
  error?: string;
}

export interface BatchAllocationResult {
  total: number;
  allocated: number;
  skipped: number;
  failed: number;
  results: BatchAllocationItemResult[];
}

async function fetchAvailableQuantities(lotIds: string[]): Promise<Record<string, number>> {
  if (lotIds.length === 0) return {};
  const result = await pool.query<{ id: string; available: string }>(
    `SELECT id, (quantity_total - quantity_allocated) AS available FROM seed_lots WHERE id = ANY($1::uuid[])`,
    [lotIds],
  );
  return result.rows.reduce<Record<string, number>>((acc, row) => {
    acc[row.id] = Number(row.available);
    return acc;
  }, {});
}

/**
 * Batch allocation across multiple lots and multiple destinations (crop
 * plans or other allocatedTo targets) in one request. Conflict resolution
 * happens in two layers:
 *  1. resolveBatchAllocationConflicts predicts, in submission order, which
 *     requests this batch can satisfy against each lot's currently known
 *     available quantity (first-come-first-served across requests that
 *     target the same lot) — items it rejects are never sent to the DB.
 *  2. The real allocate() call still re-checks under a row lock for every
 *     item the prediction approved, since a concurrent allocation outside
 *     this batch can still change availability in between; that call
 *     remains the authoritative check, this is only an in-batch prediction.
 */
export async function batchAllocate(
  requests: BatchAllocationRequestItem[],
  user: AuthenticatedUser,
): Promise<BatchAllocationResult> {
  if (requests.length === 0) throw new ValidationError('At least one allocation request is required');
  if (requests.length > MAX_BATCH_ALLOCATION_SIZE) {
    throw new ValidationError(`Batch size ${requests.length} exceeds the maximum of ${MAX_BATCH_ALLOCATION_SIZE} items per request`);
  }

  const results: BatchAllocationItemResult[] = new Array(requests.length);
  const validIndices: number[] = [];
  const validRequests: BatchAllocationRequestItem[] = [];

  requests.forEach((request, index) => {
    const seedLotId = typeof request?.seedLotId === 'string' ? request.seedLotId : '';
    const allocatedTo = typeof request?.allocatedTo === 'string' ? request.allocatedTo.trim() : '';
    const quantity = Number(request?.quantity);

    if (!seedLotId.trim()) {
      results[index] = { index, seedLotId, status: 'failed', error: 'seedLotId is required' };
      return;
    }
    if (!allocatedTo) {
      results[index] = { index, seedLotId, status: 'failed', error: 'allocatedTo is required' };
      return;
    }
    if (!Number.isFinite(quantity) || quantity <= 0) {
      results[index] = { index, seedLotId, status: 'failed', error: 'quantity must be a positive number' };
      return;
    }

    validIndices.push(index);
    validRequests.push({ seedLotId, allocatedTo, quantity, cropPlanId: request.cropPlanId, notes: request.notes });
  });

  const distinctLotIds = [...new Set(validRequests.map((r) => r.seedLotId))];
  const availableByLotId = await fetchAvailableQuantities(distinctLotIds);
  const decisions = resolveBatchAllocationConflicts(validRequests, availableByLotId);

  for (let i = 0; i < validRequests.length; i += 1) {
    const originalIndex = validIndices[i];
    const request = validRequests[i];
    const decision = decisions[i];

    if (!decision.willAllocate) {
      results[originalIndex] = { index: originalIndex, seedLotId: request.seedLotId, status: 'skipped', reason: decision.reason };
      continue;
    }

    try {
      const { allocation, seedLot } = await allocate(
        request.seedLotId,
        { quantity: request.quantity, allocatedTo: request.allocatedTo, cropPlanId: request.cropPlanId, notes: request.notes },
        user,
      );
      results[originalIndex] = { index: originalIndex, seedLotId: request.seedLotId, status: 'allocated', allocation, seedLot };
    } catch (err) {
      results[originalIndex] = {
        index: originalIndex,
        seedLotId: request.seedLotId,
        status: 'failed',
        error: err instanceof Error ? err.message : 'Unknown error',
      };
    }
  }

  const allocated = results.filter((r) => r.status === 'allocated').length;
  const skipped = results.filter((r) => r.status === 'skipped').length;
  return { total: results.length, allocated, skipped, failed: results.length - allocated - skipped, results };
}
