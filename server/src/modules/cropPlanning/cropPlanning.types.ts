export const SOIL_TYPES = ['loamy', 'clay', 'sandy', 'black', 'red', 'alluvial'] as const;
export type SoilType = (typeof SOIL_TYPES)[number];

export const IRRIGATION_TYPES = ['canal', 'borewell', 'rainfed', 'drip', 'sprinkler'] as const;
export type IrrigationType = (typeof IRRIGATION_TYPES)[number];

export const CROP_PLAN_STATUSES = ['draft', 'reserved', 'confirmed', 'cancelled'] as const;
export type CropPlanStatus = (typeof CROP_PLAN_STATUSES)[number];

export interface Farm {
  id: string;
  farmer_id: string;
  name: string;
  soil_type: SoilType;
  area_acres: number;
  irrigation_type: IrrigationType | null;
  created_at: string;
  updated_at: string;
}

export interface CreateFarmInput {
  farmerId: string;
  name: string;
  soilType: SoilType;
  areaAcres: number;
  irrigationType?: IrrigationType;
}

export interface VarietyRecommendation {
  varietyId: string;
  varietyName: string;
  botanicalName: string;
  yieldBenchmarkPerAcre: number | null;
  yieldUnit: string;
  marketDemandTrend: string | null;
  score: number;
  reasons: string[];
}

export type CompatibilityStatus = 'no_history' | 'rotation_ok' | 'repeat_caution';

export interface CropHistoryCompatibility {
  status: CompatibilityStatus;
  message: string;
  pastCrops: string[];
}

export interface AgroAdvisory {
  idealSowingWindow: string;
  spacing: string;
  nutrients: string;
  suitableSoils: SoilType[];
}

export interface CreateCropPlanDraftInput {
  farmerId: string;
  farmId: string;
  crop: string;
  varietyId: string;
  targetAreaAcres: number;
  sowingDate?: string;
}

export interface CropPlan {
  id: string;
  farmer_id: string;
  farm_id: string;
  crop: string;
  variety_id: string;
  target_area_acres: number;
  calculated_seed_quantity: number;
  seed_unit: string;
  sowing_date: string | null;
  seed_lot_id: string | null;
  allocation_id: string | null;
  status: CropPlanStatus;
  recommendation_snapshot: unknown;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface CropPlanWithContext extends CropPlan {
  farmer_name: string;
  farm_name: string;
  variety_name: string;
  lot_code: string | null;
}

/**
 * A candidate seed lot for the wizard's "Recommended Seed Lots" step
 * (Farmer-Centric Features / Extend "Crop Planning Wizard with Seed
 * Recommendations"). Ranked by the four signals the prompt names:
 * certified status, germination %, available quantity, and storage zone
 * proximity — see the scoring comment on getSeedLotRecommendations for how
 * "proximity" is defined given this schema has no farm/warehouse
 * geocoordinates.
 */
export interface SeedLotRecommendation {
  seedLotId: string;
  lotCode: string;
  productionDate: string;
  quantityAvailable: number;
  unit: string;
  isCertified: boolean;
  testingStatus: string;
  germinationPercent: number | null;
  storageZones: string[];
  score: number;
  reasons: string[];
}
