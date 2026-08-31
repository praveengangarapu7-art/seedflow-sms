import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { pool } from '../../src/db/pool';
import { createTestUser } from '../factories';
import { uniqueSuffix } from '../factories/ids';
import { loginAs } from './authHelper';
import { app } from './testApp';

describe('market intelligence API', () => {
  it('records market data across all four categories, lists them back, and blocks a non-Breeder/Admin role', async () => {
    const breeder = await createTestUser({ role: 'Breeder' });
    const breederToken = await loginAs(breeder);
    const crop = `Crop-${uniqueSuffix()}`;

    const priceRes = await request(app)
      .post('/api/v1/production/market-intelligence/prices')
      .set('Authorization', `Bearer ${breederToken}`)
      .send({ crop, pricePerUnit: 42, observedDate: '2026-01-01', source: 'State Mandi Bulletin' });
    expect(priceRes.status).toBe(201);

    const ministryRes = await request(app)
      .post('/api/v1/production/market-intelligence/ministry-forecasts')
      .set('Authorization', `Bearer ${breederToken}`)
      .send({ crop, season: '2026-Kharif', forecastedDemandQuantity: 1000, issuingAuthority: 'Ministry of Agriculture', publishedDate: '2026-01-01' });
    expect(ministryRes.status).toBe(201);

    const weatherRes = await request(app)
      .post('/api/v1/production/market-intelligence/weather-outlooks')
      .set('Authorization', `Bearer ${breederToken}`)
      .send({ region: 'North Valley', crop, season: '2026-Kharif', outlook: 'favorable', issuingAuthority: 'Met Department' });
    expect(weatherRes.status).toBe(201);

    const insuranceRes = await request(app)
      .post('/api/v1/production/market-intelligence/insurance-records')
      .set('Authorization', `Bearer ${breederToken}`)
      .send({ crop, season: '2026-Kharif', claimsCount: 3, totalClaimAmount: 5000 });
    expect(insuranceRes.status).toBe(201);

    const [priceList, ministryList, weatherList, insuranceList] = await Promise.all([
      request(app).get(`/api/v1/production/market-intelligence/prices?crop=${crop}`).set('Authorization', `Bearer ${breederToken}`),
      request(app).get(`/api/v1/production/market-intelligence/ministry-forecasts?crop=${crop}`).set('Authorization', `Bearer ${breederToken}`),
      request(app).get(`/api/v1/production/market-intelligence/weather-outlooks?crop=${crop}`).set('Authorization', `Bearer ${breederToken}`),
      request(app).get(`/api/v1/production/market-intelligence/insurance-records?crop=${crop}`).set('Authorization', `Bearer ${breederToken}`),
    ]);
    expect(priceList.body.data).toHaveLength(1);
    expect(ministryList.body.data).toHaveLength(1);
    expect(weatherList.body.data).toHaveLength(1);
    expect(insuranceList.body.data).toHaveLength(1);

    const producer = await createTestUser({ role: 'Producer' });
    const producerToken = await loginAs(producer);
    const forbidden = await request(app)
      .post('/api/v1/production/market-intelligence/prices')
      .set('Authorization', `Bearer ${producerToken}`)
      .send({ crop, pricePerUnit: 10, observedDate: '2026-01-01', source: 'x' });
    expect(forbidden.status).toBe(403);

    const noAuth = await request(app).get('/api/v1/production/market-intelligence/prices');
    expect(noAuth.status).toBe(401);
  });

  it('generates an explainable demand forecast from a rising price trend, ministry growth, favorable weather, and no insurance claims', async () => {
    const breeder = await createTestUser({ role: 'Breeder' });
    const breederToken = await loginAs(breeder);
    const crop = `Crop-${uniqueSuffix()}`;
    const variety = `Variety-${uniqueSuffix()}`;
    const season = '2026-Kharif';

    // Two price points -> a computable trend (100 -> 120 = +20%).
    await request(app).post('/api/v1/production/market-intelligence/prices').set('Authorization', `Bearer ${breederToken}`)
      .send({ crop, variety, pricePerUnit: 100, observedDate: '2025-01-01', source: 'Bulletin' });
    await request(app).post('/api/v1/production/market-intelligence/prices').set('Authorization', `Bearer ${breederToken}`)
      .send({ crop, variety, pricePerUnit: 120, observedDate: '2026-01-01', source: 'Bulletin' });

    // Two ministry forecasts -> a computable growth rate (1000 -> 1200 = +20%).
    await request(app).post('/api/v1/production/market-intelligence/ministry-forecasts').set('Authorization', `Bearer ${breederToken}`)
      .send({ crop, variety, season, forecastedDemandQuantity: 1000, issuingAuthority: 'Ministry', publishedDate: '2025-01-01' });
    await request(app).post('/api/v1/production/market-intelligence/ministry-forecasts').set('Authorization', `Bearer ${breederToken}`)
      .send({ crop, variety, season, forecastedDemandQuantity: 1200, issuingAuthority: 'Ministry', publishedDate: '2026-01-01' });

    await request(app).post('/api/v1/production/market-intelligence/weather-outlooks').set('Authorization', `Bearer ${breederToken}`)
      .send({ region: 'North Valley', crop, season, outlook: 'favorable', issuingAuthority: 'Met Dept' });

    const forecastRes = await request(app)
      .post('/api/v1/production/market-intelligence/demand-forecasts')
      .set('Authorization', `Bearer ${breederToken}`)
      .send({ crop, variety, season });

    expect(forecastRes.status).toBe(201);
    const forecast = forecastRes.body.data;
    expect(forecast.crop).toBe(crop);
    expect(forecast.variety).toBe(variety);
    // Every recorded signal is positive (rising price, rising ministry demand, favorable
    // weather) and no adoption/insurance history exists for this fresh variety, so the
    // score must land above the neutral midpoint and recommend increasing production.
    expect(forecast.demand_score).toBeGreaterThan(50);
    expect(forecast.recommended_action).toBe('increase_production');
    expect(forecast.suggested_price_per_unit).toBeGreaterThan(120); // premium over the latest recorded base price
    const signalNames = forecast.signals_breakdown.map((s: { signal: string }) => s.signal);
    expect(signalNames).toContain('priceTrend');
    expect(signalNames).toContain('ministryGrowth');
    expect(signalNames).toContain('weatherOutlook');
    expect(signalNames).not.toContain('insuranceRisk'); // none recorded for this variety
    expect(signalNames).not.toContain('adoptionRate'); // no seed-request history for a brand-new variety

    const latestRes = await request(app)
      .get(`/api/v1/production/market-intelligence/demand-forecasts/latest?season=${season}`)
      .set('Authorization', `Bearer ${breederToken}`);
    expect(latestRes.status).toBe(200);
    expect(latestRes.body.data.some((f: { id: string }) => f.id === forecast.id)).toBe(true);
  });

  it('produces a neutral forecast with an empty breakdown when no market signals exist at all for a variety', async () => {
    const admin = await createTestUser({ role: 'Admin' });
    const adminToken = await loginAs(admin);
    const crop = `Crop-${uniqueSuffix()}`;
    const variety = `Variety-${uniqueSuffix()}`;

    const res = await request(app)
      .post('/api/v1/production/market-intelligence/demand-forecasts')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ crop, variety, season: '2026-Kharif' });

    expect(res.status).toBe(201);
    expect(res.body.data.demand_score).toBe(50);
    expect(res.body.data.recommended_action).toBe('maintain');
    expect(res.body.data.signals_breakdown).toEqual([]);
    expect(res.body.data.suggested_price_per_unit).toBeNull();
  });

  it('compares a demand forecast against live crop plans in the breeding priority recommendations', async () => {
    const admin = await createTestUser({ role: 'Admin' });
    const adminToken = await loginAs(admin);
    const crop = `Crop-${uniqueSuffix()}`;
    const variety = `Variety-${uniqueSuffix()}`;
    const season = '2026-Kharif';

    // High demand signal with no crop plans at all -> should surface as a priority gap.
    await request(app).post('/api/v1/production/market-intelligence/ministry-forecasts').set('Authorization', `Bearer ${adminToken}`)
      .send({ crop, variety, season, forecastedDemandQuantity: 500, issuingAuthority: 'Ministry', publishedDate: '2025-01-01' });
    await request(app).post('/api/v1/production/market-intelligence/ministry-forecasts').set('Authorization', `Bearer ${adminToken}`)
      .send({ crop, variety, season, forecastedDemandQuantity: 1000, issuingAuthority: 'Ministry', publishedDate: '2026-01-01' });

    await request(app)
      .post('/api/v1/production/market-intelligence/demand-forecasts')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ crop, variety, season });

    const res = await request(app)
      .get(`/api/v1/production/market-intelligence/breeding-priority?season=${season}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    const entry = res.body.data.find((r: { crop: string; variety: string }) => r.crop === crop && r.variety === variety);
    expect(entry).toBeTruthy();
    expect(entry.activeCropPlanCount).toBe(0);
    expect(entry.priorityNote).toMatch(/priority gap/);
  });

  it('reflects an active crop plan in the breeding priority recommendation for that variety', async () => {
    const admin = await createTestUser({ role: 'Admin' });
    const adminToken = await loginAs(admin);
    const crop = `Crop-${uniqueSuffix()}`;
    const varietyName = `Variety-${uniqueSuffix()}`;
    const season = '2026-Kharif';

    // Fixture rows inserted directly — bypassing the crop-planning wizard's
    // own business rules, purely to get a plan for this variety to exist,
    // mirroring the factories' own "insert directly for fixture flexibility" pattern.
    const varietyResult = await pool.query(
      `INSERT INTO varieties (crop, variety_name, botanical_name, created_by) VALUES ($1, $2, 'Test Botanica', 'test') RETURNING id`,
      [crop, varietyName],
    );
    const varietyId = varietyResult.rows[0].id;
    const farmerResult = await pool.query(`INSERT INTO farmers (name, region) VALUES ('Test Farmer', 'North Valley') RETURNING id`);
    const farmerId = farmerResult.rows[0].id;
    const farmResult = await pool.query(
      `INSERT INTO farms (farmer_id, name, soil_type, area_acres) VALUES ($1, 'Test Farm', 'loamy', 5) RETURNING id`,
      [farmerId],
    );
    const farmId = farmResult.rows[0].id;
    await pool.query(
      `INSERT INTO crop_plans (farmer_id, farm_id, crop, variety_id, target_area_acres, calculated_seed_quantity, created_by)
       VALUES ($1, $2, $3, $4, 5, 50, 'test')`,
      [farmerId, farmId, crop, varietyId],
    );

    await request(app)
      .post('/api/v1/production/market-intelligence/demand-forecasts')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ crop, variety: varietyName, season });

    const res = await request(app)
      .get(`/api/v1/production/market-intelligence/breeding-priority?season=${season}`)
      .set('Authorization', `Bearer ${adminToken}`);

    const entry = res.body.data.find((r: { crop: string; variety: string }) => r.crop === crop && r.variety === varietyName);
    expect(entry.activeCropPlanCount).toBe(1);
  });
});
