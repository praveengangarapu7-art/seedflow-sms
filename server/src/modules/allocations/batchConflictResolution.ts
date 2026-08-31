export interface BatchAllocationRequestItem {
  seedLotId: string;
  quantity: number;
  allocatedTo: string;
  cropPlanId?: string;
  notes?: string;
}

export type BatchAllocationDecision =
  | { willAllocate: true }
  | {
      willAllocate: false;
      reason: 'seed_lot_not_found' | 'insufficient_available_quantity';
      availableAtDecisionTime?: number;
    };

/**
 * Predicts, in submission order, which requests a batch can satisfy against
 * each lot's currently known available quantity — first-come-first-served
 * within the batch, so the resolution is deterministic and explainable from
 * the request order alone. This is only a prediction: the real allocate()
 * call still re-checks under a row lock, since a concurrent allocation
 * outside this batch can change availability between this decision and the
 * actual write.
 */
export function resolveBatchAllocationConflicts(
  requests: BatchAllocationRequestItem[],
  availableByLotId: Record<string, number>,
): BatchAllocationDecision[] {
  const committed: Record<string, number> = {};

  return requests.map((request) => {
    const available = availableByLotId[request.seedLotId];
    if (available === undefined) {
      return { willAllocate: false, reason: 'seed_lot_not_found' };
    }

    const alreadyCommitted = committed[request.seedLotId] ?? 0;
    const remaining = available - alreadyCommitted;
    if (request.quantity > remaining) {
      return { willAllocate: false, reason: 'insufficient_available_quantity', availableAtDecisionTime: remaining };
    }

    committed[request.seedLotId] = alreadyCommitted + request.quantity;
    return { willAllocate: true };
  });
}
