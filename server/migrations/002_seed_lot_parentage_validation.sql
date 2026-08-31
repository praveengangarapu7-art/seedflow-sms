-- Database-level validation for parent-child seed lot relationships:
--   1. the parent lot must exist
--   2. a child lot's crop must match its parent lot's crop
--   3. no circular ancestry (a lot can never be its own ancestor)
-- This runs as a BEFORE trigger so violations abort the statement/transaction
-- before any row is written, independent of whatever the application layer checked.
CREATE OR REPLACE FUNCTION validate_seed_lot_parentage()
RETURNS TRIGGER AS $$
DECLARE
  parent_crop VARCHAR(100);
  ancestor_id UUID;
BEGIN
  IF NEW.parent_lot_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT crop INTO parent_crop FROM seed_lots WHERE id = NEW.parent_lot_id;
  IF parent_crop IS NULL THEN
    RAISE EXCEPTION 'Parent seed lot % does not exist' , NEW.parent_lot_id
      USING ERRCODE = 'foreign_key_violation';
  END IF;

  IF parent_crop <> NEW.crop THEN
    RAISE EXCEPTION 'Child seed lot crop (%) must match parent seed lot crop (%)', NEW.crop, parent_crop
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

CREATE TRIGGER trg_validate_seed_lot_parentage
BEFORE INSERT OR UPDATE OF parent_lot_id, crop ON seed_lots
FOR EACH ROW
EXECUTE FUNCTION validate_seed_lot_parentage();
