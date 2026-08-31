import type { SeedLotStage } from '../seedLots/seedLots.types';

export const REGISTRATION_STATUSES = ['draft', 'submitted', 'under_review', 'approved', 'rejected'] as const;
export type RegistrationStatus = (typeof REGISTRATION_STATUSES)[number];

export interface LotGovernmentRegistrationRow {
  id: string;
  seed_lot_id: string;
  authority_org_id: string;
  status: RegistrationStatus;
  registration_number: string | null;
  submitted_by: string | null;
  submitted_at: string | null;
  decided_by: string | null;
  decided_at: string | null;
  rejection_reason: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

/** Auxiliary criteria beyond the queryable columns (crop/min_stage/requires_government_registration) — see subsidyEligibility.ts for how these are evaluated. */
export interface SubsidyEligibilityCriteria {
  maxQuantityPerFarmer?: number;
  eligibleRegions?: string[];
}

export interface SubsidyProgramRow {
  id: string;
  name: string;
  authority_org_id: string;
  crop: string | null;
  min_stage: SeedLotStage | null;
  requires_government_registration: boolean;
  subsidy_amount_per_unit: number;
  unit: string;
  eligibility_criteria: SubsidyEligibilityCriteria;
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface CreateSubsidyProgramInput {
  name: string;
  authorityOrgId: string;
  crop?: string;
  minStage?: SeedLotStage;
  requiresGovernmentRegistration?: boolean;
  subsidyAmountPerUnit: number;
  unit?: string;
  eligibilityCriteria?: SubsidyEligibilityCriteria;
}

export const CLAIM_STATUSES = ['submitted', 'under_review', 'approved', 'rejected', 'paid'] as const;
export type ClaimStatus = (typeof CLAIM_STATUSES)[number];

export interface SubsidyClaimRow {
  id: string;
  claim_number: string;
  program_id: string;
  farmer_id: string;
  seed_lot_id: string;
  quantity: number;
  claim_amount: number;
  status: ClaimStatus;
  submitted_by: string;
  decided_by: string | null;
  decided_at: string | null;
  rejection_reason: string | null;
  paid_at: string | null;
  payment_reference: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateSubsidyClaimInput {
  programId: string;
  farmerId: string;
  seedLotId: string;
  quantity: number;
  notes?: string;
}

export const GOVERNMENT_REPORT_TYPES = ['production', 'distribution', 'quality'] as const;
export type GovernmentReportType = (typeof GOVERNMENT_REPORT_TYPES)[number];

export interface ProductionReportEntry {
  crop: string;
  variety: string;
  stage: string;
  lotCount: number;
  totalQuantity: number;
  unit: string;
}

export interface DistributionReportEntry {
  crop: string;
  variety: string;
  claimCount: number;
  farmerCount: number;
  totalQuantityClaimed: number;
  totalSubsidyAmount: number;
}

export interface QualityReportEntry {
  crop: string;
  variety: string;
  lotCount: number;
  germination: { averagePercent: number | null; testCount: number };
  purity: { averagePercent: number | null; testCount: number };
  viability: { averagePercent: number | null; testCount: number };
}

export interface GovernmentReportRow {
  id: string;
  report_type: GovernmentReportType;
  crop_year: number | null;
  snapshot: ProductionReportEntry[] | DistributionReportEntry[] | QualityReportEntry[];
  generated_by: string;
  generated_at: string;
}
