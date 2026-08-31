export interface StorageLocationRow {
  id: string;
  organization_id: string;
  code: string;
  warehouse_zone: string;
  shelf: string | null;
  capacity_units: number;
  target_temperature_c: number;
  target_humidity_percent: number;
  daily_rate_per_unit: number;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface CreateStorageLocationInput {
  organizationId: string;
  code: string;
  warehouseZone: string;
  shelf?: string;
  capacityUnits: number;
  targetTemperatureC: number;
  targetHumidityPercent: number;
  dailyRatePerUnit?: number;
}

export interface StorageAssignmentRow {
  id: string;
  packaging_batch_id: string;
  storage_location_id: string;
  status: string;
  stored_at: string;
  ended_at: string | null;
  performed_by: string;
  notes: string | null;
  created_at: string;
}

export interface StorageConditionLogRow {
  id: string;
  storage_location_id: string;
  recorded_temperature_c: number;
  recorded_humidity_percent: number;
  recorded_by: string;
  notes: string | null;
  created_at: string;
}

export type ExpirationStatus = 'expired' | 'critical' | 'warning' | 'ok';

export interface ExpirationEntry {
  packagingBatchId: string;
  batchCode: string;
  seedLotId: string;
  lotCode: string;
  crop: string;
  variety: string;
  packagedAt: string;
  shelfLifeMonths: number;
  expirationDate: string;
  daysRemaining: number;
  status: ExpirationStatus;
  currentLocationCode: string | null;
  currentLocationZone: string | null;
  currentLocationShelf: string | null;
  currentLocationTemperatureC: number | null;
}

export interface FifoPickEntry {
  packagingBatchId: string;
  batchCode: string;
  lotCode: string;
  packagedAt: string;
  unitCount: number;
  totalQuantity: number;
  unitOfMeasure: string;
  currentLocationCode: string | null;
  currentLocationZone: string | null;
  daysInStorage: number;
}

export interface StorageCostEntry {
  packagingBatchId: string;
  batchCode: string;
  storageLocationId: string;
  locationCode: string;
  dailyRatePerUnit: number;
  unitCount: number;
  daysStored: number;
  accruedCost: number;
  status: string;
}
