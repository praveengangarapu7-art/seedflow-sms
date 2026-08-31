import type { RecommendedAction, SignalContribution, WeatherOutlook } from './demandScoring';

export interface MarketPriceObservationRow {
  id: string;
  crop: string;
  variety: string | null;
  region: string | null;
  price_per_unit: number;
  unit: string;
  observed_date: string;
  source: string;
  recorded_by: string;
  created_at: string;
}

export interface RecordMarketPriceInput {
  crop: string;
  variety?: string;
  region?: string;
  pricePerUnit: number;
  unit?: string;
  observedDate: string;
  source: string;
}

export interface MinistryDemandForecastRow {
  id: string;
  crop: string;
  variety: string | null;
  region: string | null;
  season: string;
  forecasted_demand_quantity: number;
  unit: string;
  issuing_authority: string;
  published_date: string;
  recorded_by: string;
  created_at: string;
}

export interface RecordMinistryForecastInput {
  crop: string;
  variety?: string;
  region?: string;
  season: string;
  forecastedDemandQuantity: number;
  unit?: string;
  issuingAuthority: string;
  publishedDate: string;
}

export interface WeatherOutlookRow {
  id: string;
  region: string;
  crop: string | null;
  season: string;
  outlook: WeatherOutlook;
  rainfall_deviation_percent: number | null;
  issuing_authority: string;
  recorded_by: string;
  created_at: string;
}

export interface RecordWeatherOutlookInput {
  region: string;
  crop?: string;
  season: string;
  outlook: WeatherOutlook;
  rainfallDeviationPercent?: number;
  issuingAuthority: string;
}

export interface CropInsuranceRecordRow {
  id: string;
  crop: string;
  variety: string | null;
  region: string | null;
  season: string;
  claims_count: number;
  total_claim_amount: number;
  total_insured_quantity: number | null;
  recorded_by: string;
  created_at: string;
}

export interface RecordCropInsuranceInput {
  crop: string;
  variety?: string;
  region?: string;
  season: string;
  claimsCount: number;
  totalClaimAmount: number;
  totalInsuredQuantity?: number;
}

export interface VarietyDemandForecastRow {
  id: string;
  crop: string;
  variety: string;
  season: string;
  demand_score: number;
  recommended_action: RecommendedAction;
  suggested_price_per_unit: number | null;
  unit: string;
  signals_breakdown: SignalContribution[];
  generated_by: string;
  generated_at: string;
}

export interface BreedingPriorityRecommendation {
  crop: string;
  variety: string;
  season: string;
  demandScore: number;
  recommendedAction: RecommendedAction;
  activeCropPlanCount: number;
  currentCertifiedSupply: number;
  priorityNote: string;
}
