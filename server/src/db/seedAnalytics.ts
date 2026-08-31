import type { AuthenticatedUser } from '../middleware/requireAuth';
import { recordGerminationTest, recordHarvestYield } from '../modules/analytics/analytics.service';
import { pool } from './pool';

async function userFor(email: string): Promise<AuthenticatedUser> {
  const result = await pool.query('SELECT id, email, role, organization_id FROM users WHERE email = $1', [email]);
  const row = result.rows[0];
  if (!row) throw new Error(`Seed user ${email} not found — run "npm run seed:auth" first`);
  return { id: row.id, email: row.email, role: row.role, organizationId: row.organization_id };
}

async function lotIdFor(lotCode: string): Promise<string | null> {
  const result = await pool.query('SELECT id FROM seed_lots WHERE lot_code = $1', [lotCode]);
  return result.rows[0]?.id ?? null;
}

async function alreadySeeded(): Promise<boolean> {
  const result = await pool.query("SELECT 1 FROM germination_tests LIMIT 1");
  return result.rows.length > 0;
}

async function run(): Promise<void> {
  if (await alreadySeeded()) {
    console.log('Analytics demo data already present — skipping.');
    await pool.end();
    return;
  }

  const breeder = await userFor('breeder@seedsphere.com');
  const inspector = await userFor('inspector@seedsphere.com');

  const germinationSamples: Array<[string, number, number]> = [
    ['SL-GEN-BREEDER-01', 400, 384],
    ['SL-GEN-FOUND-01', 400, 372],
    ['SL-GEN-FOUND-02', 400, 366],
    ['SL-GEN-CERT-01', 400, 348],
    ['SL-GEN-CERT-02', 400, 340],
    ['SL-GEN-CERT-03', 400, 356],
    ['SL-GEN-CERT-04', 400, 330],
  ];

  for (const [lotCode, sampleSize, germinatedCount] of germinationSamples) {
    const lotId = await lotIdFor(lotCode);
    if (!lotId) {
      console.log(`skip germination test for ${lotCode} — lot not found (run "npm run seed:genealogy" first)`);
      continue;
    }
    await recordGerminationTest({ seedLotId: lotId, sampleSize, germinatedCount }, inspector);
    console.log(`recorded germination test for ${lotCode}: ${germinatedCount}/${sampleSize}`);
  }

  const harvestRecords: Array<[string, string, number, number]> = [
    ['SL-GEN-CERT-01', 'CP-2026-001', 700, 3150],
    ['SL-GEN-CERT-02', 'CP-2026-002', 500, 2350],
    ['SL-GEN-CERT-03', 'CP-2026-003', 600, 2880],
    ['SL-GEN-CERT-04', 'CP-2026-004', 350, 1610],
  ];

  for (const [lotCode, cropPlanId, sownQuantity, harvestedQuantity] of harvestRecords) {
    const lotId = await lotIdFor(lotCode);
    if (!lotId) {
      console.log(`skip harvest yield for ${lotCode} — lot not found`);
      continue;
    }
    await recordHarvestYield({ seedLotId: lotId, cropPlanId, sownQuantity, harvestedQuantity }, breeder);
    console.log(`recorded harvest yield for ${lotCode}: ${harvestedQuantity}kg from ${sownQuantity}kg sown`);
  }

  console.log('Analytics demo data created.');
  await pool.end();
}

run().catch((error) => {
  console.error('[seedAnalytics] failed:', error);
  return pool.end().finally(() => process.exit(1));
});
