import type { AuthenticatedUser } from '../middleware/requireAuth';
import { createFarmer, listFarmers } from '../modules/farmers/farmers.service';
import { submitRating } from '../modules/performanceRatings/performanceRatings.service';
import {
  approveRequest,
  createSeedRequest,
  fulfillRequest,
  markDelivered,
} from '../modules/seedRequests/seedRequests.service';
import { pool } from './pool';

async function userFor(email: string): Promise<AuthenticatedUser> {
  const result = await pool.query('SELECT id, email, role, organization_id FROM users WHERE email = $1', [email]);
  const row = result.rows[0];
  if (!row) throw new Error(`Seed user ${email} not found — run "npm run seed:auth" first`);
  return { id: row.id, email: row.email, role: row.role, organizationId: row.organization_id };
}

async function lotIdFor(lotCode: string): Promise<string> {
  const result = await pool.query('SELECT id FROM seed_lots WHERE lot_code = $1', [lotCode]);
  const id = result.rows[0]?.id;
  if (!id) throw new Error(`Seed lot ${lotCode} not found — run "npm run seed:genealogy" first`);
  return id;
}

async function run(): Promise<void> {
  if ((await listFarmers({})).length > 0) {
    console.log('Farmer program demo data already present — skipping.');
    await pool.end();
    return;
  }

  const producer = await userFor('producer@seedsphere.com');
  const warehouse = await userFor('warehouse@seedsphere.com');
  const inspector = await userFor('inspector@seedsphere.com');

  const farmerSeeds = [
    { name: 'Ramu Naidu', region: 'Guntur', location: 'Guntur, Andhra Pradesh', phone: '9876543210', email: 'ramu.naidu@farmers.seedsphere.com' },
    { name: 'Suresh Reddy', region: 'Warangal', location: 'Warangal, Telangana', phone: '9876543211', email: 'suresh.reddy@farmers.seedsphere.com' },
    { name: 'Kavita Devi', region: 'Nashik', location: 'Nashik, Maharashtra', phone: '9876543212', email: 'kavita.devi@farmers.seedsphere.com' },
    { name: 'Manoj Yadav', region: 'Kanpur', location: 'Kanpur, Uttar Pradesh', phone: '9876543213', email: 'manoj.yadav@farmers.seedsphere.com' },
    { name: 'Lakshmi Iyer', region: 'Coimbatore', location: 'Coimbatore, Tamil Nadu', phone: '9876543214', email: 'lakshmi.iyer@farmers.seedsphere.com' },
  ];

  const farmers = [];
  for (const seed of farmerSeeds) {
    const farmer = await createFarmer({ ...seed, organizationId: producer.organizationId ?? undefined }, producer);
    farmers.push(farmer);
    console.log(`created farmer ${farmer.name} (${farmer.region})`);
  }

  const [ramu, suresh, kavita, manoj] = farmers;
  const cert01Id = await lotIdFor('SL-GEN-CERT-01');
  const cert02Id = await lotIdFor('SL-GEN-CERT-02');

  // Ramu: requests Paddy-1010 twice across two seasons, both delivered — a
  // repeat adopter. Rates it well both times.
  for (const lotId of [cert01Id, cert02Id]) {
    const request = await createSeedRequest({ farmerId: ramu.id, crop: 'Paddy', variety: 'Paddy-1010', quantity: 50 }, producer);
    await approveRequest(request.id, producer);
    await fulfillRequest(request.id, lotId, warehouse);
    await markDelivered(request.id, warehouse);
    await submitRating(
      {
        farmerId: ramu.id,
        seedRequestId: request.id,
        crop: 'Paddy',
        variety: 'Paddy-1010',
        germinationRating: 5,
        yieldRating: 4,
        overallRating: 5,
        harvestedQuantity: 1800,
        feedbackText: 'Strong germination, good tillering.',
      },
      inspector,
    );
  }
  console.log('Ramu Naidu: 2 delivered Paddy-1010 requests, both rated (repeat adopter)');

  // Suresh: one delivered Paddy-1010 request, rated but less enthusiastically.
  const sureshRequest = await createSeedRequest(
    { farmerId: suresh.id, crop: 'Paddy', variety: 'Paddy-1010', quantity: 40 },
    producer,
  );
  await approveRequest(sureshRequest.id, producer);
  await fulfillRequest(sureshRequest.id, cert01Id, warehouse);
  await markDelivered(sureshRequest.id, warehouse);
  await submitRating(
    {
      farmerId: suresh.id,
      seedRequestId: sureshRequest.id,
      crop: 'Paddy',
      variety: 'Paddy-1010',
      germinationRating: 3,
      yieldRating: 3,
      overallRating: 3,
      harvestedQuantity: 1200,
      feedbackText: 'Average yield, patchy germination in low-lying section.',
    },
    inspector,
  );
  console.log('Suresh Reddy: 1 delivered Paddy-1010 request, rated (no repeat)');

  // Kavita: delivered but never rated — tests the reporting-rate gap.
  const kavitaRequest = await createSeedRequest(
    { farmerId: kavita.id, crop: 'Paddy', variety: 'Paddy-1010', quantity: 30 },
    producer,
  );
  await approveRequest(kavitaRequest.id, producer);
  await fulfillRequest(kavitaRequest.id, cert02Id, warehouse);
  await markDelivered(kavitaRequest.id, warehouse);
  console.log('Kavita Devi: 1 delivered Paddy-1010 request, NOT rated (reporting gap)');

  // Manoj: requests Cotton-BT-5, which has zero Certified inventory — stays
  // pending, feeding the same gap the demand-planning module already found.
  const manojRequest = await createSeedRequest(
    { farmerId: manoj.id, crop: 'Cotton', variety: 'Cotton-BT-5', quantity: 60 },
    producer,
  );
  await approveRequest(manojRequest.id, producer);
  console.log('Manoj Yadav: 1 approved Cotton-BT-5 request, awaiting fulfillment (no inventory yet)');

  console.log('Farmer program demo data created.');
  await pool.end();
}

run().catch((error) => {
  console.error('[seedFarmerProgram] failed:', error);
  return pool.end().finally(() => process.exit(1));
});
