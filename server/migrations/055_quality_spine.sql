-- Quality Spine (Phase 1 of the Mangal Murti / QMICS SeedSphere roadmap).
--
--   SOP  ->  Non-Conformance (NCR)  ->  CAPA  ->  Effectiveness verification
--   Complaint  ->  auto-NCR  ->  lot hold / impact tracing
--
-- Responds directly to the September 2026 site-visit findings: no defined
-- processes in any department, records held only by the department in-charge,
-- no corrective/preventive-action analysis, no evidence of training. Every
-- table here is centrally stored, audit-logged (see audit_logs), and linked to
-- seed_lots where a lot is involved so quality events are traceable to product.

-- Race-free human-readable codes (SOP-PRD-001, NCR-2026-0001, ...). A counter
-- row per prefix is incremented atomically inside the caller's transaction,
-- unlike COUNT(*)+1 which two concurrent requests can both read.
CREATE TABLE quality_counters (
  counter_key VARCHAR(40) PRIMARY KEY,
  last_value INT NOT NULL DEFAULT 0
);

-- ---------------------------------------------------------------- SOP register
-- A document is the stable identity; each revision is a row in sop_versions so
-- the history an inspector asks for ("show me what was in force on 3 March")
-- is never overwritten.
CREATE TABLE sop_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sop_code VARCHAR(30) NOT NULL UNIQUE,
  title VARCHAR(200) NOT NULL,
  department VARCHAR(30) NOT NULL CHECK (department IN
    ('procurement', 'production', 'rd', 'laboratory', 'warehouse', 'logistics', 'operations', 'quality', 'hr_training')),
  owner_email VARCHAR(100) NOT NULL,
  review_interval_months INT NOT NULL DEFAULT 12 CHECK (review_interval_months BETWEEN 1 AND 60),
  created_by VARCHAR(100) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_sop_documents_department ON sop_documents (department);

CREATE TRIGGER trg_sop_documents_touch_updated_at
BEFORE UPDATE ON sop_documents
FOR EACH ROW
EXECUTE FUNCTION touch_updated_at();

CREATE TABLE sop_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sop_id UUID NOT NULL REFERENCES sop_documents(id) ON DELETE RESTRICT,
  version_number INT NOT NULL CHECK (version_number > 0),
  title VARCHAR(200) NOT NULL,
  content TEXT NOT NULL,
  change_summary VARCHAR(500) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'in_review', 'effective', 'superseded', 'rejected')),
  created_by VARCHAR(100) NOT NULL,
  submitted_at TIMESTAMPTZ,
  approved_by VARCHAR(100),
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  effective_date DATE,
  next_review_date DATE,
  retired_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_sop_versions_sop_version UNIQUE (sop_id, version_number),
  -- An effective version must record who approved it and when it took effect.
  CONSTRAINT chk_sop_versions_effective_has_approval CHECK (
    status <> 'effective' OR (approved_by IS NOT NULL AND effective_date IS NOT NULL AND next_review_date IS NOT NULL)
  )
);

-- At most one version in force, and at most one open revision, per SOP.
CREATE UNIQUE INDEX uq_sop_versions_one_effective ON sop_versions (sop_id) WHERE status = 'effective';
CREATE UNIQUE INDEX uq_sop_versions_one_open ON sop_versions (sop_id) WHERE status IN ('draft', 'in_review');
CREATE INDEX idx_sop_versions_status ON sop_versions (status);
CREATE INDEX idx_sop_versions_next_review ON sop_versions (next_review_date) WHERE status = 'effective';

CREATE TRIGGER trg_sop_versions_touch_updated_at
BEFORE UPDATE ON sop_versions
FOR EACH ROW
EXECUTE FUNCTION touch_updated_at();

-- "Read and understood" evidence per person per version — answers the site
-- visit finding that skill development / responsibilities are not evidenced.
CREATE TABLE sop_acknowledgements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sop_version_id UUID NOT NULL REFERENCES sop_versions(id) ON DELETE RESTRICT,
  user_email VARCHAR(100) NOT NULL,
  acknowledged_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_sop_ack_version_user UNIQUE (sop_version_id, user_email)
);

CREATE INDEX idx_sop_ack_user ON sop_acknowledgements (user_email);

-- ------------------------------------------------------------------ Complaints
CREATE TABLE quality_complaints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_code VARCHAR(30) NOT NULL UNIQUE,
  source VARCHAR(20) NOT NULL CHECK (source IN ('farmer', 'dealer', 'distributor', 'internal', 'other')),
  complainant_name VARCHAR(150) NOT NULL,
  complainant_contact VARCHAR(150),
  seed_lot_id UUID REFERENCES seed_lots(id) ON DELETE RESTRICT,
  title VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  severity VARCHAR(10) NOT NULL CHECK (severity IN ('minor', 'major', 'critical')),
  status VARCHAR(20) NOT NULL DEFAULT 'received'
    CHECK (status IN ('received', 'investigating', 'resolved', 'closed')),
  received_date DATE NOT NULL DEFAULT CURRENT_DATE,
  assigned_to VARCHAR(100),
  root_cause TEXT,
  resolution TEXT,
  recall_recommended BOOLEAN NOT NULL DEFAULT false,
  resolved_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  created_by VARCHAR(100) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- ncr_id is added after non_conformances exists (circular reference).
  CONSTRAINT chk_complaints_resolved_has_outcome CHECK (
    status NOT IN ('resolved', 'closed') OR (root_cause IS NOT NULL AND resolution IS NOT NULL)
  )
);

CREATE INDEX idx_quality_complaints_status ON quality_complaints (status);
CREATE INDEX idx_quality_complaints_seed_lot_id ON quality_complaints (seed_lot_id);

CREATE TRIGGER trg_quality_complaints_touch_updated_at
BEFORE UPDATE ON quality_complaints
FOR EACH ROW
EXECUTE FUNCTION touch_updated_at();

-- ------------------------------------------------------------ Non-conformances
CREATE TABLE non_conformances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ncr_code VARCHAR(30) NOT NULL UNIQUE,
  title VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  department VARCHAR(30) NOT NULL CHECK (department IN
    ('procurement', 'production', 'rd', 'laboratory', 'warehouse', 'logistics', 'operations', 'quality', 'hr_training')),
  source VARCHAR(20) NOT NULL CHECK (source IN
    ('internal_audit', 'complaint', 'inspection', 'lab_oos', 'supplier', 'process_deviation', 'other')),
  severity VARCHAR(10) NOT NULL CHECK (severity IN ('minor', 'major', 'critical')),
  seed_lot_id UUID REFERENCES seed_lots(id) ON DELETE RESTRICT,
  status VARCHAR(20) NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'investigating', 'closed', 'cancelled')),
  raised_by VARCHAR(100) NOT NULL,
  assigned_to VARCHAR(100),
  due_date DATE,
  root_cause TEXT,
  closure_notes TEXT,
  closed_by VARCHAR(100),
  closed_at TIMESTAMPTZ,
  complaint_id UUID REFERENCES quality_complaints(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_ncr_closed_has_closure CHECK (
    status <> 'closed' OR (root_cause IS NOT NULL AND closure_notes IS NOT NULL AND closed_by IS NOT NULL AND closed_at IS NOT NULL)
  )
);

CREATE INDEX idx_non_conformances_status ON non_conformances (status);
CREATE INDEX idx_non_conformances_severity ON non_conformances (severity);
CREATE INDEX idx_non_conformances_department ON non_conformances (department);
CREATE INDEX idx_non_conformances_seed_lot_id ON non_conformances (seed_lot_id);
CREATE INDEX idx_non_conformances_complaint_id ON non_conformances (complaint_id);

CREATE TRIGGER trg_non_conformances_touch_updated_at
BEFORE UPDATE ON non_conformances
FOR EACH ROW
EXECUTE FUNCTION touch_updated_at();

ALTER TABLE quality_complaints
  ADD COLUMN ncr_id UUID REFERENCES non_conformances(id) ON DELETE RESTRICT;
CREATE INDEX idx_quality_complaints_ncr_id ON quality_complaints (ncr_id);

-- ------------------------------------------------------------------------ CAPA
CREATE TABLE capas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  capa_code VARCHAR(30) NOT NULL UNIQUE,
  ncr_id UUID REFERENCES non_conformances(id) ON DELETE RESTRICT,
  complaint_id UUID REFERENCES quality_complaints(id) ON DELETE RESTRICT,
  action_type VARCHAR(12) NOT NULL CHECK (action_type IN ('corrective', 'preventive')),
  title VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  owner_email VARCHAR(100) NOT NULL,
  due_date DATE NOT NULL,
  status VARCHAR(15) NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'in_progress', 'implemented', 'closed', 'cancelled')),
  implementation_notes TEXT,
  implemented_at TIMESTAMPTZ,
  -- Effectiveness verification: done by someone other than the owner, after
  -- implementation. An 'ineffective' verdict sends the CAPA back to
  -- in_progress; verification_count records how many attempts it took.
  verified_by VARCHAR(100),
  verified_at TIMESTAMPTZ,
  effectiveness_result VARCHAR(12) CHECK (effectiveness_result IN ('effective', 'ineffective')),
  effectiveness_notes TEXT,
  verification_count INT NOT NULL DEFAULT 0,
  created_by VARCHAR(100) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_capas_closed_is_verified_effective CHECK (
    status <> 'closed' OR (effectiveness_result = 'effective' AND verified_by IS NOT NULL AND verified_at IS NOT NULL)
  )
);

CREATE INDEX idx_capas_status ON capas (status);
CREATE INDEX idx_capas_due_date ON capas (due_date) WHERE status NOT IN ('closed', 'cancelled');
CREATE INDEX idx_capas_ncr_id ON capas (ncr_id);
CREATE INDEX idx_capas_complaint_id ON capas (complaint_id);

CREATE TRIGGER trg_capas_touch_updated_at
BEFORE UPDATE ON capas
FOR EACH ROW
EXECUTE FUNCTION touch_updated_at();

-- ------------------------------------------------------------------- Lot holds
-- Stop-sale / quarantine. Deliberately a separate table rather than a new
-- seed_lots.status value: seed_lots.status is constrained and read by many
-- modules, and a hold is temporary, attributable and reversible — it needs its
-- own reason, who placed it, and who released it and why.
CREATE TABLE quality_lot_holds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seed_lot_id UUID NOT NULL REFERENCES seed_lots(id) ON DELETE RESTRICT,
  reason TEXT NOT NULL,
  source_type VARCHAR(12) NOT NULL CHECK (source_type IN ('ncr', 'complaint', 'manual')),
  source_id UUID,
  placed_by VARCHAR(100) NOT NULL,
  placed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  released_by VARCHAR(100),
  released_at TIMESTAMPTZ,
  release_notes TEXT,
  CONSTRAINT chk_lot_holds_release_complete CHECK (
    (released_at IS NULL AND released_by IS NULL AND release_notes IS NULL)
    OR (released_at IS NOT NULL AND released_by IS NOT NULL AND release_notes IS NOT NULL)
  )
);

-- A lot is either on hold or it is not: one active hold per lot.
CREATE UNIQUE INDEX uq_quality_lot_holds_active ON quality_lot_holds (seed_lot_id) WHERE released_at IS NULL;
CREATE INDEX idx_quality_lot_holds_seed_lot_id ON quality_lot_holds (seed_lot_id);
