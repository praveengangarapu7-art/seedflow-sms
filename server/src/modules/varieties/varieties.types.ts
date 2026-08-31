export const VARIETY_STATUSES = ['draft', 'pending_review', 'approved', 'rejected', 'deprecated'] as const;
export type VarietyStatus = (typeof VARIETY_STATUSES)[number];

export const VERSION_STATUSES = ['draft', 'issued', 'superseded'] as const;
export type VersionStatus = (typeof VERSION_STATUSES)[number];

export const MARKET_DEMAND_TRENDS = ['rising', 'stable', 'declining'] as const;
export type MarketDemandTrend = (typeof MARKET_DEMAND_TRENDS)[number];

export const REVIEW_DECISIONS = ['approved', 'rejected', 'changes_requested'] as const;
export type ReviewDecision = (typeof REVIEW_DECISIONS)[number];

export const RESISTANCE_LEVELS = ['high', 'moderate', 'low', 'susceptible'] as const;
export type ResistanceLevel = (typeof RESISTANCE_LEVELS)[number];

// The breeding committee — reuses existing roles rather than introducing a
// new one, mirroring how the certified-production workflow gates its stages
// by role instead of a separate membership table.
export const COMMITTEE_ROLES = ['Admin', 'Breeder'];

export interface DiseaseResistanceEntry {
  disease: string;
  resistanceLevel: ResistanceLevel;
}

export interface Variety {
  id: string;
  crop: string;
  variety_name: string;
  botanical_name: string;
  local_names: string[];
  organization_id: string | null;
  status: VarietyStatus;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface VarietyVersion {
  id: string;
  variety_id: string;
  version: number;
  status: VersionStatus;
  season: string;
  agro_climatic_suitability: string[];
  yield_benchmark_per_acre: number | null;
  yield_unit: string;
  disease_resistance_profile: DiseaseResistanceEntry[];
  market_demand_trend: MarketDemandTrend | null;
  notes: string | null;
  submitted_by: string;
  created_at: string;
}

export interface CommitteeReview {
  id: string;
  variety_version_id: string;
  reviewer: string;
  reviewer_role: string;
  decision: ReviewDecision;
  comments: string | null;
  reviewed_at: string;
}

export interface VarietyVersionWithReviews extends VarietyVersion {
  reviews: CommitteeReview[];
}

export interface VarietyWithVersions extends Variety {
  versions: VarietyVersionWithReviews[];
}

export interface VarietyWithLatestVersion extends Variety {
  latestVersion: VarietyVersion | null;
}

export interface CreateVarietyInput {
  crop: string;
  varietyName: string;
  botanicalName: string;
  localNames?: string[];
  organizationId?: string | null;
  season: string;
  agroClimaticSuitability?: string[];
  yieldBenchmarkPerAcre?: number;
  yieldUnit?: string;
  diseaseResistanceProfile?: DiseaseResistanceEntry[];
  marketDemandTrend?: MarketDemandTrend;
  notes?: string;
}

export interface UpdateVarietyDraftInput {
  botanicalName?: string;
  localNames?: string[];
  season?: string;
  agroClimaticSuitability?: string[];
  yieldBenchmarkPerAcre?: number;
  yieldUnit?: string;
  diseaseResistanceProfile?: DiseaseResistanceEntry[];
  marketDemandTrend?: MarketDemandTrend;
  notes?: string;
}

export interface CreateNewVersionInput {
  season: string;
  agroClimaticSuitability?: string[];
  yieldBenchmarkPerAcre?: number;
  yieldUnit?: string;
  diseaseResistanceProfile?: DiseaseResistanceEntry[];
  marketDemandTrend?: MarketDemandTrend;
  notes?: string;
}

export interface ReviewVarietyInput {
  decision: ReviewDecision;
  comments?: string;
}
