export const SEED_LOT_STAGES = ['Breeder', 'Foundation', 'Certified'] as const;
export type SeedLotStage = (typeof SEED_LOT_STAGES)[number];

// Lab-testing/certification outcome (migration 050) — a separate axis from
// both `status` (inventory lifecycle) and `stage` (breeding-pipeline rank).
// Driven by server/src/modules/labTesting: not_submitted -> testing ->
// certified | rejected.
export const TESTING_STATUSES = ['not_submitted', 'testing', 'certified', 'rejected'] as const;
export type TestingStatus = (typeof TESTING_STATUSES)[number];

export function nextStage(stage: SeedLotStage): SeedLotStage {
  const index = SEED_LOT_STAGES.indexOf(stage);
  if (index === SEED_LOT_STAGES.length - 1) {
    throw new Error(`${stage} is the terminal stage — it cannot have child lots`);
  }
  return SEED_LOT_STAGES[index + 1];
}

export interface SeedLot {
  id: string;
  lot_code: string;
  crop: string;
  variety: string;
  parent_lot_id: string | null;
  stage: SeedLotStage;
  quantity_total: number;
  quantity_allocated: number;
  unit: string;
  status: string;
  source_farm_id: string | null;
  organization_id: string | null;
  low_stock_threshold: number;
  production_date: string;
  notes: string | null;
  available_for_partner_order: boolean;
  testing_status: TestingStatus;
  // Batch Operations quick actions (migration 054) — see that migration's
  // header comment for how these relate to the existing storage-assignment
  // and lab-testing/partner-order concepts.
  storage_zone: string | null;
  approved_for_sale: boolean;
  created_at: string;
  updated_at: string;
}

export interface SeedLotWithAvailability extends SeedLot {
  quantity_available: number;
  is_low_stock: boolean;
}

export function withAvailability(lot: SeedLot): SeedLotWithAvailability {
  const quantity_available = Number(lot.quantity_total) - Number(lot.quantity_allocated);
  return {
    ...lot,
    quantity_available,
    is_low_stock: quantity_available <= Number(lot.low_stock_threshold),
  };
}

export interface CreateSeedLotInput {
  lotCode: string;
  crop: string;
  variety: string;
  parentLotId?: string | null;
  // Only used when parentLotId is omitted — a lot with a parent always gets
  // the next stage after its parent's, regardless of what's sent here.
  stage?: string;
  quantityTotal: number;
  unit?: string;
  sourceFarmId?: string;
  notes?: string;
  lowStockThreshold?: number;
  // Defaults to today; a child lot's date must be after its parent's
  // (enforced by the DB trigger), which is what makes backdating a
  // multiplication cycle a rejected write rather than a silent bad record.
  productionDate?: string;
  // Only honored for Admin — every other role's lots are always owned by
  // their own account's organization, regardless of what's sent here.
  organizationId?: string | null;
}

export interface UpdateSeedLotInput {
  variety?: string;
  quantityTotal?: number;
  unit?: string;
  status?: string;
  sourceFarmId?: string;
  notes?: string;
  lowStockThreshold?: number;
  // Opts a Foundation-stage lot into (or out of) the third-party partner
  // catalog — see the partners module. Meaningless at other stages, but not
  // rejected outright here, since a lot might be flagged in advance of
  // reaching Foundation.
  availableForPartnerOrder?: boolean;
  // Batch Operations quick actions (migration 054).
  storageZone?: string;
  approvedForSale?: boolean;
}
