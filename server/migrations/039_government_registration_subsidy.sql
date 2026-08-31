-- Government Registration & Subsidy Programs: submitting seed lots for
-- registration with a regulatory authority, defining subsidy programs with
-- eligibility criteria, farmers claiming subsidies against specific seed
-- lots, and generating the three government report types (production,
-- distribution, quality).

-- No existing organization type models a regulatory body — the other six
-- (breeder/producer/laboratory/certification_agency/warehouse/dealer) are
-- all supply-chain participants. Widening this CHECK constraint (rather
-- than a parallel "authorities" table) reuses all of organizations' existing
-- plumbing, since a government authority is administratively just another
-- organization other orgs interact with.
ALTER TABLE organizations DROP CONSTRAINT organizations_type_check;
ALTER TABLE organizations ADD CONSTRAINT organizations_type_check
  CHECK (type IN ('breeder', 'producer', 'laboratory', 'certification_agency', 'warehouse', 'dealer', 'government_authority'));

-- There's no real external government system to call, so "auto-submit" is
-- modeled honestly (same tradeoff as the seed-bank-partner and
-- authenticity/hash-chain features this session): a deterministic
-- eligibility check runs at submission time and auto-approves when the lot
-- already meets baseline requirements, otherwise the row sits at
-- "under_review" for an Inspector/Admin to decide manually. The partial
-- unique index allows resubmission after a rejection (a new row), while
-- still preventing a second concurrent submission for the same lot+authority.
CREATE TABLE lot_government_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seed_lot_id UUID NOT NULL REFERENCES seed_lots(id) ON DELETE RESTRICT,
  authority_org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'under_review', 'approved', 'rejected')),
  registration_number VARCHAR(60) UNIQUE,
  submitted_by VARCHAR(100),
  submitted_at TIMESTAMPTZ,
  decided_by VARCHAR(100),
  decided_at TIMESTAMPTZ,
  rejection_reason TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_lot_gov_reg_seed_lot ON lot_government_registrations (seed_lot_id);
CREATE INDEX idx_lot_gov_reg_authority ON lot_government_registrations (authority_org_id);
CREATE UNIQUE INDEX idx_lot_gov_reg_unique_active ON lot_government_registrations (seed_lot_id, authority_org_id) WHERE status != 'rejected';

-- Core, queryable eligibility dimensions are real columns (used directly in
-- filtering/reporting); auxiliary criteria go in one flexible JSONB column
-- (e.g. { maxQuantityPerFarmer, eligibleRegions }) — the same convention
-- crop_plans.recommendation_snapshot and quality_certificates.snapshot use
-- elsewhere in this schema, rather than over-normalizing into many columns.
CREATE TABLE subsidy_programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(150) NOT NULL,
  authority_org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  crop VARCHAR(100),
  min_stage VARCHAR(20) CHECK (min_stage IN ('Breeder', 'Foundation', 'Certified')),
  requires_government_registration BOOLEAN NOT NULL DEFAULT false,
  subsidy_amount_per_unit NUMERIC NOT NULL CHECK (subsidy_amount_per_unit > 0),
  unit VARCHAR(20) NOT NULL DEFAULT 'kg',
  eligibility_criteria JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by VARCHAR(100) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_subsidy_programs_crop ON subsidy_programs (crop);

-- claim_amount is snapshotted at submission (quantity * the program's rate
-- AT THAT TIME) rather than recomputed later, so a subsequent rate change
-- to the program never silently alters an already-submitted claim.
CREATE TABLE subsidy_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_number VARCHAR(60) NOT NULL UNIQUE,
  program_id UUID NOT NULL REFERENCES subsidy_programs(id) ON DELETE RESTRICT,
  farmer_id UUID NOT NULL REFERENCES farmers(id) ON DELETE RESTRICT,
  seed_lot_id UUID NOT NULL REFERENCES seed_lots(id) ON DELETE RESTRICT,
  quantity NUMERIC NOT NULL CHECK (quantity > 0),
  claim_amount NUMERIC NOT NULL CHECK (claim_amount >= 0),
  status VARCHAR(20) NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'under_review', 'approved', 'rejected', 'paid')),
  submitted_by VARCHAR(100) NOT NULL,
  decided_by VARCHAR(100),
  decided_at TIMESTAMPTZ,
  rejection_reason TEXT,
  paid_at TIMESTAMPTZ,
  payment_reference VARCHAR(100),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_subsidy_claims_farmer ON subsidy_claims (farmer_id);
CREATE INDEX idx_subsidy_claims_program ON subsidy_claims (program_id);
CREATE INDEX idx_subsidy_claims_seed_lot ON subsidy_claims (seed_lot_id);
CREATE INDEX idx_subsidy_claims_status ON subsidy_claims (status);

-- Versioned snapshot, same convention as quality_certificates: a report is
-- generated once from live data and stored, so it can be retrieved
-- identically later without depending on data that may since have changed.
CREATE TABLE government_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_type VARCHAR(20) NOT NULL CHECK (report_type IN ('production', 'distribution', 'quality')),
  crop_year INT,
  snapshot JSONB NOT NULL,
  generated_by VARCHAR(100) NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_government_reports_type ON government_reports (report_type, generated_at DESC);
