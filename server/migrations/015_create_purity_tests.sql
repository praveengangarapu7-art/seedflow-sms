-- Physical purity analysis (ISTA-style): pure seed weight as a fraction of
-- the total sample weight — distinct from germination/viability, which
-- measure whether seeds sprout/are alive, not what fraction of the sample
-- is the crop seed itself.
CREATE TABLE purity_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seed_lot_id UUID NOT NULL REFERENCES seed_lots(id) ON DELETE RESTRICT,
  sample_weight NUMERIC(10, 3) NOT NULL CHECK (sample_weight > 0),
  pure_seed_weight NUMERIC(10, 3) NOT NULL CHECK (pure_seed_weight >= 0),
  tested_by VARCHAR(100) NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_pure_within_sample CHECK (pure_seed_weight <= sample_weight)
);

CREATE INDEX idx_purity_tests_seed_lot_id ON purity_tests (seed_lot_id);
