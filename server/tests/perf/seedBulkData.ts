import { pool } from '../../src/db/pool';
import { createTestOrganization } from '../factories';

const CROPS = ['Paddy', 'Maize', 'Cotton', 'Groundnut', 'Tomato'];
const STAGES = ['Breeder', 'Foundation', 'Certified'];
const PERF_MARKER = 'PERF-LOAD';

/**
 * Bulk-inserts seed lots directly via multi-row INSERT (not one-row-at-a-
 * time, and not through seedLots.service — the point here is populating a
 * large dataset fast, not exercising business logic). Idempotent: skips
 * straight to the existing count if a previous run already seeded enough,
 * so repeated `npm run test:perf` calls don't keep growing the test DB.
 */
async function findOrCreatePerfOrganization(): Promise<{ id: string }> {
  const existingOrg = await pool.query<{ id: string }>(
    'SELECT id FROM organizations WHERE name = $1 ORDER BY created_at ASC LIMIT 1',
    [`${PERF_MARKER} Org`],
  );
  if (existingOrg.rows[0]) return existingOrg.rows[0];
  return createTestOrganization({ name: `${PERF_MARKER} Org`, type: 'breeder' });
}

export async function ensureBulkSeedLots(targetCount: number): Promise<{ organizationId: string; count: number }> {
  // Reused across runs (not a fresh org each time) — lot_code is globally
  // unique across the whole table, so re-creating the org and restarting
  // the per-org sequence count from 0 would immediately collide with the
  // previous run's rows still sitting under the old org id.
  const org = await findOrCreatePerfOrganization();

  const existing = await pool.query<{ count: string }>(
    `SELECT COUNT(*)::int AS count FROM seed_lots WHERE organization_id = $1`,
    [org.id],
  );
  const currentCount = Number(existing.rows[0].count);
  if (currentCount >= targetCount) {
    return { organizationId: org.id, count: currentCount };
  }

  const remaining = targetCount - currentCount;
  const BATCH_SIZE = 1000;
  let inserted = 0;

  while (inserted < remaining) {
    const batchSize = Math.min(BATCH_SIZE, remaining - inserted);
    const values: string[] = [];
    const params: unknown[] = [];

    for (let i = 0; i < batchSize; i += 1) {
      const seq = currentCount + inserted + i;
      const crop = CROPS[seq % CROPS.length];
      const stage = STAGES[seq % STAGES.length];
      const base = params.length;
      values.push(
        `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}, $${base + 7}, 'active', $${base + 8}, 100)`,
      );
      params.push(
        `SL-${PERF_MARKER}-${seq}`,
        crop,
        `${crop}Variety-${seq % 50}`,
        stage,
        1000 + (seq % 500),
        (seq % 3) * 100,
        'kg',
        org.id,
      );
    }

    await pool.query(
      `INSERT INTO seed_lots (lot_code, crop, variety, stage, quantity_total, quantity_allocated, unit, status, organization_id, low_stock_threshold)
       VALUES ${values.join(', ')}`,
      params,
    );
    inserted += batchSize;
  }

  return { organizationId: org.id, count: targetCount };
}
