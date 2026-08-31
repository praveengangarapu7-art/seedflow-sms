-- Version control for compliance certificates: each generation for a lot
-- gets the next integer version and its own immutable JSON snapshot of the
-- metrics at that moment, so a previously issued certificate stays exactly
-- as it was even after new tests are recorded. Signing an "issued" version
-- supersedes any prior issued version for the same lot (enforced in the
-- service layer's transaction, not here) rather than deleting history.
CREATE TABLE quality_certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seed_lot_id UUID NOT NULL REFERENCES seed_lots(id) ON DELETE RESTRICT,
  version INT NOT NULL CHECK (version > 0),
  status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'issued', 'superseded', 'revoked')),
  snapshot JSONB NOT NULL,
  generated_by VARCHAR(100) NOT NULL,
  signed_by VARCHAR(100),
  signature_role VARCHAR(30),
  signed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_quality_certificates_lot_version UNIQUE (seed_lot_id, version)
);

CREATE INDEX idx_quality_certificates_seed_lot_id ON quality_certificates (seed_lot_id);
