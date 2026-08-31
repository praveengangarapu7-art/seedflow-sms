CREATE TABLE seed_lot_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seed_lot_id UUID NOT NULL REFERENCES seed_lots(id) ON DELETE RESTRICT,
  allocated_to VARCHAR(150) NOT NULL,
  quantity NUMERIC(12, 2) NOT NULL CHECK (quantity > 0),
  status VARCHAR(20) NOT NULL DEFAULT 'allocated' CHECK (status IN ('allocated', 'released', 'cancelled')),
  performed_by VARCHAR(100) NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_seed_lot_allocations_seed_lot_id ON seed_lot_allocations (seed_lot_id);
CREATE INDEX idx_seed_lot_allocations_status ON seed_lot_allocations (status);

CREATE TRIGGER trg_seed_lot_allocations_touch_updated_at
BEFORE UPDATE ON seed_lot_allocations
FOR EACH ROW
EXECUTE FUNCTION touch_updated_at();
