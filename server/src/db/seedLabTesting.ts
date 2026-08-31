import type { AuthenticatedUser } from '../middleware/requireAuth';
import {
  generatePhytosanitaryCertificateForSubmission,
  recordTestResult,
  resolveQualityFlag,
  submitSampleBatch,
} from '../modules/labTesting/labTesting.service';
import type { TestType } from '../modules/labTesting/labTesting.types';
import { pool } from './pool';

/**
 * Laboratory module demo data.
 *
 * Everything goes through the real labTesting service functions rather than
 * raw INSERTs, exactly like seedStorage.ts does for the storage module — so
 * the seeded rows get the same validation, audit-log entries, seed-lot
 * testing_status transitions and quality-flag side effects that a real user
 * action would produce. Seeding by INSERT would produce data that *looks*
 * right but has no audit trail and leaves seed_lots.testing_status stale.
 */

async function userFor(email: string): Promise<AuthenticatedUser> {
  const result = await pool.query('SELECT id, email, role, organization_id FROM users WHERE email = $1', [email]);
  const row = result.rows[0];
  if (!row) throw new Error(`Seed user ${email} not found — run "npm run seed:auth" first`);
  return { id: row.id, email: row.email, role: row.role, organizationId: row.organization_id };
}

async function upsertLabOrganization(name: string, location: string, certificationType: string): Promise<string> {
  const existing = await pool.query('SELECT id FROM organizations WHERE name = $1', [name]);
  if (existing.rows[0]) return existing.rows[0].id;
  const result = await pool.query(
    `INSERT INTO organizations (name, type, location, contact_person, certification_type)
     VALUES ($1, 'laboratory', $2, $3, $4) RETURNING id`,
    [name, location, `${name.split(' ')[0]} Lab Desk`, certificationType],
  );
  console.log(`created laboratory organization: ${name}`);
  return result.rows[0].id;
}

async function alreadySeeded(): Promise<boolean> {
  const result = await pool.query('SELECT 1 FROM lab_test_submissions LIMIT 1');
  return result.rows.length > 0;
}

function daysFromNow(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

async function run(): Promise<void> {
  if (await alreadySeeded()) {
    console.log('Laboratory demo data already present — skipping.');
    await pool.end();
    return;
  }

  const admin = await userFor('admin@seedsphere.com');
  const inspector = await userFor('inspector@seedsphere.com');

  const nationalLab = await upsertLabOrganization('National Seed Testing Laboratory', 'Hyderabad', 'ISTA Accredited');
  const regionalLab = await upsertLabOrganization('Regional Seed Quality Lab', 'Pune', 'State Accredited');
  const privateLab = await upsertLabOrganization('AgriCert Analytics', 'Bengaluru', 'Private Accredited');

  // Only Certified/active lots are realistic candidates for certification
  // testing — the same filter the rest of the app uses when picking lots.
  const lotsResult = await pool.query<{ id: string; lot_code: string }>(
    `SELECT id, lot_code FROM seed_lots WHERE status = 'active' ORDER BY created_at ASC LIMIT 8`,
  );
  const lots = lotsResult.rows;
  if (lots.length === 0) {
    console.log('No active seed lots found — run "npm run seed" first so there are lots to test.');
    await pool.end();
    return;
  }

  const labs = [nationalLab, regionalLab, privateLab];
  const allTests: TestType[] = ['germination', 'purity', 'vigor'];

  let created = 0;

  // 1. A fully passing submission per lab — becomes "completed", flips its
  //    lot to testing_status='certified', and gets a certificate issued.
  for (const [index, labId] of labs.entries()) {
    const lot = lots[index % lots.length];
    if (!lot) break;
    try {
      const submission = await submitSampleBatch(
        {
          seedLotId: lot.id,
          labOrganizationId: labId,
          requestedTests: allTests,
          sampleQuantity: 250,
          expectedCompletionDate: daysFromNow(-2 + index),
        },
        admin,
      );
      await recordTestResult(submission.id, { testType: 'germination', metrics: { sampleSize: 400, germinatedCount: 372 }, notes: 'Standard ISTA top-of-paper method.' }, inspector);
      await recordTestResult(submission.id, { testType: 'purity', metrics: { sampleWeight: 120, pureSeedWeight: 119 } }, inspector);
      await recordTestResult(submission.id, { testType: 'vigor', metrics: { sampleSize: 400, vigorCount: 330 } }, inspector);
      await generatePhytosanitaryCertificateForSubmission(submission.id, {}, admin);
      created += 1;
      console.log(`completed + certified submission for ${lot.lot_code}`);
    } catch (error) {
      console.log(`skip passing submission for ${lot.lot_code}: ${(error as Error).message}`);
    }
  }

  // 2. A failing submission — germination below the 85% threshold, which
  //    raises a quality flag automatically and marks the lot 'rejected'.
  const failingLot = lots[3] ?? lots[0];
  if (failingLot) {
    try {
      const submission = await submitSampleBatch(
        { seedLotId: failingLot.id, labOrganizationId: regionalLab, requestedTests: ['germination', 'purity'], sampleQuantity: 200, expectedCompletionDate: daysFromNow(-1) },
        admin,
      );
      await recordTestResult(submission.id, { testType: 'germination', metrics: { sampleSize: 400, germinatedCount: 280 }, notes: 'Weak radicle development observed across replicates.' }, inspector);
      await recordTestResult(submission.id, { testType: 'purity', metrics: { sampleWeight: 100, pureSeedWeight: 99 } }, inspector);
      created += 1;
      console.log(`failed submission (quality flag raised) for ${failingLot.lot_code}`);
    } catch (error) {
      console.log(`skip failing submission: ${(error as Error).message}`);
    }
  }

  // 3. A partially-complete submission — one result in, so it sits at
  //    'in_progress' and shows a half-filled progress bar in the UI.
  const inProgressLot = lots[4] ?? lots[1] ?? lots[0];
  if (inProgressLot) {
    try {
      const submission = await submitSampleBatch(
        { seedLotId: inProgressLot.id, labOrganizationId: nationalLab, requestedTests: allTests, sampleQuantity: 300, expectedCompletionDate: daysFromNow(6) },
        admin,
      );
      await recordTestResult(submission.id, { testType: 'purity', metrics: { sampleWeight: 150, pureSeedWeight: 148 } }, inspector);
      created += 1;
      console.log(`in-progress submission for ${inProgressLot.lot_code}`);
    } catch (error) {
      console.log(`skip in-progress submission: ${(error as Error).message}`);
    }
  }

  // 4. A freshly-submitted batch with no results yet, and one deliberately
  //    past its expected completion date so the "overdue" KPI is non-zero.
  const pendingLot = lots[5] ?? lots[2] ?? lots[0];
  if (pendingLot) {
    try {
      await submitSampleBatch(
        { seedLotId: pendingLot.id, labOrganizationId: privateLab, requestedTests: ['germination'], sampleQuantity: 150, expectedCompletionDate: daysFromNow(10) },
        admin,
      );
      created += 1;
      console.log(`pending submission for ${pendingLot.lot_code}`);
    } catch (error) {
      console.log(`skip pending submission: ${(error as Error).message}`);
    }
  }

  const overdueLot = lots[6] ?? lots[0];
  if (overdueLot) {
    try {
      await submitSampleBatch(
        { seedLotId: overdueLot.id, labOrganizationId: regionalLab, requestedTests: ['germination', 'vigor'], sampleQuantity: 180, expectedCompletionDate: daysFromNow(-5) },
        admin,
      );
      created += 1;
      console.log(`overdue submission for ${overdueLot.lot_code}`);
    } catch (error) {
      console.log(`skip overdue submission: ${(error as Error).message}`);
    }
  }

  // 5. Resolve one of the raised quality flags so the "Resolved" tab has
  //    real history rather than being permanently empty.
  const flagResult = await pool.query<{ id: string }>('SELECT id FROM lab_quality_flags WHERE resolved = false ORDER BY flagged_at ASC LIMIT 1');
  const flagId = flagResult.rows[0]?.id;
  if (flagId) {
    try {
      await resolveQualityFlag(flagId, 'Retest requested — original sample showed transit damage. Lot quarantined pending re-submission.', admin);
      console.log('resolved one quality flag for demo history');
    } catch (error) {
      console.log(`skip resolving flag: ${(error as Error).message}`);
    }
  }

  console.log(`Laboratory demo data applied — ${created} submission(s) across 3 partner laboratories.`);
}

run()
  .then(() => pool.end())
  .catch((error) => {
    console.error('[seedLabTesting] failed:', error);
    return pool.end().finally(() => process.exit(1));
  });
