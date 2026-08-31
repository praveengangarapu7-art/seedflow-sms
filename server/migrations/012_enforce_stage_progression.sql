-- Extends the parentage trigger (002_seed_lot_parentage_validation.sql) to
-- also enforce the seed certification progression Breeder -> Foundation ->
-- Certified: a child lot's stage must be exactly one step past its
-- parent's. This is what makes the genealogy tree a clean three-tier
-- structure instead of an arbitrary graph.
CREATE OR REPLACE FUNCTION seed_lot_stage_rank(stage_name VARCHAR)
RETURNS INT AS $$
BEGIN
  RETURN CASE stage_name
    WHEN 'Breeder' THEN 1
    WHEN 'Foundation' THEN 2
    WHEN 'Certified' THEN 3
    ELSE NULL
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION validate_seed_lot_parentage()
RETURNS TRIGGER AS $$
DECLARE
  parent_crop VARCHAR(100);
  parent_stage VARCHAR(20);
  ancestor_id UUID;
BEGIN
  IF NEW.parent_lot_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT crop, stage INTO parent_crop, parent_stage FROM seed_lots WHERE id = NEW.parent_lot_id;
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

-- Re-create the trigger so it also fires when `stage` changes (the original
-- only watched parent_lot_id and crop).
DROP TRIGGER IF EXISTS trg_validate_seed_lot_parentage ON seed_lots;

CREATE TRIGGER trg_validate_seed_lot_parentage
BEFORE INSERT OR UPDATE OF parent_lot_id, crop, stage ON seed_lots
FOR EACH ROW
EXECUTE FUNCTION validate_seed_lot_parentage();
