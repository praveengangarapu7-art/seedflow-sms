export interface SeedLotAllocation {
  id: string;
  seed_lot_id: string;
  allocated_to: string;
  quantity: number;
  status: string;
  performed_by: string;
  crop_plan_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface AllocationHistoryEntry extends SeedLotAllocation {
  performed_by_name: string | null;
  performed_by_role: string | null;
}

export interface AllocateInput {
  quantity: number;
  allocatedTo: string;
  // Optional reference to the frontend Crop Planning module's plan id/code,
  // so an allocation triggered by a crop plan can be traced back to it.
  cropPlanId?: string;
  notes?: string;
}

export interface ReleaseInput {
  notes?: string;
}
