export const TEST_TYPES = ['germination', 'purity', 'vigor'] as const;
export type TestType = (typeof TEST_TYPES)[number];

export const SUBMISSION_STATUSES = ['submitted', 'in_progress', 'completed', 'failed'] as const;
export type SubmissionStatus = (typeof SUBMISSION_STATUSES)[number];

export const RESULT_SOURCES = ['manual', 'file_upload'] as const;
export type ResultSource = (typeof RESULT_SOURCES)[number];

// Standard certification pass thresholds (percent) per test type — the
// concrete "certification standard" referenced by the task, chosen the same
// way earlier tasks picked well-defined agronomic proxies (e.g. the demand
// planning seed-rate constant): ISTA-typical minimums for certified seed —
// 85% germination, 98% purity, 70% vigor.
export const CERTIFICATION_THRESHOLDS: Record<TestType, number> = {
  germination: 85,
  purity: 98,
  vigor: 70,
};

export interface SubmitSampleBatchInput {
  seedLotId: string;
  labOrganizationId: string;
  requestedTests: TestType[];
  sampleQuantity: number;
  sampleUnit?: string;
  expectedCompletionDate?: string;
}

export interface LabTestSubmission {
  id: string;
  seed_lot_id: string;
  lab_organization_id: string;
  requested_tests: TestType[];
  sample_quantity: number;
  sample_unit: string;
  status: SubmissionStatus;
  submitted_by: string;
  submitted_at: string;
  expected_completion_date: string;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface GerminationMetrics {
  sampleSize: number;
  germinatedCount: number;
}

export interface PurityMetrics {
  sampleWeight: number;
  pureSeedWeight: number;
}

export interface VigorMetrics {
  sampleSize: number;
  vigorCount: number;
}

export type TestMetrics = GerminationMetrics | PurityMetrics | VigorMetrics;

export interface RecordTestResultInput {
  testType: TestType;
  metrics: TestMetrics;
  notes?: string;
}

export interface LabTestResult {
  id: string;
  submission_id: string;
  test_type: TestType;
  metrics: TestMetrics;
  result_value: number;
  threshold_used: number;
  passed: boolean;
  source: ResultSource;
  recorded_by: string;
  recorded_at: string;
  notes: string | null;
}

export interface LabTestSubmissionWithResults extends LabTestSubmission {
  lab_organization_name: string;
  lot_code: string;
  results: LabTestResult[];
}

export interface LabQualityFlag {
  id: string;
  seed_lot_id: string;
  submission_id: string;
  test_type: TestType;
  reason: string;
  flagged_at: string;
  resolved: boolean;
  resolved_by: string | null;
  resolved_at: string | null;
  resolution_notes: string | null;
}

export interface LabQualityFlagWithContext extends LabQualityFlag {
  lot_code: string;
}

export interface LabPerformanceEntry {
  labOrganizationId: string;
  labOrganizationName: string;
  totalSubmissions: number;
  completedCount: number;
  failedCount: number;
  passRate: number | null;
  avgTurnaroundDays: number | null;
  overdueCount: number;
}

export interface GeneratePhytosanitaryFromSubmissionInput {
  certificateNumber?: string;
  issuingAuthority?: string;
  expiryDate?: string;
  notes?: string;
}
