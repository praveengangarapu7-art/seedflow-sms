-- 025 widened the trigger to also fire on UPDATE OF production_date and
-- quantity_total, but the function re-validated ALL rules unconditionally —
-- so correcting quantity_total on a lot with a pre-existing (grandfathered)
-- production_date violation would fail on the unrelated, unchanged
-- production_date, making that lot's quantity permanently uncorrectable.
-- Each rule now only re-checks when TG_OP = INSERT or when the column(s) it
-- actually depends on changed.
CREATE OR REPLACE FUNCTION validate_seed_lot_parentage()
RETURNS TRIGGER AS $$
DECLARE
  parent_crop VARCHAR(100);
  parent_stage VARCHAR(20);
  parent_production_date DATE;
  parent_quantity_total NUMERIC(12, 2);
  ancestor_id UUID;
  max_multiplication_ratio CONSTANT NUMERIC := 50;
  parent_changed BOOLEAN := (TG_OP = 'INSERT' OR NEW.parent_lot_id IS DISTINCT FROM OLD.parent_lot_id);
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

  IF (parent_changed OR NEW.crop IS DISTINCT FROM OLD.crop) AND parent_crop <> NEW.crop THEN
    RAISE EXCEPTION 'Child seed lot crop (%) must match parent seed lot crop (%)', NEW.crop, parent_crop
      USING ERRCODE = 'check_violation';
  END IF;

  IF (parent_changed OR NEW.stage IS DISTINCT FROM OLD.stage)
     AND seed_lot_stage_rank(NEW.stage) IS DISTINCT FROM seed_lot_stage_rank(parent_stage) + 1 THEN
    RAISE EXCEPTION 'Child seed lot stage (%) must be exactly one step past its parent''s stage (%)', NEW.stage, parent_stage
      USING ERRCODE = 'check_violation';
  END IF;

  IF (parent_changed OR NEW.production_date IS DISTINCT FROM OLD.production_date)
     AND NEW.production_date IS NOT NULL AND parent_production_date IS NOT NULL
     AND NEW.production_date <= parent_production_date THEN
    RAISE EXCEPTION 'Child seed lot production date (%) must be after its parent''s production date (%)',
      NEW.production_date, parent_production_date
      USING ERRCODE = 'check_violation';
  END IF;

  IF (parent_changed OR NEW.quantity_total IS DISTINCT FROM OLD.quantity_total)
     AND parent_quantity_total > 0 AND NEW.quantity_total > parent_quantity_total * max_multiplication_ratio THEN
    RAISE EXCEPTION 'Child seed lot quantity (%) exceeds the production limit of %x its parent''s quantity (%)',
      NEW.quantity_total, max_multiplication_ratio, parent_quantity_total
      USING ERRCODE = 'check_violation';
  END IF;

  IF parent_changed THEN
    ancestor_id := NEW.parent_lot_id;
    WHILE ancestor_id IS NOT NULL LOOP
      IF ancestor_id = NEW.id THEN
        RAISE EXCEPTION 'Circular parent-child relationship detected for seed lot %', NEW.id
          USING ERRCODE = 'check_violation';
      END IF;
      SELECT parent_lot_id INTO ancestor_id FROM seed_lots WHERE id = ancestor_id;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
