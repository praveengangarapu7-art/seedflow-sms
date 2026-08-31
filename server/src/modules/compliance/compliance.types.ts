export interface PurityTestInput {
  seedLotId: string;
  sampleWeight: number;
  pureSeedWeight: number;
  notes?: string;
}

export interface ViabilityTestInput {
  seedLotId: string;
  sampleSize: number;
  viableCount: number;
  notes?: string;
}

export interface PhytosanitaryCertificateInput {
  seedLotId: string;
  certificateNumber: string;
  issuingAuthority: string;
  issueDate: string;
  expiryDate?: string;
  notes?: string;
}

export interface PhytosanitaryCertificateRow {
  id: string;
  seed_lot_id: string;
  certificate_number: string;
  issuing_authority: string;
  issue_date: string;
  expiry_date: string | null;
  status: string;
  issued_by: string;
  notes: string | null;
  created_at: string;
}

export interface RateSummary {
  averagePercent: number | null;
  testCount: number;
}

export interface QualityMetricsSummary {
  seedLotId: string;
  lotCode: string;
  crop: string;
  variety: string;
  stage: string;
  purity: RateSummary;
  viability: RateSummary;
  germination: RateSummary;
  phytosanitary: PhytosanitaryCertificateRow[];
}

export interface QualityCertificateRow {
  id: string;
  seed_lot_id: string;
  version: number;
  status: string;
  snapshot: QualityMetricsSummary;
  generated_by: string;
  signed_by: string | null;
  signature_role: string | null;
  signed_at: string | null;
  created_at: string;
}
