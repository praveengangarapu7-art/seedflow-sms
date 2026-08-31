-- Records the real-world outcome of sowing a (typically Certified) seed lot:
-- how much seed went in vs. how much crop came out. This is what makes
-- "yield outcome per seed lot" a real ratio instead of a guess.
CREATE TABLE harvest_yields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seed_lot_id UUID NOT NULL REFERENCES seed_lots(id) ON DELETE RESTRICT,
  crop_plan_id TEXT,
  sown_quantity NUMERIC(12, 2) NOT NULL CHECK (sown_quantity > 0),
  harvested_quantity NUMERIC(12, 2) NOT NULL CHECK (harvested_quantity >= 0),
  unit VARCHAR(20) NOT NULL DEFAULT 'kg',
  recorded_by VARCHAR(100) NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_harvest_yields_seed_lot_id ON harvest_yields (seed_lot_id);
CREATE INDEX idx_harvest_yields_crop_plan_id ON harvest_yields (crop_plan_id);
