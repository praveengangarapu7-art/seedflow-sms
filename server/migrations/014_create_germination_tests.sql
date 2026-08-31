-- Standard seed-quality lab/field test: what fraction of a sample actually
-- germinates. `variety` is denormalized from the seed lot at record time so
-- germination rates can be aggregated by variety even as lots come and go.
CREATE TABLE germination_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seed_lot_id UUID NOT NULL REFERENCES seed_lots(id) ON DELETE RESTRICT,
  variety VARCHAR(100) NOT NULL,
  sample_size INT NOT NULL CHECK (sample_size > 0),
  germinated_count INT NOT NULL CHECK (germinated_count >= 0),
  tested_by VARCHAR(100) NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_germinated_within_sample CHECK (germinated_count <= sample_size)
);

CREATE INDEX idx_germination_tests_seed_lot_id ON germination_tests (seed_lot_id);
CREATE INDEX idx_germination_tests_variety ON germination_tests (variety);
