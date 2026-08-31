-- Precomputes, for every seed lot, its full ancestor chain (root-first
-- ordered array) and full descendant set (any depth) in one row. This
-- replaces fetchAncestorChain()'s current N-sequential-round-trips loop
-- (one query per generation) and lets fetchDescendants() skip its live
-- recursive CTE for the common case — both become a single indexed lookup
-- plus one `WHERE id = ANY(...)` fetch of the actual lot rows.
--
-- ancestry: walks DOWN from every root (parent_lot_id IS NULL), extending
-- each lot's ancestor_ids with its own id as the recursion descends —
-- because seed lot parentage is a tree (one parent per lot, enforced by
-- validate_seed_lot_parentage()), this correctly produces one ordered
-- ancestor path per lot in a single pass.
-- descendant_map: inverts that — unnesting each lot's ancestor_ids gives,
-- for every ancestor, the set of lots that have it somewhere above them.
CREATE MATERIALIZED VIEW mv_seed_lot_genealogy AS
WITH RECURSIVE ancestry AS (
  SELECT id AS lot_id, ARRAY[]::uuid[] AS ancestor_ids, 0 AS generation
  FROM seed_lots
  WHERE parent_lot_id IS NULL

  UNION ALL

  SELECT sl.id, a.ancestor_ids || sl.parent_lot_id, a.generation + 1
  FROM seed_lots sl
  JOIN ancestry a ON sl.parent_lot_id = a.lot_id
),
descendant_map AS (
  SELECT unnest(ancestor_ids) AS ancestor_id, lot_id AS descendant_id
  FROM ancestry
  WHERE array_length(ancestor_ids, 1) > 0
)
SELECT
  a.lot_id AS seed_lot_id,
  a.ancestor_ids,
  a.generation,
  COALESCE(
    (SELECT array_agg(dm.descendant_id) FROM descendant_map dm WHERE dm.ancestor_id = a.lot_id),
    ARRAY[]::uuid[]
  ) AS descendant_ids
FROM ancestry a;

-- REFRESH MATERIALIZED VIEW CONCURRENTLY requires a unique index on the view.
CREATE UNIQUE INDEX idx_mv_seed_lot_genealogy_lot_id ON mv_seed_lot_genealogy (seed_lot_id);
CREATE INDEX idx_mv_seed_lot_genealogy_ancestors ON mv_seed_lot_genealogy USING GIN (ancestor_ids);
CREATE INDEX idx_mv_seed_lot_genealogy_descendants ON mv_seed_lot_genealogy USING GIN (descendant_ids);
