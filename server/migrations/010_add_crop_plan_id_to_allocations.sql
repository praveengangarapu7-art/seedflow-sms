-- Free-form reference, not a FK: crop plans currently live only in the
-- frontend's seed/mock data (no crop_plans table exists in this database).
-- This just lets an allocation record which crop plan requested it.
ALTER TABLE seed_lot_allocations
  ADD COLUMN crop_plan_id TEXT;

CREATE INDEX idx_seed_lot_allocations_crop_plan_id ON seed_lot_allocations (crop_plan_id);
