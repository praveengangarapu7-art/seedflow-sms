export interface PackagingBatchRow {
  id: string;
  batch_code: string;
  seed_lot_id: string;
  unit_size: number;
  unit_count: number;
  unit_of_measure: string;
  total_quantity: number;
  storage_conditions: string;
  shelf_life_months: number;
  status: string;
  packaged_by: string;
  created_at: string;
  updated_at: string;
}

export interface PackagingUnitRow {
  id: string;
  packaging_batch_id: string;
  unit_code: string;
  sequence_number: number;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface CreatePackagingBatchInput {
  seedLotId: string;
  unitSize: number;
  unitCount: number;
  storageConditions: string;
  shelfLifeMonths: number;
  unitOfMeasure?: string;
}

export interface UnitLabelData {
  unitCode: string;
  batchCode: string;
  sequenceNumber: number;
  lotCode: string;
  crop: string;
  variety: string;
  stage: string;
  unitSize: number;
  unitOfMeasure: string;
  shelfLifeMonths: number;
  storageConditions: string;
  packagedAt: string;
  certifiedDate: string | null;
  germinationPercent: number | null;
  qrPayload: string;
}
