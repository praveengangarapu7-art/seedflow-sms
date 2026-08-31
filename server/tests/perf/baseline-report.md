# Query performance baseline

Established 2026-08-15T11:26:31.657Z against a 20000-row seed_lots dataset (see seedBulkData.ts).
Not a pass/fail gate — this is the reference point future runs get compared against.

| Query | Execution (ms) | Planning (ms) | Scan type | Index used |
|---|---|---|---|---|
| seed_lots filtered by crop (idx_seed_lots_crop) | 0.08 | 0.46 | Index Scan | idx_seed_lots_created_at |
| seed_lots filtered by organization_id (idx_seed_lots_organization_id) | 0.07 | 0.06 | Seq Scan | — |
| seed_lots filtered by stage / "seed class" (idx_seed_lots_stage) | 0.03 | 0.06 | Seq Scan | — |
| seed_lots production_date range (idx_seed_lots_production_date, new in 033) | 0.03 | 0.12 | Seq Scan | — |
| seed_lots variety substring search (idx_seed_lots_variety_trgm, new in 033 — 'varietyId' equivalent) | 1.53 | 0.53 | Seq Scan | — |
| seed_lots search: crop + min available quantity + pagination (seedLotSearch.service.ts shape) | 0.10 | 0.10 | Index Scan | idx_seed_lots_created_at |

## Note on "Seq Scan" rows (4 of 6)

At 20k rows, Postgres's cost-based planner correctly prefers a sequential scan over several of the new indexes — this dataset is genuinely small enough (a few dozen 8KB pages) that scanning it all is cheaper than an index lookup plus random heap fetches, especially under a LIMIT that lets the scan stop early. This is expected, correct planner behavior, not a sign the index is missing or broken: forcing `SET enable_seqscan = off` confirms both `idx_seed_lots_variety_trgm` (a Bitmap Index Scan matching the ILIKE pattern) and `idx_seed_lots_production_date` (a plain Index Scan on the range) work correctly and are picked up automatically once the table grows large enough — or the filter narrow enough — for the planner's cost model to prefer them, with no code or migration changes needed.
