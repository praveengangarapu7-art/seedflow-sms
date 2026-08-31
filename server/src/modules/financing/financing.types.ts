export const FINANCING_TYPES = ['breeder_credit', 'farmer_microfinance', 'warehouse_receivables'] as const;
export type FinancingType = (typeof FINANCING_TYPES)[number];

export const FINANCING_STATUSES = ['requested', 'approved', 'rejected', 'disbursed', 'repaying', 'repaid', 'defaulted'] as const;
export type FinancingStatus = (typeof FINANCING_STATUSES)[number];

export interface FinancingAccountRow {
  id: string;
  financing_type: FinancingType;
  borrower_organization_id: string | null;
  borrower_farmer_id: string | null;
  seed_lot_id: string | null;
  allocation_id: string | null;
  principal_amount: number;
  annual_interest_rate_percent: number;
  receivable_amount: number | null;
  linked_insurance_crop: string | null;
  linked_insurance_season: string | null;
  status: FinancingStatus;
  requested_by: string;
  approved_by: string | null;
  approved_at: string | null;
  rejection_reason: string | null;
  disbursed_at: string | null;
  amount_due: number | null;
  repayment_due_date: string | null;
  repaid_at: string | null;
  repaid_amount: number | null;
  payment_reference: string | null;
  defaulted_at: string | null;
  default_reason: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface RequestFinancingInput {
  financingType: FinancingType;
  borrowerOrganizationId?: string;
  borrowerFarmerId?: string;
  seedLotId?: string;
  allocationId?: string;
  principalAmount: number;
  annualInterestRatePercent: number;
  receivableAmount?: number;
  linkedInsuranceCrop?: string;
  linkedInsuranceSeason?: string;
  notes?: string;
}

export interface RecordRepaymentInput {
  repaidAmount: number;
  paymentReference: string;
}

export interface FinancingCostSummary {
  seedLotId: string;
  financingCount: number;
  totalPrincipal: number;
  totalAccruedInterest: number;
  totalAmountDue: number;
}

export interface InsuranceContext {
  crop: string;
  season: string;
  claimsCount: number;
  totalClaimAmount: number;
  recordCount: number;
}
