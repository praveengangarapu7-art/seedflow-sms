ALTER TABLE seed_lots
  ADD COLUMN stage VARCHAR(20) NOT NULL DEFAULT 'Certified'
  CHECK (stage IN ('Breeder', 'Foundation', 'Certified'));

-- Backfill existing rows from their position in the parent-child chain:
-- root lots become Breeder, their direct children Foundation, everything
-- deeper Certified. Generic over whatever hierarchy already exists.
WITH RECURSIVE depths AS (
  SELECT id, 0 AS depth FROM seed_lots WHERE parent_lot_id IS NULL
  UNION ALL
  SELECT sl.id, d.depth + 1 FROM seed_lots sl JOIN depths d ON sl.parent_lot_id = d.id
)
UPDATE seed_lots
SET stage = CASE
  WHEN depths.depth = 0 THEN 'Breeder'
  WHEN depths.depth = 1 THEN 'Foundation'
  ELSE 'Certified'
END
FROM depths
WHERE seed_lots.id = depths.id;

CREATE INDEX idx_seed_lots_stage ON seed_lots (stage);
