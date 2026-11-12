-- Phase 2 of the Quality Spine: regulatory compliance register and gap
-- assessment. One row per requirement; the assessment lives on the row so the
-- register itself is the Requirement -> Status -> Gap -> Risk -> Action ->
-- Owner -> Target date -> Evidence report. Gaps feed the NCR/CAPA machinery
-- from migration 055 rather than inventing a second corrective-action system.

CREATE TABLE compliance_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  req_code VARCHAR(20) NOT NULL UNIQUE,
  regulation VARCHAR(150) NOT NULL,
  reference VARCHAR(100),
  title VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  category VARCHAR(30) NOT NULL CHECK (category IN
    ('licensing', 'certification', 'labelling_packaging', 'record_keeping', 'quality_testing',
     'storage_handling', 'dealer_sales', 'customer_export', 'other')),
  department VARCHAR(30) NOT NULL CHECK (department IN
    ('procurement', 'production', 'rd', 'laboratory', 'warehouse', 'logistics', 'operations', 'quality', 'hr_training')),
  status VARCHAR(20) NOT NULL DEFAULT 'not_assessed'
    CHECK (status IN ('not_assessed', 'compliant', 'partially_compliant', 'non_compliant', 'not_applicable')),
  current_status TEXT,
  gap TEXT,
  risk VARCHAR(10) CHECK (risk IN ('low', 'medium', 'high', 'critical')),
  corrective_action TEXT,
  responsible_email VARCHAR(100),
  target_date DATE,
  sop_id UUID REFERENCES sop_documents(id) ON DELETE SET NULL,
  ncr_id UUID REFERENCES non_conformances(id) ON DELETE SET NULL,
  assessed_by VARCHAR(100),
  assessed_at TIMESTAMPTZ,
  next_review_date DATE,
  created_by VARCHAR(100) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_compliance_requirement UNIQUE (regulation, title),
  -- Every assessed verdict says who made it, when, and on what basis.
  CONSTRAINT chk_req_assessed_has_assessor CHECK (
    status = 'not_assessed' OR (assessed_by IS NOT NULL AND assessed_at IS NOT NULL AND current_status IS NOT NULL)
  ),
  -- A gap is not actionable until it has a risk, an owner and a deadline.
  CONSTRAINT chk_req_gap_is_actionable CHECK (
    status NOT IN ('partially_compliant', 'non_compliant')
    OR (gap IS NOT NULL AND risk IS NOT NULL AND responsible_email IS NOT NULL AND target_date IS NOT NULL)
  )
);

CREATE INDEX idx_compliance_requirements_status ON compliance_requirements (status);
CREATE INDEX idx_compliance_requirements_category ON compliance_requirements (category);
CREATE INDEX idx_compliance_requirements_department ON compliance_requirements (department);
CREATE INDEX idx_compliance_requirements_ncr_id ON compliance_requirements (ncr_id);

CREATE TRIGGER trg_compliance_requirements_touch_updated_at
BEFORE UPDATE ON compliance_requirements
FOR EACH ROW
EXECUTE FUNCTION touch_updated_at();

CREATE TABLE compliance_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requirement_id UUID NOT NULL REFERENCES compliance_requirements(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  reference VARCHAR(500),
  description TEXT,
  added_by VARCHAR(100) NOT NULL,
  added_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_compliance_evidence_requirement_id ON compliance_evidence (requirement_id);
