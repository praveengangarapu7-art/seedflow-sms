// Builds demo data through the real service layer (not raw INSERTs) so it
// exercises the same stage-progression trigger, ownership checks, and
// transactional allocation logic the API enforces for everyone else.
import type { AuthenticatedUser } from '../middleware/requireAuth';
import { allocate } from '../modules/allocations/allocations.service';
import { createSeedLot } from '../modules/seedLots/seedLots.service';
import { pool } from './pool';

async function userFor(email: string): Promise<AuthenticatedUser> {
  const result = await pool.query('SELECT id, email, role, organization_id FROM users WHERE email = $1', [email]);
  const row = result.rows[0];
  if (!row) throw new Error(`Seed user ${email} not found — run "npm run seed:auth" first`);
  return { id: row.id, email: row.email, role: row.role, organizationId: row.organization_id };
}

async function lotExists(lotCode: string): Promise<boolean> {
  const result = await pool.query('SELECT id FROM seed_lots WHERE lot_code = $1', [lotCode]);
  return result.rows.length > 0;
}

async function run(): Promise<void> {
  if (await lotExists('SL-GEN-BREEDER-01')) {
    console.log('Genealogy demo data already present — skipping.');
    await pool.end();
    return;
  }

  const breeder = await userFor('breeder@seedsphere.com');
  const warehouse = await userFor('warehouse@seedsphere.com');

  const breederLot = await createSeedLot(
    {
      lotCode: 'SL-GEN-BREEDER-01',
      crop: 'Paddy',
      variety: 'Paddy-1010',
      quantityTotal: 10000,
      stage: 'Breeder',
      notes: 'Original breeder nucleus seed.',
    },
    breeder,
  );
  console.log(`created ${breederLot.lot_code} (${breederLot.stage})`);

  const foundation1 = await createSeedLot(
    { lotCode: 'SL-GEN-FOUND-01', crop: 'Paddy', variety: 'Paddy-1010', parentLotId: breederLot.id, quantityTotal: 3000 },
    breeder,
  );
  const foundation2 = await createSeedLot(
    { lotCode: 'SL-GEN-FOUND-02', crop: 'Paddy', variety: 'Paddy-1010', parentLotId: breederLot.id, quantityTotal: 2500 },
    breeder,
  );
  console.log(`created ${foundation1.lot_code} (${foundation1.stage}), ${foundation2.lot_code} (${foundation2.stage})`);

  await allocate(
    breederLot.id,
    { quantity: 3000, allocatedTo: 'foundation-multiplication-block-1', cropPlanId: 'CP-2026-001', notes: 'Multiplication feeding SL-GEN-FOUND-01' },
    breeder,
  );
  await allocate(
    breederLot.id,
    { quantity: 2500, allocatedTo: 'foundation-multiplication-block-2', cropPlanId: 'CP-2026-003', notes: 'Multiplication feeding SL-GEN-FOUND-02' },
    breeder,
  );

  const certified1 = await createSeedLot(
    { lotCode: 'SL-GEN-CERT-01', crop: 'Paddy', variety: 'Paddy-1010', parentLotId: foundation1.id, quantityTotal: 1200 },
    breeder,
  );
  const certified2 = await createSeedLot(
    { lotCode: 'SL-GEN-CERT-02', crop: 'Paddy', variety: 'Paddy-1010', parentLotId: foundation1.id, quantityTotal: 900 },
    breeder,
  );
  const certified3 = await createSeedLot(
    { lotCode: 'SL-GEN-CERT-03', crop: 'Paddy', variety: 'Paddy-1010', parentLotId: foundation2.id, quantityTotal: 1000 },
    breeder,
  );
  const certified4 = await createSeedLot(
    { lotCode: 'SL-GEN-CERT-04', crop: 'Paddy', variety: 'Paddy-1010', parentLotId: foundation2.id, quantityTotal: 800 },
    breeder,
  );
  console.log(`created ${certified1.lot_code}, ${certified2.lot_code}, ${certified3.lot_code}, ${certified4.lot_code} (all Certified)`);

  await allocate(foundation1.id, { quantity: 1200, allocatedTo: 'certified-multiplication-block-A', cropPlanId: 'CP-2026-001' }, breeder);
  await allocate(foundation1.id, { quantity: 900, allocatedTo: 'certified-multiplication-block-B', cropPlanId: 'CP-2026-002' }, breeder);
  await allocate(foundation2.id, { quantity: 1000, allocatedTo: 'certified-multiplication-block-C', cropPlanId: 'CP-2026-003' }, breeder);
  await allocate(foundation2.id, { quantity: 800, allocatedTo: 'certified-multiplication-block-D', cropPlanId: 'CP-2026-004' }, breeder);

  // Farm-level allocations, performed by the org-agnostic Warehouse Manager role.
  await allocate(certified1.id, { quantity: 400, allocatedTo: 'farm-1', cropPlanId: 'CP-2026-001' }, warehouse);
  await allocate(certified1.id, { quantity: 300, allocatedTo: 'farm-2', cropPlanId: 'CP-2026-001' }, warehouse);
  await allocate(certified2.id, { quantity: 500, allocatedTo: 'farm-3', cropPlanId: 'CP-2026-002' }, warehouse);
  await allocate(certified3.id, { quantity: 600, allocatedTo: 'farm-4', cropPlanId: 'CP-2026-003' }, warehouse);
  await allocate(certified4.id, { quantity: 350, allocatedTo: 'farm-5', cropPlanId: 'CP-2026-004' }, warehouse);

  console.log('Genealogy demo chain created: 1 Breeder -> 2 Foundation -> 4 Certified, with allocations at every stage.');
  await pool.end();
}

run().catch((error) => {
  console.error('[seedGenealogy] failed:', error);
  return pool.end().finally(() => process.exit(1));
});
