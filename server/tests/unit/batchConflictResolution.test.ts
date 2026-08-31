import { describe, expect, it } from 'vitest';
import { resolveBatchAllocationConflicts, type BatchAllocationRequestItem } from '../../src/modules/allocations/batchConflictResolution';

function request(overrides: Partial<BatchAllocationRequestItem> = {}): BatchAllocationRequestItem {
  return { seedLotId: 'lot-1', quantity: 10, allocatedTo: 'Farmer A', ...overrides };
}

describe('batchConflictResolution.resolveBatchAllocationConflicts', () => {
  it('allocates a single request within the available quantity', () => {
    const decisions = resolveBatchAllocationConflicts([request({ quantity: 40 })], { 'lot-1': 100 });
    expect(decisions).toEqual([{ willAllocate: true }]);
  });

  it('flags an unknown seed lot id', () => {
    const decisions = resolveBatchAllocationConflicts([request({ seedLotId: 'missing' })], { 'lot-1': 100 });
    expect(decisions).toEqual([{ willAllocate: false, reason: 'seed_lot_not_found' }]);
  });

  it('allows a request that exactly matches the available quantity', () => {
    const decisions = resolveBatchAllocationConflicts([request({ quantity: 100 })], { 'lot-1': 100 });
    expect(decisions).toEqual([{ willAllocate: true }]);
  });

  it('rejects a request that exceeds the available quantity by one unit', () => {
    const decisions = resolveBatchAllocationConflicts([request({ quantity: 101 })], { 'lot-1': 100 });
    expect(decisions).toEqual([{ willAllocate: false, reason: 'insufficient_available_quantity', availableAtDecisionTime: 100 }]);
  });

  it('resolves contention on the same lot first-come-first-served, in submission order', () => {
    const requests = [
      request({ seedLotId: 'lot-1', quantity: 60, allocatedTo: 'First' }),
      request({ seedLotId: 'lot-1', quantity: 60, allocatedTo: 'Second' }),
    ];
    const decisions = resolveBatchAllocationConflicts(requests, { 'lot-1': 100 });
    expect(decisions).toEqual([
      { willAllocate: true },
      { willAllocate: false, reason: 'insufficient_available_quantity', availableAtDecisionTime: 40 },
    ]);
  });

  it('lets a later smaller request on the same lot succeed after an earlier one is rejected', () => {
    const requests = [
      request({ seedLotId: 'lot-1', quantity: 90, allocatedTo: 'Too big' }),
      request({ seedLotId: 'lot-1', quantity: 90, allocatedTo: 'Also too big' }),
      request({ seedLotId: 'lot-1', quantity: 5, allocatedTo: 'Fits' }),
    ];
    const decisions = resolveBatchAllocationConflicts(requests, { 'lot-1': 100 });
    expect(decisions[0]).toEqual({ willAllocate: true });
    expect(decisions[1].willAllocate).toBe(false);
    expect(decisions[2]).toEqual({ willAllocate: true });
  });

  it('tracks committed quantity independently per lot — no cross-lot interference', () => {
    const requests = [
      request({ seedLotId: 'lot-1', quantity: 90 }),
      request({ seedLotId: 'lot-2', quantity: 90 }),
    ];
    const decisions = resolveBatchAllocationConflicts(requests, { 'lot-1': 100, 'lot-2': 100 });
    expect(decisions).toEqual([{ willAllocate: true }, { willAllocate: true }]);
  });

  it('returns an empty array for an empty request list', () => {
    expect(resolveBatchAllocationConflicts([], { 'lot-1': 100 })).toEqual([]);
  });
});
