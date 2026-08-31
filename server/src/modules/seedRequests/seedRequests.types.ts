export interface SeedRequestRow {
  id: string;
  farmer_id: string;
  crop: string;
  variety: string;
  quantity_requested: number;
  unit: string;
  region: string;
  status: string;
  requested_by: string;
  approved_by: string | null;
  allocation_id: string | null;
  // The specific seed lot a farmer picked via the Farmer Portal's search +
  // cart flow (Extend #9). Null for the older, still-supported staff form
  // that only captures crop/variety and relies on a later manual Fulfill
  // step to pick a lot.
  requested_seed_lot_id: string | null;
  rejection_reason: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface SeedRequestWithFarmer extends SeedRequestRow {
  farmer_name: string;
  farmer_phone: string | null;
  farmer_location: string | null;
}

export interface CreateSeedRequestInput {
  farmerId: string;
  crop: string;
  variety: string;
  quantity: number;
  notes?: string;
  // Set when the request came from the Farmer Portal's search + cart flow —
  // the farmer already picked this exact lot, so approval can allocate it
  // directly instead of waiting on a separate staff Fulfill step.
  seedLotId?: string;
}

export interface DistributionListEntry {
  region: string;
  requests: SeedRequestWithFarmer[];
  totalQuantity: number;
}

/**
 * The Farmer Portal's "My Allocations" view — a farmer-scoped, pickup-
 * oriented projection of their own requests. `lot_code` is the actual
 * allocated lot once one exists, falling back to the farmer's originally
 * requested lot before approval so the cart choice is still visible while
 * pending. `ready_since` is only set once the request is genuinely
 * `allocated` ("Ready for Pickup") — this schema has no separate bookable
 * pickup-slot concept, so "pickup schedule" is represented honestly as
 * when the lot became ready plus where it physically sits, not a calendar
 * booking.
 */
export interface MyAllocationEntry extends SeedRequestRow {
  lot_code: string | null;
  storage_zones: string[];
  ready_since: string | null;
}
