export interface PlanningItemInput {
  crop: string;
  variety: string;
  season: string;
  targetArea?: number;
  sowingDate: string;
}

export type DemandUrgency = 'urgent' | 'planned';

export interface DemandForecastEntry {
  crop: string;
  variety: string;
  season: string;
  monthsAhead: number;
  urgency: DemandUrgency;
  seedRatePerAcre: number;
  totalAreaAcres: number;
  requiredQuantity: number;
  availableQuantity: number;
  gapQuantity: number;
  unit: string;
}

export interface DemandForecastResult {
  horizonMonths: number;
  generatedAt: string;
  entries: DemandForecastEntry[];
}

export interface GeneratePurchaseOrderInput {
  crop: string;
  variety: string;
  quantity: number;
}

export interface PurchaseOrderRow {
  id: string;
  po_number: string;
  crop: string;
  variety: string;
  organization_id: string;
  quantity_requested: number;
  unit: string;
  status: string;
  source: string;
  requested_by: string;
  expected_delivery_date: string | null;
  actual_delivery_date: string | null;
  fulfilled_seed_lot_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface InventoryOptimizationEntry {
  // Null when there is no Certified lot at all for this crop/variety yet —
  // the zero-inventory case, surfaced via its open purchase order instead
  // of being silently absent from the view.
  seedLotId: string | null;
  lotCode: string | null;
  crop: string;
  variety: string;
  quantityAvailable: number;
  lowStockThreshold: number;
  isLowStock: boolean;
  openPurchaseOrders: Array<{ id: string; poNumber: string; status: string; quantityRequested: number }>;
}
