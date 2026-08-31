-- seed_lots already indexes organization_id (006), stage (011), crop (001),
-- and status (001). Two real, query-pattern-backed gaps remain:
--
-- production_date: range-filtered in seedLotSearch.service.ts
-- (productionDateFrom/productionDateTo) with no supporting index at all.
--
-- variety: filtered with `ILIKE '%...%'` (leading wildcard) in the same
-- search — a plain btree index cannot accelerate a leading-wildcard LIKE,
-- so this needs pg_trgm's trigram GIN index instead, which can. This is
-- the schema's stand-in for what the task calls "varietyId" — seed_lots
-- has no variety_id FK (variety is matched to the catalog by crop+name
-- string, an established, deliberate choice elsewhere in this schema),
-- so indexing the actual free-text `variety` column is the equivalent,
-- real optimization.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX idx_seed_lots_production_date ON seed_lots (production_date);
CREATE INDEX idx_seed_lots_variety_trgm ON seed_lots USING GIN (variety gin_trgm_ops);

-- Backs `ORDER BY created_at DESC` on the unfiltered/lightly-filtered list
-- and search paths once result sets get large enough for the planner to
-- prefer an index scan over a sort.
CREATE INDEX idx_seed_lots_created_at ON seed_lots (created_at DESC);
