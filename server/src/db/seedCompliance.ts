import type { AuthenticatedUser } from '../middleware/requireAuth';
import {
  generateCertificate,
  recordPhytosanitaryCertificate,
  recordPurityTest,
  recordViabilityTest,
  signCertificate,
} from '../modules/compliance/compliance.service';
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
  const result = await pool.query('SELECT 1 FROM purity_tests LIMIT 1');
  return result.rows.length > 0;
}

async function run(): Promise<void> {
  if (await alreadySeeded()) {
    console.log('Compliance demo data already present — skipping.');
    await pool.end();
    return;
  }

  const inspector = await userFor('inspector@seedsphere.com');

  const purityByLot: Array<[string, number, number]> = [
    ['SL-GEN-BREEDER-01', 500, 495],
    ['SL-GEN-FOUND-01', 500, 491],
    ['SL-GEN-FOUND-02', 500, 488],
    ['SL-GEN-CERT-01', 500, 480],
    ['SL-GEN-CERT-02', 500, 476],
    ['SL-GEN-CERT-03', 500, 483],
    ['SL-GEN-CERT-04', 500, 470],
  ];
  for (const [lotCode, sampleWeight, pureSeedWeight] of purityByLot) {
    const lotId = await lotIdFor(lotCode);
    if (!lotId) {
      console.log(`skip purity test for ${lotCode} — lot not found (run "npm run seed:genealogy" first)`);
      continue;
    }
    await recordPurityTest({ seedLotId: lotId, sampleWeight, pureSeedWeight }, inspector);
    console.log(`recorded purity test for ${lotCode}: ${pureSeedWeight}/${sampleWeight}`);
  }

  const viabilityByLot: Array<[string, number, number]> = [
    ['SL-GEN-BREEDER-01', 400, 390],
    ['SL-GEN-FOUND-01', 400, 380],
    ['SL-GEN-FOUND-02', 400, 375],
    ['SL-GEN-CERT-01', 400, 360],
    ['SL-GEN-CERT-02', 400, 355],
    ['SL-GEN-CERT-03', 400, 365],
    ['SL-GEN-CERT-04', 400, 345],
  ];
  for (const [lotCode, sampleSize, viableCount] of viabilityByLot) {
    const lotId = await lotIdFor(lotCode);
    if (!lotId) continue;
    await recordViabilityTest({ seedLotId: lotId, sampleSize, viableCount }, inspector);
    console.log(`recorded viability test for ${lotCode}: ${viableCount}/${sampleSize}`);
  }

  const phytosanitaryByLot: Array<[string, string]> = [
    ['SL-GEN-CERT-01', 'PSC-2026-0001'],
    ['SL-GEN-CERT-02', 'PSC-2026-0002'],
    ['SL-GEN-CERT-03', 'PSC-2026-0003'],
    ['SL-GEN-CERT-04', 'PSC-2026-0004'],
  ];
  for (const [lotCode, certificateNumber] of phytosanitaryByLot) {
    const lotId = await lotIdFor(lotCode);
    if (!lotId) continue;
    await recordPhytosanitaryCertificate(
      {
        seedLotId: lotId,
        certificateNumber,
        issuingAuthority: 'State Plant Quarantine Authority',
        issueDate: '2026-07-01',
        expiryDate: '2027-07-01',
      },
      inspector,
    );
    console.log(`recorded phytosanitary certificate ${certificateNumber} for ${lotCode}`);
  }

  // Generate and sign a v1 quality certificate for the Certified lots so
  // the version-control flow has real issued history, not just drafts.
  for (const lotCode of ['SL-GEN-CERT-01', 'SL-GEN-CERT-02']) {
    const lotId = await lotIdFor(lotCode);
    if (!lotId) continue;
    const draft = await generateCertificate(lotId, inspector);
    const signed = await signCertificate(draft.id, inspector);
    console.log(`generated + signed certificate v${signed.version} for ${lotCode} (${signed.status})`);
  }

  console.log('Compliance demo data created.');
  await pool.end();
}

run().catch((error) => {
  console.error('[seedCompliance] failed:', error);
  return pool.end().finally(() => process.exit(1));
});
