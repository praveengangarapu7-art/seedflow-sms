-- Biochemical viability (e.g. tetrazolium test): a different measurement
-- from germination_tests, which records actual sprouting — a seed can be
-- biochemically viable without germinating under test conditions.
CREATE TABLE viability_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seed_lot_id UUID NOT NULL REFERENCES seed_lots(id) ON DELETE RESTRICT,
  sample_size INT NOT NULL CHECK (sample_size > 0),
  viable_count INT NOT NULL CHECK (viable_count >= 0),
  tested_by VARCHAR(100) NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_viable_within_sample CHECK (viable_count <= sample_size)
);

CREATE INDEX idx_viability_tests_seed_lot_id ON viability_tests (seed_lot_id);
