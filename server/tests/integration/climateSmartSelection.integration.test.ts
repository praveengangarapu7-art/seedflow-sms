import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { pool } from '../../src/db/pool';
import { createFarm } from '../../src/modules/cropPlanning/cropPlanning.service';
import { createTestFarmer, createTestSeedLot, createTestUser } from '../factories';
import { uniqueSuffix } from '../factories/ids';
import { loginAs } from './authHelper';
import { app } from './testApp';

async function createApprovedVariety(crop: string, region: string) {
  const varietyResult = await pool.query(
    `INSERT INTO varieties (crop, variety_name, botanical_name, status, created_by) VALUES ($1, $2, 'Test Botanica', 'approved', 'test') RETURNING id, variety_name`,
    [crop, `Variety-${uniqueSuffix()}`],
  );
  const variety = varietyResult.rows[0];
  await pool.query(
    `INSERT INTO variety_versions (variety_id, version, status, season, agro_climatic_suitability, yield_benchmark_per_acre, submitted_by)
     VALUES ($1, 1, 'issued', 'Kharif', $2::jsonb, 500, 'test')`,
    [variety.id, JSON.stringify([region])],
  );
  return variety;
}

async function createCropPlanFixture(farmerId: string, farmId: string, crop: string, varietyId: string) {
  await pool.query(
    `INSERT INTO crop_plans (farmer_id, farm_id, crop, variety_id, target_area_acres, calculated_seed_quantity, status, created_by)
     VALUES ($1, $2, $3, $4, 5, 100, 'confirmed', 'test')`,
    [farmerId, farmId, crop, varietyId],
  );
}

describe('climate-smart selection API', () => {
  it('records a climate prediction, blocks a non-Breeder/Admin role, and lists it back', async () => {
    const breeder = await createTestUser({ role: 'Breeder' });
    const breederToken = await loginAs(breeder);
    const region = `Region-${uniqueSuffix()}`;

    const res = await request(app)
      .post('/api/v1/production/climate-smart/predictions')
      .set('Authorization', `Bearer ${breederToken}`)
      .send({ region, season: 'Kharif', predictedRainfallMm: 400, predictedAvgTempCelsius: 32, source: 'State Met Dept' });
    expect(res.status).toBe(201);
    expect(res.body.data.risk_level).toBe('low'); // default

    const producer = await createTestUser({ role: 'Producer' });
    const producerToken = await loginAs(producer);
    const forbidden = await request(app)
      .post('/api/v1/production/climate-smart/predictions')
      .set('Authorization', `Bearer ${producerToken}`)
      .send({ region, season: 'Kharif', source: 'x' });
    expect(forbidden.status).toBe(403);

    const listRes = await request(app)
      .get(`/api/v1/production/climate-smart/predictions?region=${region}`)
      .set('Authorization', `Bearer ${breederToken}`);
    expect(listRes.status).toBe(200);
    expect(listRes.body.data).toHaveLength(1);
  });

  it('auto-generates climate risk alerts for farms with an active crop plan when a high/severe prediction is recorded, and supports acknowledgement', async () => {
    const breeder = await createTestUser({ role: 'Breeder' });
    const breederToken = await loginAs(breeder);
    const region = `Region-${uniqueSuffix()}`;
    const crop = `Crop-${uniqueSuffix()}`;

    const farmer = await createTestFarmer({ region });
    const farm = await createFarm({ farmerId: farmer.id, name: 'Alert Test Farm', soilType: 'loamy', areaAcres: 5 });
    const variety = await createApprovedVariety(crop, region);
    await createCropPlanFixture(farmer.id, farm.id, crop, variety.id);

    // A farmer in the SAME region with no active crop plan should not get an alert.
    const uninvolvedFarmer = await createTestFarmer({ region });
    await createFarm({ farmerId: uninvolvedFarmer.id, name: 'No Plan Farm', soilType: 'loamy', areaAcres: 3 });

    const predictRes = await request(app)
      .post('/api/v1/production/climate-smart/predictions')
      .set('Authorization', `Bearer ${breederToken}`)
      .send({ region, season: 'Kharif', riskLevel: 'severe', primaryRiskFactor: 'drought', predictedRainfallMm: 50, source: 'State Met Dept' });
    expect(predictRes.status).toBe(201);

    const alertsRes = await request(app)
      .get(`/api/v1/production/climate-smart/alerts?farmId=${farm.id}`)
      .set('Authorization', `Bearer ${breederToken}`);
    expect(alertsRes.status).toBe(200);
    expect(alertsRes.body.data).toHaveLength(1);
    expect(alertsRes.body.data[0].crop).toBe(crop);
    expect(alertsRes.body.data[0].acknowledged).toBe(false);
    expect(alertsRes.body.data[0].message).toMatch(/drought/);

    const ackRes = await request(app)
      .post(`/api/v1/production/climate-smart/alerts/${alertsRes.body.data[0].id}/acknowledge`)
      .set('Authorization', `Bearer ${breederToken}`);
    expect(ackRes.status).toBe(200);
    expect(ackRes.body.data.acknowledged).toBe(true);
    expect(ackRes.body.data.acknowledged_by).toBe(breeder.email);
  });

  it('does not raise alerts for a low-risk prediction', async () => {
    const breeder = await createTestUser({ role: 'Breeder' });
    const breederToken = await loginAs(breeder);
    const region = `Region-${uniqueSuffix()}`;
    const crop = `Crop-${uniqueSuffix()}`;
    const farmer = await createTestFarmer({ region });
    const farm = await createFarm({ farmerId: farmer.id, name: 'Low Risk Farm', soilType: 'loamy', areaAcres: 5 });
    const variety = await createApprovedVariety(crop, region);
    await createCropPlanFixture(farmer.id, farm.id, crop, variety.id);

    await request(app)
      .post('/api/v1/production/climate-smart/predictions')
      .set('Authorization', `Bearer ${breederToken}`)
      .send({ region, season: 'Kharif', riskLevel: 'moderate', source: 'x' });

    const alertsRes = await request(app).get(`/api/v1/production/climate-smart/alerts?farmId=${farm.id}`).set('Authorization', `Bearer ${breederToken}`);
    expect(alertsRes.body.data).toHaveLength(0);
  });

  it('enriches the existing crop-planning recommendation engine with a climate resilience score derived from a recorded tolerance trait', async () => {
    const breeder = await createTestUser({ role: 'Breeder' });
    const breederToken = await loginAs(breeder);
    const region = `Region-${uniqueSuffix()}`;
    const crop = `Crop-${uniqueSuffix()}`;

    const farmer = await createTestFarmer({ region });
    const farm = await createFarm({ farmerId: farmer.id, name: 'Reco Farm', soilType: 'loamy', areaAcres: 5 });
    const variety = await createApprovedVariety(crop, region);

    // A seed lot of this variety with a recorded high drought-tolerance measurement.
    const lot = await createTestSeedLot({ crop, variety: variety.variety_name });
    await request(app).post('/api/v1/production/breeding-analytics/traits').set('Authorization', `Bearer ${breederToken}`)
      .send({ seedLotId: lot.id, traitType: 'drought_tolerance', categoryValue: 'high', measuredDate: '2026-01-01' });

    await request(app).post('/api/v1/production/climate-smart/predictions').set('Authorization', `Bearer ${breederToken}`)
      .send({ region, season: 'Kharif', riskLevel: 'high', primaryRiskFactor: 'drought', source: 'x' });

    const recoRes = await request(app)
      .get(`/api/v1/production/climate-smart/recommendations?farmerId=${farmer.id}&farmId=${farm.id}&crop=${crop}`)
      .set('Authorization', `Bearer ${breederToken}`);
    expect(recoRes.status).toBe(200);
    const rec = recoRes.body.data.find((r: { varietyId: string }) => r.varietyId === variety.id);
    expect(rec).toBeTruthy();
    expect(rec.baseScore).toBeGreaterThan(0); // region match from the existing engine
    expect(rec.climateResilienceScore).toBe(100); // high tolerance -> full score
    expect(rec.combinedScore).toBeGreaterThan(rec.baseScore); // climate signal added on top, not replacing
  });

  it('suggests a crop rotation based on the farm\'s most recent crop plan', async () => {
    const breeder = await createTestUser({ role: 'Breeder' });
    const breederToken = await loginAs(breeder);
    const farmer = await createTestFarmer();
    const farm = await createFarm({ farmerId: farmer.id, name: 'Rotation Farm', soilType: 'clay', areaAcres: 5 });
    const variety = await createApprovedVariety('Paddy', 'AnyRegion');
    await createCropPlanFixture(farmer.id, farm.id, 'Paddy', variety.id);

    const res = await request(app)
      .get(`/api/v1/production/climate-smart/farms/${farm.id}/rotation-suggestions`)
      .set('Authorization', `Bearer ${breederToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data[0].crop).toBe('Groundnut');
  });

  it('records an adaptation outcome and blocks a non-Breeder/Admin role', async () => {
    const breeder = await createTestUser({ role: 'Breeder' });
    const breederToken = await loginAs(breeder);
    const producer = await createTestUser({ role: 'Producer' });
    const producerToken = await loginAs(producer);
    const region = `Region-${uniqueSuffix()}`;
    const crop = `Crop-${uniqueSuffix()}`;
    const farmer = await createTestFarmer({ region });
    const farm = await createFarm({ farmerId: farmer.id, name: 'Outcome Farm', soilType: 'loamy', areaAcres: 5 });
    const variety = await createApprovedVariety(crop, region);

    const forbidden = await request(app)
      .post('/api/v1/production/climate-smart/adaptation-outcomes')
      .set('Authorization', `Bearer ${producerToken}`)
      .send({ farmId: farm.id, varietyId: variety.id, crop, season: 'Kharif', outcomeRating: 'good' });
    expect(forbidden.status).toBe(403);

    const res = await request(app)
      .post('/api/v1/production/climate-smart/adaptation-outcomes')
      .set('Authorization', `Bearer ${breederToken}`)
      .send({ farmId: farm.id, varietyId: variety.id, crop, season: 'Kharif', outcomeRating: 'good', actualYieldPerAcre: 420 });
    expect(res.status).toBe(201);
    expect(res.body.data.outcome_rating).toBe('good');

    const listRes = await request(app)
      .get(`/api/v1/production/climate-smart/adaptation-outcomes?farmId=${farm.id}`)
      .set('Authorization', `Bearer ${breederToken}`);
    expect(listRes.body.data).toHaveLength(1);
  });

  it('rejects an unauthenticated request', async () => {
    const res = await request(app).get('/api/v1/production/climate-smart/predictions');
    expect(res.status).toBe(401);
  });
});
