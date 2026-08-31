import type { ClimateResilienceSignalContribution } from './climateResilienceScoring';

export const RISK_LEVELS = ['low', 'moderate', 'high', 'severe'] as const;
export type RiskLevel = (typeof RISK_LEVELS)[number];

export const PRIMARY_RISK_FACTORS = ['drought', 'excess_rainfall', 'heat', 'cold', 'none'] as const;
export type PrimaryRiskFactor = (typeof PRIMARY_RISK_FACTORS)[number];

export interface ClimatePredictionRow {
  id: string;
  region: string;
  season: string;
  predicted_rainfall_mm: number | null;
  predicted_avg_temp_celsius: number | null;
  predicted_min_temp_celsius: number | null;
  predicted_max_temp_celsius: number | null;
  risk_level: RiskLevel;
  primary_risk_factor: PrimaryRiskFactor | null;
  source: string;
  recorded_by: string;
  created_at: string;
}

export interface RecordClimatePredictionInput {
  region: string;
  season: string;
  predictedRainfallMm?: number;
  predictedAvgTempCelsius?: number;
  predictedMinTempCelsius?: number;
  predictedMaxTempCelsius?: number;
  riskLevel?: RiskLevel;
  primaryRiskFactor?: PrimaryRiskFactor;
  source: string;
}

export interface ClimateRiskAlertRow {
  id: string;
  climate_prediction_id: string;
  farm_id: string;
  farmer_id: string;
  crop: string;
  risk_level: RiskLevel;
  message: string;
  acknowledged: boolean;
  acknowledged_by: string | null;
  acknowledged_at: string | null;
  created_at: string;
}

export const OUTCOME_RATINGS = ['excellent', 'good', 'fair', 'poor'] as const;
export type OutcomeRating = (typeof OUTCOME_RATINGS)[number];

export interface AdaptationOutcomeRow {
  id: string;
  farm_id: string;
  variety_id: string;
  climate_prediction_id: string | null;
  crop: string;
  season: string;
  actual_yield_per_acre: number | null;
  outcome_rating: OutcomeRating;
  notes: string | null;
  recorded_by: string;
  recorded_at: string;
}

export interface RecordAdaptationOutcomeInput {
  farmId: string;
  varietyId: string;
  climatePredictionId?: string;
  crop: string;
  season: string;
  actualYieldPerAcre?: number;
  outcomeRating: OutcomeRating;
  notes?: string;
}

export interface ClimateSmartRecommendation {
  varietyId: string;
  varietyName: string;
  botanicalName: string;
  yieldBenchmarkPerAcre: number | null;
  yieldUnit: string;
  marketDemandTrend: string | null;
  baseScore: number;
  baseReasons: string[];
  climateResilienceScore: number | null;
  climateBreakdown: ClimateResilienceSignalContribution[];
  combinedScore: number;
}
