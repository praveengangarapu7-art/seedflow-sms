import type { AuthenticatedUser } from '../middleware/requireAuth';
import { recordLotFieldInspection } from '../modules/feedbackLoop/feedbackLoop.service';
import { createFarmer } from '../modules/farmers/farmers.service';
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
  const result = await pool.query('SELECT 1 FROM lot_field_inspections LIMIT 1');
  return result.rows.length > 0;
}

async function run(): Promise<void> {
  if (await alreadySeeded()) {
    console.log('Feedback loop demo data already present — skipping.');
    await pool.end();
    return;
  }

  const inspector = await userFor('inspector@seedsphere.com');

  const existingFarmersResult = await pool.query('SELECT id, region FROM farmers');
  let farmers = existingFarmersResult.rows;
  if (farmers.length < 3) {
    const demoFarmers = [
      { name: 'Ravi Kumar', region: 'Guntur', location: 'Guntur, Andhra Pradesh', email: 'ravi.kumar@farmers.seedsphere.com' },
      { name: 'Sita Devi', region: 'Nashik', location: 'Nashik, Maharashtra', email: 'sita.devi@farmers.seedsphere.com' },
      { name: 'Arjun Singh', region: 'Warangal', location: 'Warangal, Telangana', email: 'arjun.singh@farmers.seedsphere.com' },
    ];
    for (const demo of demoFarmers) {
      const created = await createFarmer(demo, inspector);
      farmers.push({ id: created.id, region: created.region });
    }
    console.log(`created ${demoFarmers.length} demo farmers`);
  }

  const inspections: Array<[string, number, boolean, string | undefined, number]> = [
    ['SL-GEN-CERT-01', 88, false, undefined, 0],
    ['SL-GEN-CERT-01', 82, false, undefined, 1],
    ['SL-GEN-CERT-02', 65, true, 'Bacterial Leaf Blight', 2],
    ['SL-GEN-CERT-02', 58, true, 'Bacterial Leaf Blight', 0],
    ['SL-GEN-CERT-03', 91, false, undefined, 1],
    ['SL-GEN-CERT-03', 85, false, undefined, 2],
    ['SL-GEN-CERT-04', 45, true, 'Stem Rot', 0],
  ];

  const today = new Date();
  for (const [lotCode, healthScore, diseaseDetected, diseaseName, farmerIndex] of inspections) {
    const seedLotId = await lotIdFor(lotCode);
    if (!seedLotId) {
      console.log(`skip inspection for ${lotCode} — lot not found (run "npm run seed:genealogy" first)`);
      continue;
    }
    const farmer = farmers[farmerIndex % farmers.length];
    await recordLotFieldInspection(
      {
        seedLotId,
        farmerId: farmer.id,
        healthScore,
        diseaseDetected,
        diseaseName,
        inspectionDate: today.toISOString().slice(0, 10),
      },
      inspector,
    );
    console.log(`recorded inspection for ${lotCode}: health ${healthScore}, disease ${diseaseDetected ? diseaseName : 'none'}`);
  }

  console.log('Feedback loop demo data created.');
  await pool.end();
}

run().catch((error) => {
  console.error('[seedFeedbackLoop] failed:', error);
  return pool.end().finally(() => process.exit(1));
});
