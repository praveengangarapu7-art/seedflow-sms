-- Packaging divides a Certified lot's available quantity into farmer-sized
-- bags. Tracked in its own tables (not seed_lot_allocations) per the
-- requirement to keep packaging batches separate from parent lot inventory
-- bookkeeping — but still debits seed_lots.quantity_allocated on creation,
-- the same reservation mechanism allocations use, so a lot can never be
-- packaged past what's physically available.
CREATE TABLE packaging_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_code VARCHAR(30) NOT NULL UNIQUE,
  seed_lot_id UUID NOT NULL REFERENCES seed_lots(id) ON DELETE RESTRICT,
  unit_size NUMERIC(10, 2) NOT NULL CHECK (unit_size > 0),
  unit_count INT NOT NULL CHECK (unit_count > 0),
  unit_of_measure VARCHAR(20) NOT NULL DEFAULT 'kg',
  total_quantity NUMERIC(12, 2) NOT NULL CHECK (total_quantity > 0),
  storage_conditions VARCHAR(200) NOT NULL,
  shelf_life_months INT NOT NULL CHECK (shelf_life_months > 0),
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'recalled')),
  packaged_by VARCHAR(100) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_packaging_batches_seed_lot_id ON packaging_batches (seed_lot_id);
CREATE INDEX idx_packaging_batches_status ON packaging_batches (status);

CREATE TRIGGER trg_packaging_batches_touch_updated_at
BEFORE UPDATE ON packaging_batches
FOR EACH ROW
EXECUTE FUNCTION touch_updated_at();

-- One row per physical bag — each gets its own unique code/QR so a single
-- unit can be traced independently of the rest of its batch.
CREATE TABLE packaging_units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  packaging_batch_id UUID NOT NULL REFERENCES packaging_batches(id) ON DELETE CASCADE,
  unit_code VARCHAR(40) NOT NULL UNIQUE,
  sequence_number INT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'packaged' CHECK (status IN ('packaged', 'distributed', 'sold', 'damaged')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_packaging_units_batch_sequence UNIQUE (packaging_batch_id, sequence_number)
);

CREATE INDEX idx_packaging_units_batch_id ON packaging_units (packaging_batch_id);
CREATE INDEX idx_packaging_units_status ON packaging_units (status);

CREATE TRIGGER trg_packaging_units_touch_updated_at
BEFORE UPDATE ON packaging_units
FOR EACH ROW
EXECUTE FUNCTION touch_updated_at();
