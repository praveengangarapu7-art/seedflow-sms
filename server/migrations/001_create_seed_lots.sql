CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE OR REPLACE FUNCTION touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE seed_lots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lot_code VARCHAR(50) NOT NULL UNIQUE,
  crop VARCHAR(100) NOT NULL,
  variety VARCHAR(100) NOT NULL,
  parent_lot_id UUID REFERENCES seed_lots(id) ON DELETE RESTRICT,
  quantity_total NUMERIC(12, 2) NOT NULL CHECK (quantity_total >= 0),
  quantity_allocated NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (quantity_allocated >= 0),
  unit VARCHAR(20) NOT NULL DEFAULT 'kg',
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'depleted', 'archived')),
  source_farm_id VARCHAR(50),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_seed_lots_not_self_parent CHECK (id <> parent_lot_id),
  CONSTRAINT chk_seed_lots_allocated_within_total CHECK (quantity_allocated <= quantity_total)
);

CREATE INDEX idx_seed_lots_parent_lot_id ON seed_lots (parent_lot_id);
CREATE INDEX idx_seed_lots_crop ON seed_lots (crop);
CREATE INDEX idx_seed_lots_status ON seed_lots (status);

CREATE TRIGGER trg_seed_lots_touch_updated_at
BEFORE UPDATE ON seed_lots
FOR EACH ROW
EXECUTE FUNCTION touch_updated_at();
