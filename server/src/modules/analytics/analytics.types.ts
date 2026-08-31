export interface HarvestYieldInput {
  seedLotId: string;
  cropPlanId?: string;
  sownQuantity: number;
  harvestedQuantity: number;
  unit?: string;
  notes?: string;
}

export interface GerminationTestInput {
  seedLotId: string;
  sampleSize: number;
  germinatedCount: number;
  notes?: string;
}

export interface UtilizationEntry {
  seedLotId: string;
  lotCode: string;
  crop: string;
  stage: string;
  quantityTotal: number;
  quantityAllocated: number;
  quantityAvailable: number;
  utilizationPercent: number;
}

export interface YieldOutcomeEntry {
  seedLotId: string;
  lotCode: string;
  crop: string;
  totalSown: number;
  totalHarvested: number;
  yieldRatio: number | null;
  unit: string;
  recordCount: number;
}

export interface GerminationRateEntry {
  variety: string;
  totalSampleSize: number;
  totalGerminated: number;
  germinationRatePercent: number;
  testCount: number;
}

export interface BreedingEffectivenessEntry {
  parentLotId: string;
  parentLotCode: string;
  parentStage: string;
  childStage: string;
  parentQuantityAllocated: number;
  childrenQuantityTotal: number;
  multiplicationRatio: number | null;
  childLotCodes: string[];
}

export interface ProductionAnalyticsDashboard {
  utilization: UtilizationEntry[];
  yieldOutcomes: YieldOutcomeEntry[];
  germinationRates: GerminationRateEntry[];
  breedingEffectiveness: BreedingEffectivenessEntry[];
}
