-- Integration with EXTERNAL seed testing labs (organizations of
-- type='laboratory') — distinct from the existing self-reported
-- purity/viability/germination tests in the compliance module. A sample
-- batch is submitted to a lab; the lab (via Admin/Inspector acting on its
-- behalf) reports results back per requested test type, either one at a
-- time or via a bulk file upload.
CREATE TABLE lab_test_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seed_lot_id UUID NOT NULL REFERENCES seed_lots(id) ON DELETE RESTRICT,
  lab_organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  requested_tests JSONB NOT NULL,
  sample_quantity NUMERIC(10, 2) NOT NULL CHECK (sample_quantity > 0),
  sample_unit VARCHAR(20) NOT NULL DEFAULT 'g',
  status VARCHAR(20) NOT NULL DEFAULT 'submitted'
    CHECK (status IN ('submitted', 'in_progress', 'completed', 'failed')),
  submitted_by VARCHAR(100) NOT NULL,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expected_completion_date DATE NOT NULL,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_lab_test_submissions_seed_lot_id ON lab_test_submissions (seed_lot_id);
CREATE INDEX idx_lab_test_submissions_lab_org_id ON lab_test_submissions (lab_organization_id);
CREATE INDEX idx_lab_test_submissions_status ON lab_test_submissions (status);

-- result_value is the single normalized percentage/score the pass/fail
-- threshold is actually compared against (germination rate %, purity %, or
-- vigor %) — metrics keeps the raw inputs the lab reported so nothing is lost.
CREATE TABLE lab_test_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES lab_test_submissions(id) ON DELETE RESTRICT,
  test_type VARCHAR(20) NOT NULL CHECK (test_type IN ('germination', 'purity', 'vigor')),
  metrics JSONB NOT NULL,
  result_value NUMERIC(6, 2) NOT NULL,
  threshold_used NUMERIC(6, 2) NOT NULL,
  passed BOOLEAN NOT NULL,
  source VARCHAR(20) NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'file_upload')),
  recorded_by VARCHAR(100) NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT,
  UNIQUE (submission_id, test_type)
);

CREATE INDEX idx_lab_test_results_submission_id ON lab_test_results (submission_id);

CREATE TABLE lab_quality_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seed_lot_id UUID NOT NULL REFERENCES seed_lots(id) ON DELETE RESTRICT,
  submission_id UUID NOT NULL REFERENCES lab_test_submissions(id) ON DELETE RESTRICT,
  test_type VARCHAR(20) NOT NULL,
  reason TEXT NOT NULL,
  flagged_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved BOOLEAN NOT NULL DEFAULT false,
  resolved_by VARCHAR(100),
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT
);

CREATE INDEX idx_lab_quality_flags_seed_lot_id ON lab_quality_flags (seed_lot_id);
CREATE INDEX idx_lab_quality_flags_resolved ON lab_quality_flags (resolved);

-- Nullable, additive link so certificates generated from a completed lab
-- submission are traceable back to it — existing compliance-module writes
-- never set this and are unaffected.
ALTER TABLE phytosanitary_certificates
  ADD COLUMN submission_id UUID REFERENCES lab_test_submissions(id) ON DELETE SET NULL;
