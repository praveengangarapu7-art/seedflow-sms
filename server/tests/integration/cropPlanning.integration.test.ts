import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { pool } from '../../src/db/pool';
import { createTestFarmer, createTestOrganization, createTestSeedLot, createTestUser, createTestVariety } from '../factories';
import { uniqueSuffix } from '../factories/ids';
import { loginAs } from './authHelper';
import { app } from './testApp';

async function createTestFarm(
  farmerId: string,
  overrides: { name?: string; soilType?: string; areaAcres?: number } = {},
) {
  const suffix = uniqueSuffix();
  const result = await pool.query<{ id: string }>(
    `INSERT INTO farms (farmer_id, name, soil_type, area_acres) VALUES ($1, $2, $3, $4) RETURNING id`,
    [farmerId, overrides.name ?? `Test Farm ${suffix}`, overrides.soilType ?? 'loamy', overrides.areaAcres ?? 5],
  );
  return result.rows[0].id;
}

async function markCertified(seedLotId: string, generatedBy: string) {
  await pool.query(
    `INSERT INTO quality_certificates (seed_lot_id, version, status, snapshot, generated_by) VALUES ($1, 1, 'issued', '{}'::jsonb, $2)`,
    [seedLotId, generatedBy],
  );
}

async function recordGermination(seedLotId: string, labOrgId: string, percent: number, recordedBy: string) {
  const submission = await pool.query<{ id: string }>(
    `INSERT INTO lab_test_submissions (seed_lot_id, lab_organization_id, requested_tests, sample_quantity, status, submitted_by, expected_completion_date)
     VALUES ($1, $2, '["germination"]'::jsonb, 50, 'completed', $3, CURRENT_DATE)
     RETURNING id`,
    [seedLotId, labOrgId, recordedBy],
  );
  await pool.query(
    `INSERT INTO lab_test_results (submission_id, test_type, metrics, result_value, threshold_used, passed, recorded_by)
     VALUES ($1, 'germination', '{}'::jsonb, $2, 80, $3, $4)`,
    [submission.rows[0].id, percent, percent >= 80, recordedBy],
  );
}

async function assignStorage(seedLotId: string, orgId: string, warehouseZone: string) {
  const suffix = uniqueSuffix();
  const location = await pool.query<{ id: string }>(
    `INSERT INTO storage_locations (organization_id, code, warehouse_zone, capacity_units, target_temperature_c, target_humidity_percent)
     VALUES ($1, $2, $3, 500, 20, 50) RETURNING id`,
    [orgId, `LOC-${suffix}`, warehouseZone],
  );
  const batch = await pool.query<{ id: string }>(
    `INSERT INTO packaging_batches (batch_code, seed_lot_id, unit_size, unit_count, unit_of_measure, total_quantity, storage_conditions, shelf_life_months, packaged_by)
     VALUES ($1, $2, 25, 4, 'kg', 100, 'Cool, dry place', 12, 'test-factory@example.com')
     RETURNING id`,
    [`BATCH-${suffix}`, seedLotId],
  );
  await pool.query(
    `INSERT INTO storage_assignments (packaging_batch_id, storage_location_id, status, performed_by)
     VALUES ($1, $2, 'active', 'test-factory@example.com')`,
    [batch.rows[0].id, location.rows[0].id],
  );
}

describe('crop planning wizard with seed recommendations API', () => {
  it('creates a farm, drafts a plan, and recommends seed lots ranked by certification, germination %, quantity, and storage proximity', async () => {
    const admin = await createTestUser({ role: 'Admin' });
    const token = await loginAs(admin);
    const suffix = uniqueSuffix();
    const farmer = await createTestFarmer({ region: `Region-${suffix}` });
    const farmId = await createTestFarm(farmer.id);
    const org = await createTestOrganization({ type: 'laboratory' });
    const warehouseOrg = await createTestOrganization({ type: 'warehouse' });
    await pool.query(`UPDATE organizations SET location = $1 WHERE id = $2`, [farmer.region, warehouseOrg.id]);

    const crop = `Rice-${suffix}`;
    const variety = await createTestVariety({ crop, agroClimaticSuitability: [farmer.region] });

    // Weaker candidate: not certified, no germination test, no storage assignment.
    const weakLot = await createTestSeedLot({ crop, variety: variety.variety_name, quantityTotal: 1000, quantityAllocated: 0 });
    // Strongest candidate: certified, high germination, stored in the farmer's own region.
    const strongLot = await createTestSeedLot({ crop, variety: variety.variety_name, quantityTotal: 1000, quantityAllocated: 0 });
    await markCertified(strongLot.id, admin.email);
    await recordGermination(strongLot.id, org.id, 95, admin.email);
    await assignStorage(strongLot.id, warehouseOrg.id, `Zone-${suffix}`);

    const farmRes = await request(app)
      .post('/api/v1/production/crop-planning/farms')
      .set('Authorization', `Bearer ${token}`)
      .send({ farmerId: farmer.id, name: `Ignored ${suffix}`, soilType: 'loamy', areaAcres: 3 });
    expect(farmRes.status).toBe(201);

    const draftRes = await request(app)
      .post('/api/v1/production/crop-planning/plans')
      .set('Authorization', `Bearer ${token}`)
      .send({ farmerId: farmer.id, farmId, crop, varietyId: variety.id, targetAreaAcres: 2 });
    expect(draftRes.status).toBe(201);
    expect(draftRes.body.data.status).toBe('draft');
    const planId = draftRes.body.data.id;

    const recoRes = await request(app)
      .get(`/api/v1/production/crop-planning/plans/${planId}/seed-lot-recommendations`)
      .set('Authorization', `Bearer ${token}`);
    expect(recoRes.status).toBe(200);
    const recos = recoRes.body.data;
    expect(recos.length).toBeGreaterThanOrEqual(2);

    const strong = recos.find((r: { seedLotId: string }) => r.seedLotId === strongLot.id);
    const weak = recos.find((r: { seedLotId: string }) => r.seedLotId === weakLot.id);
    expect(strong).toBeDefined();
    expect(weak).toBeDefined();
    expect(strong.isCertified).toBe(true);
    expect(strong.germinationPercent).toBe(95);
    expect(weak.isCertified).toBe(false);
    expect(weak.germinationPercent).toBeNull();
    expect(strong.score).toBeGreaterThan(weak.score);
    // The highest-scoring lot should be recommendation #1.
    expect(recos[0].seedLotId).toBe(strongLot.id);
  });

  it('reserves the chosen lot from the wizard (real, live allocation) and lets the booking be confirmed', async () => {
    const admin = await createTestUser({ role: 'Admin' });
    const token = await loginAs(admin);
    const suffix = uniqueSuffix();
    const farmer = await createTestFarmer();
    const farmId = await createTestFarm(farmer.id);
    const crop = `Wheat-${suffix}`;
    const variety = await createTestVariety({ crop });
    const lot = await createTestSeedLot({ crop, variety: variety.variety_name, quantityTotal: 500, quantityAllocated: 0 });

    const draftRes = await request(app)
      .post('/api/v1/production/crop-planning/plans')
      .set('Authorization', `Bearer ${token}`)
      .send({ farmerId: farmer.id, farmId, crop, varietyId: variety.id, targetAreaAcres: 1 });
    const planId = draftRes.body.data.id;
    const requiredQuantity = Number(draftRes.body.data.calculated_seed_quantity);

    const reserveRes = await request(app)
      .post(`/api/v1/production/crop-planning/plans/${planId}/reserve`)
      .set('Authorization', `Bearer ${token}`)
      .send({ seedLotId: lot.id });
    expect(reserveRes.status).toBe(200);
    expect(reserveRes.body.data.status).toBe('reserved');
    expect(reserveRes.body.data.seed_lot_id).toBe(lot.id);
    expect(reserveRes.body.data.allocation_id).toBeTruthy();

    // The reservation is a real, live decrement of the seed lot's available quantity —
    // not a soft hold — via the same allocations.allocate() every other allocation uses.
    const lotAfter = await pool.query('SELECT quantity_allocated FROM seed_lots WHERE id = $1', [lot.id]);
    expect(Number(lotAfter.rows[0].quantity_allocated)).toBe(requiredQuantity);

    const confirmRes = await request(app)
      .post(`/api/v1/production/crop-planning/plans/${planId}/confirm`)
      .set('Authorization', `Bearer ${token}`);
    expect(confirmRes.status).toBe(200);
    expect(confirmRes.body.data.status).toBe('confirmed');
  });

  it('releases the allocation when a reserved plan is cancelled', async () => {
    const admin = await createTestUser({ role: 'Admin' });
    const token = await loginAs(admin);
    const suffix = uniqueSuffix();
    const farmer = await createTestFarmer();
    const farmId = await createTestFarm(farmer.id);
    const crop = `Maize-${suffix}`;
    const variety = await createTestVariety({ crop });
    const lot = await createTestSeedLot({ crop, variety: variety.variety_name, quantityTotal: 500, quantityAllocated: 0 });

    const draftRes = await request(app)
      .post('/api/v1/production/crop-planning/plans')
      .set('Authorization', `Bearer ${token}`)
      .send({ farmerId: farmer.id, farmId, crop, varietyId: variety.id, targetAreaAcres: 1 });
    const planId = draftRes.body.data.id;

    await request(app)
      .post(`/api/v1/production/crop-planning/plans/${planId}/reserve`)
      .set('Authorization', `Bearer ${token}`)
      .send({ seedLotId: lot.id });

    const cancelRes = await request(app)
      .post(`/api/v1/production/crop-planning/plans/${planId}/cancel`)
      .set('Authorization', `Bearer ${token}`)
      .send({ reason: 'Farmer changed their mind' });
    expect(cancelRes.status).toBe(200);
    expect(cancelRes.body.data.status).toBe('cancelled');

    const lotAfter = await pool.query('SELECT quantity_allocated FROM seed_lots WHERE id = $1', [lot.id]);
    expect(Number(lotAfter.rows[0].quantity_allocated)).toBe(0);
  });

  it('requires Admin/Warehouse Manager to reserve a seed lot, rejecting Producer', async () => {
    const producer = await createTestUser({ role: 'Producer' });
    const admin = await createTestUser({ role: 'Admin' });
    const producerToken = await loginAs(producer);
    const adminToken = await loginAs(admin);
    const suffix = uniqueSuffix();
    const farmer = await createTestFarmer();
    const farmId = await createTestFarm(farmer.id);
    const crop = `Barley-${suffix}`;
    const variety = await createTestVariety({ crop });
    const lot = await createTestSeedLot({ crop, variety: variety.variety_name, quantityTotal: 500, quantityAllocated: 0 });

    const draftRes = await request(app)
      .post('/api/v1/production/crop-planning/plans')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ farmerId: farmer.id, farmId, crop, varietyId: variety.id, targetAreaAcres: 1 });
    const planId = draftRes.body.data.id;

    const reserveRes = await request(app)
      .post(`/api/v1/production/crop-planning/plans/${planId}/reserve`)
      .set('Authorization', `Bearer ${producerToken}`)
      .send({ seedLotId: lot.id });
    expect(reserveRes.status).toBe(403);
  });
});
