-- A real production date, distinct from created_at (an audit timestamp
-- that's never user-editable) — this is what "production dates must be
-- after parent lot dates" actually validates against. Backfilled from
-- created_at for existing rows so the new checks have something to compare.
ALTER TABLE seed_lots
  ADD COLUMN production_date DATE NOT NULL DEFAULT CURRENT_DATE;

UPDATE seed_lots SET production_date = created_at::date;

-- Extends validate_seed_lot_parentage() (002, then 012) with two more rules:
--   - a child's production_date must be after its parent's
--   - a child's quantity_total can't exceed MAX_MULTIPLICATION_RATIO times
--     its parent's quantity_total (a real ceiling on seed multiplication —
--     "quantity cannot exceed production limits")
-- Crop/stage/cycle checks from the earlier migrations are unchanged below.
CREATE OR REPLACE FUNCTION validate_seed_lot_parentage()
RETURNS TRIGGER AS $$
DECLARE
  parent_crop VARCHAR(100);
  parent_stage VARCHAR(20);
  parent_production_date DATE;
  parent_quantity_total NUMERIC(12, 2);
  ancestor_id UUID;
  max_multiplication_ratio CONSTANT NUMERIC := 50;
BEGIN
  IF NEW.parent_lot_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT crop, stage, production_date, quantity_total
    INTO parent_crop, parent_stage, parent_production_date, parent_quantity_total
    FROM seed_lots WHERE id = NEW.parent_lot_id;

  IF parent_crop IS NULL THEN
    RAISE EXCEPTION 'Parent seed lot % does not exist', NEW.parent_lot_id
      USING ERRCODE = 'foreign_key_violation';
  END IF;

  IF parent_crop <> NEW.crop THEN
    RAISE EXCEPTION 'Child seed lot crop (%) must match parent seed lot crop (%)', NEW.crop, parent_crop
      USING ERRCODE = 'check_violation';
  END IF;

  IF seed_lot_stage_rank(NEW.stage) IS DISTINCT FROM seed_lot_stage_rank(parent_stage) + 1 THEN
    RAISE EXCEPTION 'Child seed lot stage (%) must be exactly one step past its parent''s stage (%)', NEW.stage, parent_stage
      USING ERRCODE = 'check_violation';
  END IF;

  IF NEW.production_date IS NOT NULL AND parent_production_date IS NOT NULL
     AND NEW.production_date <= parent_production_date THEN
    RAISE EXCEPTION 'Child seed lot production date (%) must be after its parent''s production date (%)',
      NEW.production_date, parent_production_date
      USING ERRCODE = 'check_violation';
  END IF;

  IF parent_quantity_total > 0 AND NEW.quantity_total > parent_quantity_total * max_multiplication_ratio THEN
    RAISE EXCEPTION 'Child seed lot quantity (%) exceeds the production limit of %x its parent''s quantity (%)',
      NEW.quantity_total, max_multiplication_ratio, parent_quantity_total
      USING ERRCODE = 'check_violation';
  END IF;

  ancestor_id := NEW.parent_lot_id;
  WHILE ancestor_id IS NOT NULL LOOP
    IF ancestor_id = NEW.id THEN
      RAISE EXCEPTION 'Circular parent-child relationship detected for seed lot %', NEW.id
        USING ERRCODE = 'check_violation';
    END IF;
    SELECT parent_lot_id INTO ancestor_id FROM seed_lots WHERE id = ancestor_id;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_validate_seed_lot_parentage ON seed_lots;

CREATE TRIGGER trg_validate_seed_lot_parentage
BEFORE INSERT OR UPDATE OF parent_lot_id, crop, stage, production_date, quantity_total ON seed_lots
FOR EACH ROW
EXECUTE FUNCTION validate_seed_lot_parentage();

-- Physical count reconciliation: a snapshot of what the DB thought was
-- available at count time, so the discrepancy stays meaningful even after
-- later allocations change quantity_available.
CREATE TABLE inventory_counts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seed_lot_id UUID NOT NULL REFERENCES seed_lots(id) ON DELETE RESTRICT,
  counted_quantity NUMERIC(12, 2) NOT NULL CHECK (counted_quantity >= 0),
  recorded_quantity NUMERIC(12, 2) NOT NULL,
  discrepancy NUMERIC(12, 2) NOT NULL,
  counted_by VARCHAR(100) NOT NULL,
  count_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_inventory_counts_seed_lot_id ON inventory_counts (seed_lot_id);
