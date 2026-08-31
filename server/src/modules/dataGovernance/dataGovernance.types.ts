export type ViolationType = 'CROP_MISMATCH' | 'STAGE_HIERARCHY' | 'PRODUCTION_DATE' | 'QUANTITY_LIMIT';

export interface SeedLotViolation {
  seedLotId: string;
  lotCode: string;
  crop: string;
  stage: string;
  parentLotId: string;
  parentLotCode: string;
  violationType: ViolationType;
  description: string;
}

export interface RecordInventoryCountInput {
  seedLotId: string;
  countedQuantity: number;
  countDate?: string;
  notes?: string;
}

export interface InventoryCountRow {
  id: string;
  seed_lot_id: string;
  counted_quantity: number;
  recorded_quantity: number;
  discrepancy: number;
  counted_by: string;
  count_date: string;
  notes: string | null;
  created_at: string;
}

export interface ReconciliationEntry {
  id: string;
  seedLotId: string;
  lotCode: string;
  crop: string;
  variety: string;
  countedQuantity: number;
  recordedQuantity: number;
  discrepancy: number;
  discrepancyPct: number | null;
  countedBy: string;
  countDate: string;
  notes: string | null;
}

export interface OrphanLotEntry {
  seedLotId: string;
  lotCode: string;
  crop: string;
  variety: string;
  stage: string;
  status: string;
  createdAt: string;
  daysSinceCreated: number;
}

export interface CorrectQuantityInput {
  quantityTotal: number;
  reason: string;
}

export interface CorrectionHistoryEntry {
  id: string;
  entityId: string;
  action: string;
  performedBy: string;
  beforeState: unknown;
  afterState: unknown;
  metadata: unknown;
  createdAt: string;
}
