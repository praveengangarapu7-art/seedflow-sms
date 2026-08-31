import type { CorrelationStrength } from './traitCorrelation';
import type { GermplasmSignalContribution } from './germplasmScoring';
import type { HybridVigorSignalContribution } from './hybridVigorPrediction';

export interface LotTraitMeasurementRow {
  id: string;
  seed_lot_id: string;
  trait_type: string;
  numeric_value: number | null;
  category_value: string | null;
  unit: string | null;
  measured_date: string;
  recorded_by: string;
  notes: string | null;
  created_at: string;
}

export interface RecordTraitMeasurementInput {
  seedLotId: string;
  traitType: string;
  numericValue?: number;
  categoryValue?: string;
  unit?: string;
  measuredDate: string;
  notes?: string;
}

export interface HybridCrossPredictionRow {
  id: string;
  parent_a_lot_id: string;
  parent_b_lot_id: string;
  trait_type: string;
  mid_parent_value: number;
  same_lineage: boolean;
  predicted_heterosis_percent: number;
  predicted_vigor_score: number;
  signals_breakdown: HybridVigorSignalContribution[];
  predicted_by: string;
  predicted_at: string;
  actual_child_lot_id: string | null;
  actual_trait_value: number | null;
}

export interface PredictHybridCrossInput {
  parentALotId: string;
  parentBLotId: string;
  traitType: string;
}

export interface RecordActualCrossOutcomeInput {
  actualChildLotId: string;
  actualTraitValue: number;
}

export interface LineageSummaryEntry {
  rootLotId: string;
  rootLotCode: string;
  crop: string;
  variety: string;
  descendantCount: number;
  foundationLotCount: number;
  certifiedLotCount: number;
  totalDescendantQuantity: number;
  unit: string;
}

export interface TraitInheritanceReport {
  traitType: string;
  correlation: number | null;
  sampleSize: number;
  strength: CorrelationStrength;
  pairs: { parentLotCode: string; childLotCode: string; parentValue: number; childValue: number }[];
}

export interface GermplasmPoolRanking {
  rootLotId: string;
  rootLotCode: string;
  crop: string;
  variety: string;
  score: number;
  breakdown: GermplasmSignalContribution[];
}

export interface BreedingCycleTimelineEntry {
  rootLotId: string;
  rootLotCode: string;
  descendantLotId: string;
  descendantLotCode: string;
  descendantStage: string;
  daysFromRoot: number;
}

export interface BreedingProgramRoiEntry {
  rootLotId: string;
  rootLotCode: string;
  crop: string;
  variety: string;
  breederStageQuantity: number;
  foundationYieldAchieved: number;
  unit: string;
  yieldMultiplicationRoi: number | null;
}
